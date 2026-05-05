"""Permissions DRF — routes réservées au staff."""

from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Accès réservé aux comptes ``is_staff`` (équipe / admin API)."""

    message = 'Accès réservé aux administrateurs.'

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsFormateur(BasePermission):
    """Accès réservé aux comptes dont le rôle est 'formateur'."""

    message = 'Accès réservé aux formateurs.'

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'role')
            and request.user.role.role_name.lower() == 'formateur'
        )
