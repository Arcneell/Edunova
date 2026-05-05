"""Backend d'authentification — charge le rôle en une seule requête."""

from django.contrib.auth.backends import ModelBackend

from apps.edunova.models import User


class RoleAwareBackend(ModelBackend):
    """Même comportement que ModelBackend mais charge ``role`` via
    ``select_related`` pour éviter la requête supplémentaire à chaque
    vérification de permission (IsFormateur, etc.)."""

    def get_user(self, user_id: int):
        try:
            return User.objects.select_related('role').get(pk=user_id)
        except User.DoesNotExist:
            return None
