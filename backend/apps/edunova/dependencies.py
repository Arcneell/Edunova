"""
Assemblage des dépendances (principe d’inversion de dépendances).

Les tests peuvent remplacer ``get_profile_provisioning_service`` ou injecter
un faux port dans le constructeur du service applicatif.
"""

from django.conf import settings
from django.utils.module_loading import import_string

from apps.edunova.adapters.django_profile import DjangoProfileProvisioningAdapter
from apps.edunova.services.profile_provisioning import ProfileProvisioningApplicationService


def get_profile_provisioning_service() -> ProfileProvisioningApplicationService:
    """
    Fabrique : construit le service de provisioning avec l’adaptateur configuré.

    Définir ``EDUNOVA_PROFILE_ADAPTER`` dans les settings : chaîne Python
    « chemin.vers.la.Classe » désignant une classe instanciable **sans argument**
    qui implémente ``ProfileProvisioningPort``.
    Sans cette variable : utilisé ``DjangoProfileProvisioningAdapter``.
    """
    path = getattr(settings, 'EDUNOVA_PROFILE_ADAPTER', None)
    if path:
        adapter = import_string(path)()
        return ProfileProvisioningApplicationService(adapter)
    adapter = DjangoProfileProvisioningAdapter()
    return ProfileProvisioningApplicationService(adapter)
