"""
Signaux Django : uniquement du câblage vers la couche application.

La logique métier reste dans ``services`` pour respecter le principe
de responsabilité unique (SRP).
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.edunova.dependencies import get_profile_provisioning_service
from apps.edunova.models import User


@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance: User, created: bool, **kwargs) -> None:
    """À la création d’un utilisateur, garantir un ``Profile`` (MCD POSSEDER)."""
    if created:
        get_profile_provisioning_service().on_user_registered(instance.pk)
