from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.edunova.models import Theme
from .serializers import ThemeSerializer


class ThemeListView(ListAPIView):
    """GET /api/themes/

    Liste tous les thèmes (utile pour filtrer les cours par thème).
    """

    queryset = Theme.objects.all()
    serializer_class = ThemeSerializer
    permission_classes = [IsAuthenticated]
