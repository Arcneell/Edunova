from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.edunova.models import Course, Theme, UserCourseProgress
from .serializers import ThemeListSerializer


class ThemeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        themes = Theme.objects.order_by('theme_title')
        serializer = ThemeListSerializer(themes, many=True)
        return Response(serializer.data)


class ThemeMapView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def get(self, request, theme_id):
        theme = Theme.objects.filter(theme_id=theme_id).first()
        if theme is None:
            return Response({'detail': 'Thématique introuvable.'}, status=404)

        courses = list(
            Course.objects
            .filter(theme=theme)
            .select_related('validating_quiz')
            .order_by('map_order', 'course_id')
        )
        if not courses:
            return Response(
                {'theme_id': theme.theme_id, 'theme_title': theme.theme_title, 'checkpoints': []}
            )

        progress_by_course_id = {
            p.course_id: p
            for p in UserCourseProgress.objects.select_for_update().filter(
                user=request.user,
                course__in=courses,
            )
        }
        now = timezone.now()

        for index, course in enumerate(courses):
            progress = progress_by_course_id.get(course.course_id)
            if progress is None:
                progress = UserCourseProgress.objects.create(
                    user=request.user,
                    course=course,
                    is_unlocked=(index == 0),
                    unlocked_at=now if index == 0 else None,
                )
                progress_by_course_id[course.course_id] = progress

        checkpoints = []
        previous_completed = True
        for index, course in enumerate(courses):
            progress = progress_by_course_id[course.course_id]

            should_be_unlocked = index == 0 or previous_completed
            if should_be_unlocked and not progress.is_unlocked:
                progress.is_unlocked = True
                progress.unlocked_at = progress.unlocked_at or now
                progress.save(update_fields=['is_unlocked', 'unlocked_at', 'updated_at'])

            if progress.is_completed:
                status = 'completed'
            elif progress.is_unlocked:
                status = 'unlocked'
            else:
                status = 'locked'

            checkpoints.append(
                {
                    'course_id': course.course_id,
                    'title': course.course_title,
                    'map_order': course.map_order,
                    'status': status,
                    'best_score': progress.best_score,
                    'quiz': {
                        'quiz_id': course.validating_quiz.quiz_id,
                        'min_score_to_pass': course.validating_quiz.min_score_to_pass,
                    },
                }
            )
            previous_completed = progress.is_completed

        return Response(
            {
                'theme_id': theme.theme_id,
                'theme_title': theme.theme_title,
                'checkpoints': checkpoints,
            }
        )
