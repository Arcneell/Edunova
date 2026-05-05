from django.urls import path, include

urlpatterns = [
    path('quizzes/', include('apps.api.quiz.urls')),
]
