from django.urls import path

from .views import (
    FormateurAnswerDetailView,
    FormateurAnswerListCreateView,
    FormateurCourseDetailView,
    FormateurCourseListCreateView,
    FormateurCourseStatsView,
    FormateurQuestionDetailView,
    FormateurQuestionListCreateView,
    FormateurQuizDetailView,
    FormateurQuizListCreateView,
    FormateurThemeDetailView,
    FormateurThemeListCreateView,
)

urlpatterns = [
    path('themes/', FormateurThemeListCreateView.as_view(), name='formateur-theme-list'),
    path('themes/<int:theme_id>/', FormateurThemeDetailView.as_view(), name='formateur-theme-detail'),
    # Cours
    path('courses/', FormateurCourseListCreateView.as_view(), name='formateur-course-list'),
    path('courses/<int:course_id>/', FormateurCourseDetailView.as_view(), name='formateur-course-detail'),
    path('courses/<int:course_id>/stats/', FormateurCourseStatsView.as_view(), name='formateur-course-stats'),
    # Quiz
    path('quizzes/', FormateurQuizListCreateView.as_view(), name='formateur-quiz-list'),
    path('quizzes/<int:quiz_id>/', FormateurQuizDetailView.as_view(), name='formateur-quiz-detail'),
    path('quizzes/<int:quiz_id>/questions/', FormateurQuestionListCreateView.as_view(), name='formateur-question-list'),
    # Questions
    path('questions/<int:question_id>/', FormateurQuestionDetailView.as_view(), name='formateur-question-detail'),
    path('questions/<int:question_id>/answers/', FormateurAnswerListCreateView.as_view(), name='formateur-answer-list'),
    # Réponses
    path('answers/<int:answer_id>/', FormateurAnswerDetailView.as_view(), name='formateur-answer-detail'),
]
