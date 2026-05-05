"""
Adaptateur : liaison entre les ports métier et l’implémentation Django ORM.

Éviter d’ajouter des règles métier ici ; le service applique les intentions,
cet adaptateur fait persister ou lire des données.
"""

from apps.edunova.models import Profile, User


class DjangoProfileProvisioningAdapter:
    """Implémente le port ``ProfileProvisioningPort`` via les modèles Django."""

    def ensure_profile_exists(self, user_id: int) -> None:
        """Récupère l’utilisateur puis crée le profil s’il est absent."""
        user = User.objects.get(pk=user_id)
        Profile.objects.get_or_create(user=user)
