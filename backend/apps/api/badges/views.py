from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.edunova.models import Badge, UserBadge
from .serializers import BadgeSerializer, UserBadgeSerializer


class BadgeListView(ListAPIView):
    """GET /api/badges/

    Catalogue complet des badges disponibles.
    """

    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [IsAuthenticated]


class MyBadgeListView(ListAPIView):
    """GET /api/me/badges/

    Liste des badges obtenus par l'utilisateur connecté avec la date d'obtention.
    """

    serializer_class = UserBadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user).select_related('badge')
