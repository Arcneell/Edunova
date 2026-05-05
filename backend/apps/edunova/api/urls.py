"""Point d’entrée ``/api/`` — délègue aux routes utilisateurs."""

from django.urls import include, path

urlpatterns = [
    path('', include('apps.api.users.urls')),
    path('', include('apps.api.urls')),
]
