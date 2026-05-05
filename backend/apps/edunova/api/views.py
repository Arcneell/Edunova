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

from apps.edunova.api.permissions import IsStaffUser
from apps.edunova.api.serializers import (
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    ProfileReadSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
)
from apps.edunova.models import User


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
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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
