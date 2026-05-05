from django.urls import path

from .views import ThemeListView

urlpatterns = [
    path('', ThemeListView.as_view(), name='theme-list'),
]
