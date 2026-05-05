from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated

from apps.edunova.models import Question, Quiz
from .serializers import QuestionSerializer


class QuestionListView(ListAPIView):
    """GET /api/quizzes/<quiz_id>/questions/

    Liste toutes les questions d'un quiz avec leurs réponses (sans `is_correct`).
    """

    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        quiz = get_object_or_404(Quiz, pk=self.kwargs['quiz_id'])
        return Question.objects.filter(quiz=quiz).prefetch_related('answers')


class QuestionDetailView(RetrieveAPIView):
    """GET /api/quizzes/<quiz_id>/questions/<question_id>/

    Détail d'une question avec ses réponses (sans `is_correct`).
    """

    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'question_id'
    lookup_url_kwarg = 'question_id'

    def get_queryset(self):
        get_object_or_404(Quiz, pk=self.kwargs['quiz_id'])
        return Question.objects.filter(quiz_id=self.kwargs['quiz_id']).prefetch_related('answers')
