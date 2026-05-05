from django.urls import path

from .views import ThemeListView, ThemeMapView

urlpatterns = [
    path('themes/', ThemeListView.as_view(), name='theme-list'),
    path('themes/<int:theme_id>/map/', ThemeMapView.as_view(), name='theme-map'),
]
