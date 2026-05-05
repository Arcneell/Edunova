from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.users.permissions import is_learner_role
from apps.edunova.models import Course, Theme
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

        checkpoints = []
        for course in courses:
            quiz_id = course.get('validating_quiz_id')
            checkpoints.append(
                {
                    'course_id': course['course_id'],
                    'title': course['course_title'],
                    'map_order': course['map_order'],
                    'status': 'unlocked',
                    'best_score': 0,
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
