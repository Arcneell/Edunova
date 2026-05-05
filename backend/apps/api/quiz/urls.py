from django.urls import path

from .views import QuizPlayView, QuizSubmitView

urlpatterns = [
    path('<int:quiz_id>/play/', QuizPlayView.as_view(), name='quiz-play'),
    path('<int:quiz_id>/submit/', QuizSubmitView.as_view(), name='quiz-submit'),
]
