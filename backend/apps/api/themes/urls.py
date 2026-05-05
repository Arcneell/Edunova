from django.urls import path

from .views import ThemeListView, ThemeMapView

urlpatterns = [
    path('', ThemeListView.as_view(), name='theme-list'),
    path('<int:theme_id>/map/', ThemeMapView.as_view(), name='theme-map'),
]
