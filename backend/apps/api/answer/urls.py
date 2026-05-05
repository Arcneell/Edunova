from django.urls import path

from .views import AnswerDetailView, AnswerListView

urlpatterns = [
    path('', AnswerListView.as_view(), name='answer-list'),
    path('<int:answer_id>/', AnswerDetailView.as_view(), name='answer-detail'),
]
