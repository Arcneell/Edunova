from rest_framework.permissions import BasePermission

# Noms de rôles normalisés — à aligner avec les données en base.
ROLE_FORMATEUR = 'formateur'
ROLE_ELEVE = 'élève'
ROLE_ELEVE_ASCII = 'eleve'
ROLE_UTILISATEUR = 'utilisateur'

# Rôles non assignables librement à l'inscription.
RESTRICTED_ROLES = {ROLE_FORMATEUR}


def normalize_role_name(value: str | None) -> str:
    return (value or '').strip().lower()


def is_formateur_role(value: str | None) -> bool:
    return normalize_role_name(value) == ROLE_FORMATEUR


def is_learner_role(value: str | None) -> bool:
    return normalize_role_name(value) in {ROLE_ELEVE, ROLE_ELEVE_ASCII, ROLE_UTILISATEUR}


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
            return is_formateur_role(request.user.role.role_name)
        except AttributeError:
            return False
