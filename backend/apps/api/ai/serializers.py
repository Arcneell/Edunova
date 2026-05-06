from rest_framework import serializers

from apps.edunova.models import Badge, Course, Theme

# Bornes alignées sur le prompt Gemini : éviter d'envoyer un payload absurde côté IA.
MIN_QUESTIONS = 3
MAX_QUESTIONS = 10
LEVEL_CHOICES = ('debutant', 'intermediaire', 'avance')
LANGUAGE_CHOICES = ('fr', 'en')


class AICourseGenerateRequestSerializer(serializers.Serializer):
    """Validation du payload envoyé par le formateur pour générer un cours via Gemini."""

    topic = serializers.CharField(max_length=4000)
    theme = serializers.PrimaryKeyRelatedField(queryset=Theme.objects.all())
    level = serializers.ChoiceField(choices=LEVEL_CHOICES, default='debutant')
    language = serializers.ChoiceField(choices=LANGUAGE_CHOICES, default='fr')
    num_questions = serializers.IntegerField(
        min_value=MIN_QUESTIONS, max_value=MAX_QUESTIONS, default=5,
    )
    coins_on_success = serializers.IntegerField(min_value=0, max_value=10000, default=20)
    min_score_to_pass = serializers.IntegerField(min_value=0, max_value=100, default=70)
    delivered_badge = serializers.PrimaryKeyRelatedField(
        queryset=Badge.objects.all(), required=False, allow_null=True,
    )
    map_order = serializers.IntegerField(min_value=0, default=0)
    model = serializers.CharField(max_length=64, required=False, allow_blank=True)

    def validate_topic(self, value: str) -> str:
        cleaned = (value or '').strip()
        if len(cleaned) < 5:
            raise serializers.ValidationError('Le sujet doit contenir au moins 5 caractères.')
        return cleaned

    def validate_delivered_badge(self, value):
        # Course.delivered_badge est un OneToOneField : un badge ne peut être lié qu'à un seul cours.
        if value is None:
            return value
        if Course.objects.filter(delivered_badge=value).exists():
            raise serializers.ValidationError(
                'Ce badge est déjà attribué à un autre cours. Choisissez-en un libre ou laissez « Aucun ».'
            )
        return value
