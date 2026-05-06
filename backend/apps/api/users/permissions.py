import unicodedata

from rest_framework.permissions import BasePermission

# Noms de rôles normalisés — à aligner avec les données en base.
ROLE_FORMATEUR = 'formateur'
ROLE_ELEVE = 'élève'
ROLE_ELEVE_ASCII = 'eleve'
ROLE_UTILISATEUR = 'utilisateur'

# Noms **sans accents**, minuscules — inscription libre réservée aux profils élève /
# apprenant (aligné sur ``is_learner_role``, + synonyme métier ``etudiant``).
# Pas de formateur ni d'enseignant : créés par admin / équipe uniquement.
REGISTERABLE_SIGNUP_ROLES = frozenset(
    {
        'utilisateur',
        'eleve',  # élève
        'etudiant',
    }
)


def normalize_role_name_ascii(value: str | None) -> str:
    if not value:
        return ''
    s = unicodedata.normalize('NFD', str(value).strip().lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


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


class IsStaffOrFormateur(BasePermission):
    """Équipe Django (is_staff) ou rôle formateur — aligné avec le shell admin front."""

    message = "Accès réservé aux formateurs ou à l'équipe."

    def has_permission(self, request, view) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        if getattr(request.user, 'is_staff', False):
            return True
        try:
            return is_formateur_role(request.user.role.role_name)
        except AttributeError:
            return False
