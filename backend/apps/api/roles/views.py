from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from apps.edunova.models import Role
from .serializers import RoleSerializer


class RoleListView(ListAPIView):
    """GET /api/roles/

    Liste tous les rôles disponibles (utile pour le formulaire d'inscription).
    """

    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
