from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.edunova.models import Rank
from .serializers import RankSerializer


class RankListView(ListAPIView):
    """GET /api/ranks/

    Liste tous les rangs triés par seuil d'XP croissant (carte de progression).
    """

    queryset = Rank.objects.all()
    serializer_class = RankSerializer
    permission_classes = [IsAuthenticated]
