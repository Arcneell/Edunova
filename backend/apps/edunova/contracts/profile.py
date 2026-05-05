"""Port : garantir l’invariant « chaque utilisateur a un profil » (MCD POSSEDER)."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class ProfileProvisioningPort(Protocol):
    """Contrat : garantir au plus une ligne ``Profile`` par utilisateur cible."""

    def ensure_profile_exists(self, user_id: int) -> None:
        """
        Effet : ligne ``Profile`` présente après l’appel si elle manquait.
        Sans exception si elle existait déjà (opération idempotente du point de vue métier attendu).
        """
        ...
