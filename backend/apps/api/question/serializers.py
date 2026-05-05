from rest_framework import serializers

from apps.edunova.models import Answer, Question


class AnswerSerializer(serializers.ModelSerializer):
    """Réponse sans `is_correct` pour éviter la triche."""

    class Meta:
        model = Answer
        fields = ['answer_id', 'label_answer']


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['question_id', 'question_content', 'xp_value', 'answers']
