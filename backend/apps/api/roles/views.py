from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from apps.api.users.permissions import REGISTERABLE_SIGNUP_ROLES, normalize_role_name_ascii
from apps.edunova.models import Role
from .serializers import RoleSerializer


class RoleListView(ListAPIView):
    """GET /api/roles/

    Utilisateurs anonymes : liste restreinte aux rôles sélectionnables à l'inscription.
    Utilisateurs connectés : tous les rôles (écrans admin / staff).
    """

    serializer_class = RoleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Role.objects.all().order_by('role_name')
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            return qs

        allowed_ids = [
            role.role_id
            for role in qs
            if normalize_role_name_ascii(role.role_name) in REGISTERABLE_SIGNUP_ROLES
        ]
        if not allowed_ids:
            return Role.objects.none()
        return Role.objects.filter(role_id__in=allowed_ids).order_by('role_name')
