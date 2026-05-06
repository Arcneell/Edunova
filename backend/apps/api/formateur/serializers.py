from rest_framework import serializers

from apps.edunova.models import Answer, Course, Question, Quiz, Theme


class FormateurQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['quiz_id', 'coins_on_success', 'min_score_to_pass']
        read_only_fields = ['quiz_id']


class FormateurQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['question_id', 'quiz', 'question_content', 'xp_value']
        read_only_fields = ['question_id', 'quiz']


class FormateurAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['answer_id', 'question', 'label_answer', 'is_correct']
        read_only_fields = ['answer_id', 'question']


class FormateurCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'course_id', 'course_title', 'body_content', 'map_order',
            'theme', 'validating_quiz', 'delivered_badge',
        ]
        read_only_fields = ['course_id']

    def validate_delivered_badge(self, value):
        # OneToOneField : un badge ne peut être lié qu'à un seul cours. On exclut
        # l'instance courante (cas PATCH où on garde le même badge).
        if value is None:
            return value
        qs = Course.objects.filter(delivered_badge=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'Ce badge est déjà attribué à un autre cours. Choisissez-en un libre ou laissez « Aucun ».'
            )
        return value


class FormateurThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ['theme_id', 'theme_title']
        read_only_fields = ['theme_id']

    def validate_theme_title(self, value: str) -> str:
        cleaned = (value or '').strip()
        if not cleaned:
            raise serializers.ValidationError('Le titre est requis.')
        return cleaned


class LearnerStatSerializer(serializers.Serializer):
    """Statistiques d'un apprenant inscrit à un cours."""

    user_id = serializers.IntegerField(source='user.user_id')
    email = serializers.EmailField(source='user.email')
    enrolled_at = serializers.DateTimeField()
    total_xp = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    badge_earned = serializers.SerializerMethodField()

    def get_total_xp(self, obj):
        try:
            return obj.user.profile.total_xp
        except Exception:
            return 0

    def get_rank(self, obj):
        try:
            rank = obj.user.profile.rank
            return rank.label if rank else None
        except Exception:
            return None

    def get_badge_earned(self, obj):
        return obj.user_id in self.context.get('badge_ids', set())
