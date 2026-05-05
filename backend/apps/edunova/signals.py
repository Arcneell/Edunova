"""Signaux légers — logique évidente, sans couche DI."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.edunova.models import Profile, User


@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance: User, created: bool, **kwargs) -> None:
    """Chaque nouveau compte doit avoir un ``Profile`` (MCD POSSEDER)."""
    if created:
        Profile.objects.get_or_create(user=instance)
