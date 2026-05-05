from rest_framework import serializers

from apps.edunova.models import Answer


class AnswerSerializer(serializers.ModelSerializer):
    """Réponse sans `is_correct` pour éviter la triche."""

    class Meta:
        model = Answer
        fields = ['answer_id', 'label_answer']
