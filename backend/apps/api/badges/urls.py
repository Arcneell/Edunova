from django.urls import path

from .views import BadgeListView

urlpatterns = [
    path('', BadgeListView.as_view(), name='badge-list'),
]
