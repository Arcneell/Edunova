"""Déclaration des routes HTTP Django (URLs racine du projet)."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.edunova.api.urls')),
]
