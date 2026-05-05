"""
Services applicatifs (cas d’usage).

Une classe par scénario cohérent ; dépend uniquement des **ports**, pas du ORM.
"""

from apps.edunova.contracts.profile import ProfileProvisioningPort


class ProfileProvisioningApplicationService:
    """
    Cas d’usage : inscription d’un utilisateur → profil existant garanti.

    - Responsabilité unique : orchestrer cet enchaînement.
    - Ouvert aux extensions : autre comportement = autre classe derrière le port.
    """

    def __init__(self, profiles: ProfileProvisioningPort) -> None:
        self._profiles = profiles

    def on_user_registered(self, user_id: int) -> None:
        """Appelé une fois que l’utilisateur est créé et possède déjà une clé primaire."""
        self._profiles.ensure_profile_exists(user_id)
