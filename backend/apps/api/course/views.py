from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.users.permissions import is_learner_role
from apps.edunova.models import ActivityLog, Course, CourseEnrollment
from .serializers import CourseDetailSerializer, CourseListSerializer


class CourseListView(ListAPIView):
    """GET /api/courses/?theme=<id>

    Liste tous les cours. Filtre optionnel par thème via `?theme=<id>`.
    """

    serializer_class = CourseListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Course.objects.select_related('theme', 'validating_quiz', 'delivered_badge')
        role_name = getattr(getattr(self.request.user, 'role', None), 'role_name', '')
        if is_learner_role(role_name):
            queryset = queryset.filter(created_by_id=self.request.user.formateur_id)
        theme_id = self.request.query_params.get('theme')
        if theme_id is not None:
            queryset = queryset.filter(theme_id=theme_id)
        return queryset


class CourseDetailView(RetrieveAPIView):
    """GET /api/courses/<course_id>/

    Détail complet d'un cours (contenu + ids quiz / badge / thème).
    """

    serializer_class = CourseDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'course_id'
    lookup_url_kwarg = 'course_id'

    def get_queryset(self):
        queryset = Course.objects.select_related('theme', 'validating_quiz', 'delivered_badge')
        role_name = getattr(getattr(self.request.user, 'role', None), 'role_name', '')
        if is_learner_role(role_name):
            queryset = queryset.filter(created_by_id=self.request.user.formateur_id)
        return queryset


class MyCourseListView(ListAPIView):
    """GET /api/me/courses/

    Liste les cours auxquels l'utilisateur connecté est inscrit.
    """

    serializer_class = CourseListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        enrolled_ids = CourseEnrollment.objects.filter(
            user=self.request.user
        ).values_list('course_id', flat=True)
        return Course.objects.filter(course_id__in=enrolled_ids).select_related(
            'theme', 'validating_quiz', 'delivered_badge'
        )


class CourseEnrollView(APIView):
    """POST   /api/courses/<course_id>/enroll/  → inscription
    DELETE  /api/courses/<course_id>/enroll/  → désinscription
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        queryset = Course.objects.all()
        role_name = getattr(getattr(request.user, 'role', None), 'role_name', '')
        if is_learner_role(role_name):
            queryset = queryset.filter(created_by_id=request.user.formateur_id)
        course = get_object_or_404(queryset, pk=course_id)
        _, created = CourseEnrollment.objects.get_or_create(
            user=request.user, course=course
        )
        if not created:
            return Response(
                {'detail': 'Vous êtes déjà inscrit à ce cours.'},
                status=status.HTTP_409_CONFLICT,
            )
        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.COURSE_ENROLL,
            metadata={'course_id': course_id},
        )
        return Response(
            {'detail': 'Inscription confirmée.'},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, course_id):
        queryset = Course.objects.all()
        role_name = getattr(getattr(request.user, 'role', None), 'role_name', '')
        if is_learner_role(role_name):
            queryset = queryset.filter(created_by_id=request.user.formateur_id)
        get_object_or_404(queryset, pk=course_id)
        deleted, _ = CourseEnrollment.objects.filter(
            user=request.user, course_id=course_id
        ).delete()
        if not deleted:
            return Response(
                {'detail': "Vous n'êtes pas inscrit à ce cours."},
                status=status.HTTP_404_NOT_FOUND,
            )
        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.COURSE_UNENROLL,
            metadata={'course_id': course_id},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
