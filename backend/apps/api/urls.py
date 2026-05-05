from django.urls import path, include

urlpatterns = [
    path('', include('apps.api.course.urls')),
    path('quizzes/', include('apps.api.quiz.urls')),
    path('quizzes/<int:quiz_id>/questions/', include('apps.api.question.urls')),
    path(
        'quizzes/<int:quiz_id>/questions/<int:question_id>/answers/',
        include('apps.api.answer.urls'),
    ),
]
