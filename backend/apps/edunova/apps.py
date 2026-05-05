from django.apps import AppConfig


class EdunovaConfig(AppConfig):
    """Configuration de l’application Django ``edunova``."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.edunova'
    label = 'edunova'
    verbose_name = 'Domaine métier Edunova'

    def ready(self) -> None:
        # Enregistre les receivers de signaux (effet import side-effect intentionnel).
        import apps.edunova.signals  # noqa: F401
