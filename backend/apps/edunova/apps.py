from django.apps import AppConfig


class EdunovaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.edunova'
    label = 'edunova'

    def ready(self) -> None:
        import apps.edunova.signals  # noqa: F401
