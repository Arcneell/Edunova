"""Vues API compte (session Django) et gestion utilisateur staff."""

from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.api.users.permissions import IsStaffUser
from apps.api.users.serializers import (
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    RegisterSerializer,
    RoleBriefSerializer,
)
from apps.edunova.models import ActivityLog, Role, User


ACTION_LABELS = {choice[0]: choice[1] for choice in ActivityLog.Action.choices}


class RegisterThrottle(ScopedRateThrottle):
    scope = 'register'


class LoginThrottle(ScopedRateThrottle):
    scope = 'login'


@method_decorator(ensure_csrf_cookie, name='dispatch')
class AuthCsrfView(APIView):
    """Prépare le cookie CSRF pour les clients SPA (avant login POST)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'detail': 'ok'})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        ActivityLog.objects.create(
            user=user,
            action=ActivityLog.Action.REGISTER,
            metadata={'email': user.email},
        )
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        ActivityLog.objects.create(
            user=user,
            action=ActivityLog.Action.LOGIN,
            metadata={},
        )
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.LOGOUT,
            metadata={},
        )
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class MeProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        return Response(ProfileReadSerializer(profile).data)

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileReadSerializer(profile).data)


class RolesListView(generics.ListAPIView):
    """Liste des rôles (inscription, scripts de test)."""

    permission_classes = [AllowAny]
    queryset = Role.objects.all().order_by('role_name')
    serializer_class = RoleBriefSerializer


class AdminUserPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminUserListView(generics.ListAPIView):
    """Liste paginée des comptes (staff)."""

    permission_classes = [IsAuthenticated, IsStaffUser]
    serializer_class = AdminUserListSerializer
    pagination_class = AdminUserPagination
    queryset = User.objects.select_related('role').order_by('-date_joined')


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Détail ou mise à jour partielle d’un compte (staff)."""

    permission_classes = [IsAuthenticated, IsStaffUser]
    serializer_class = AdminUserDetailSerializer
    lookup_field = 'user_id'
    queryset = User.objects.select_related('role', 'profile', 'profile__rank')

class AdminLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminActivityLogListView(generics.ListAPIView):
    """GET /api/admin/logs/

    Liste paginée des logs d'activité, du plus récent au plus ancien.
    Paramètres optionnels :
      - action  : filtrer par type d'action (ex. ?action=login)
      - user_id : filtrer par utilisateur
      - since   : ISO 8601, logs postérieurs à cette date (ex. ?since=2026-05-05T10:00:00Z)
    """

    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = AdminLogPagination

    def get_queryset(self):
        qs = ActivityLog.objects.select_related('user').order_by('-created_at')
        action = self.request.query_params.get('action')
        user_id = self.request.query_params.get('user_id')
        since = self.request.query_params.get('since')
        if action:
            qs = qs.filter(action=action)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if since:
            qs = qs.filter(created_at__gt=since)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        items = page if page is not None else queryset

        results = [
            {
                'log_id': log.log_id,
                'user_id': log.user_id,
                'user_email': log.user.email if log.user else None,
                'action': log.action,
                'action_label': ACTION_LABELS.get(log.action, log.action),
                'metadata': log.metadata,
                'ip_address': str(log.ip_address) if log.ip_address else None,
                'created_at': log.created_at.isoformat(),
            }
            for log in items
        ]

        if page is not None:
            return self.get_paginated_response(results)
        return Response(results)