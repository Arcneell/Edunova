from django.urls import path, include

urlpatterns = [
    path('quizzes/', include('apps.api.quiz.urls')),
    path('quizzes/<int:quiz_id>/questions/', include('apps.api.question.urls')),
]
