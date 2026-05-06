"""Routes sous ``/api/profiles/``."""

from django.urls import path

from apps.api.profiles import views

urlpatterns = [
    path('me/', views.CurrentUserProfileView.as_view(), name='api_profiles_me'),
]
