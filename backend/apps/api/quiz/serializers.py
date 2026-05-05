from rest_framework import serializers

from apps.edunova.models import Answer, Question, Quiz


class AnswerPlaySerializer(serializers.ModelSerializer):
    """Réponse sans `is_correct` pour éviter la triche."""

    class Meta:
        model = Answer
        fields = ['answer_id', 'label_answer']


class QuestionPlaySerializer(serializers.ModelSerializer):
    answers = AnswerPlaySerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['question_id', 'question_content', 'xp_value', 'answers']


class QuizPlaySerializer(serializers.ModelSerializer):
    questions = QuestionPlaySerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['quiz_id', 'min_score_to_pass', 'coins_on_success', 'questions']
