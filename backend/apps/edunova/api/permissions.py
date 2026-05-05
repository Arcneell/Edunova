"""Permissions DRF — garde-fous staff vs compte standard."""

from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Accès réservé aux comptes ``is_staff`` (équipe / admin API)."""

    message = 'Accès réservé aux administrateurs.'

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
