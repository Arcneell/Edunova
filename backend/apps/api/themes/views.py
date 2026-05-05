from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.users.permissions import is_learner_role
from apps.edunova.models import Course, Theme, UserCourseProgress
from .serializers import ThemeSerializer


class ThemeListView(ListAPIView):
    """GET /api/themes/

    Liste tous les thèmes (utile pour filtrer les cours par thème).
    """

    queryset = Theme.objects.all()
    serializer_class = ThemeSerializer
    permission_classes = [IsAuthenticated]


class ThemeMapView(APIView):
    """GET /api/themes/<theme_id>/map/

    Retourne la carte d'une thématique avec ses cours et quiz associés.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, theme_id):
        theme = Theme.objects.filter(theme_id=theme_id).first()
        if theme is None:
            return Response({'detail': 'Thématique introuvable.'}, status=404)

        role_name = getattr(getattr(request.user, 'role', None), 'role_name', '')
        course_queryset = Course.objects.filter(theme=theme)
        if is_learner_role(role_name):
            course_queryset = course_queryset.filter(created_by_id=request.user.formateur_id)

        courses = list(
            course_queryset
            .order_by('map_order', 'course_id')
            .values(
                'course_id',
                'course_title',
                'map_order',
                'validating_quiz_id',
                'validating_quiz__min_score_to_pass',
            )
        )
        if not courses:
            return Response(
                {'theme_id': theme.theme_id, 'theme_title': theme.theme_title, 'checkpoints': []}
            )

        course_ids = [course['course_id'] for course in courses]
        progress_by_course_id = {
            progress.course_id: progress
            for progress in UserCourseProgress.objects.filter(
                user=request.user,
                course_id__in=course_ids,
            )
        }
        for index, course in enumerate(courses):
            if course['course_id'] not in progress_by_course_id:
                progress_by_course_id[course['course_id']] = UserCourseProgress.objects.create(
                    user=request.user,
                    course_id=course['course_id'],
                    is_unlocked=(index == 0),
                )

        checkpoints = []
        for index, course in enumerate(courses):
            progress = progress_by_course_id[course['course_id']]
            if index == 0:
                should_be_unlocked = True
            else:
                prev_course = courses[index - 1]
                prev_prog = progress_by_course_id[prev_course['course_id']]
                should_be_unlocked = bool(prev_prog.is_completed)
            if progress.is_unlocked != should_be_unlocked:
                progress.is_unlocked = should_be_unlocked
                progress.save(update_fields=['is_unlocked', 'updated_at'])

            if progress.is_completed:
                status = 'completed'
            elif progress.is_unlocked:
                status = 'unlocked'
            else:
                status = 'locked'

            quiz_id = course.get('validating_quiz_id')
            checkpoints.append(
                {
                    'course_id': course['course_id'],
                    'title': course['course_title'],
                    'map_order': course['map_order'],
                    'status': status,
                    'best_score': progress.best_score,
                    'quiz': None if quiz_id is None else {
                        'quiz_id': quiz_id,
                        'min_score_to_pass': course.get('validating_quiz__min_score_to_pass') or 0,
                    },
                }
            )

        return Response(
            {
                'theme_id': theme.theme_id,
                'theme_title': theme.theme_title,
                'checkpoints': checkpoints,
            }
        )
