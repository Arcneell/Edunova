from rest_framework.permissions import BasePermission

# Noms de rôles normalisés — à aligner avec les données en base.
ROLE_FORMATEUR = 'formateur'
ROLE_ELEVE = 'élève'

# Rôles non assignables librement à l'inscription.
RESTRICTED_ROLES = {ROLE_FORMATEUR}


class IsStaffUser(BasePermission):
    """Accès réservé aux comptes ``is_staff`` (équipe / admin API)."""

    message = 'Accès réservé aux administrateurs.'

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsFormateur(BasePermission):
    """Accès réservé aux comptes dont le rôle est 'formateur'."""

    message = 'Accès réservé aux formateurs.'

    def has_permission(self, request, view) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        try:
            return request.user.role.role_name.strip().lower() == ROLE_FORMATEUR
        except AttributeError:
            return False
