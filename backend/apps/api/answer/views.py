from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated

from apps.edunova.models import Answer, Question, Quiz
from .serializers import AnswerSerializer


class AnswerListView(ListAPIView):
    """GET /api/quizzes/<quiz_id>/questions/<question_id>/answers/

    Liste toutes les réponses d'une question (sans `is_correct`).
    """

    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        get_object_or_404(Quiz, pk=self.kwargs['quiz_id'])
        question = get_object_or_404(
            Question, pk=self.kwargs['question_id'], quiz_id=self.kwargs['quiz_id']
        )
        return Answer.objects.filter(question=question)


class AnswerDetailView(RetrieveAPIView):
    """GET /api/quizzes/<quiz_id>/questions/<question_id>/answers/<answer_id>/

    Détail d'une réponse (sans `is_correct`).
    """

    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'answer_id'
    lookup_url_kwarg = 'answer_id'

    def get_queryset(self):
        get_object_or_404(Quiz, pk=self.kwargs['quiz_id'])
        get_object_or_404(
            Question, pk=self.kwargs['question_id'], quiz_id=self.kwargs['quiz_id']
        )
        return Answer.objects.filter(question_id=self.kwargs['question_id'])
