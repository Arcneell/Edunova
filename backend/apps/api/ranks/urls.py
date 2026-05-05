from django.urls import path

from .views import RankListView

urlpatterns = [
    path('', RankListView.as_view(), name='rank-list'),
]
