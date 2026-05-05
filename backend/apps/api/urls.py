"""Toutes les routes HTTP REST sous le préfixe ``/api/``."""

from django.urls import include, path

urlpatterns = [
    path('', include('apps.api.users.urls')),
    path('profiles/', include('apps.api.profiles.urls')),
    path('courses/', include('apps.api.course.urls')),
    path('quizzes/', include('apps.api.quiz.urls')),
    path('quizzes/<int:quiz_id>/questions/', include('apps.api.question.urls')),
]
