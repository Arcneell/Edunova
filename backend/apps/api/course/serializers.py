from rest_framework import serializers

from apps.edunova.models import Course


class CourseListSerializer(serializers.ModelSerializer):
    """Représentation légère pour la liste des cours."""

    class Meta:
        model = Course
        fields = [
            'course_id',
            'course_title',
            'map_order',
            'theme',
            'validating_quiz',
            'delivered_badge',
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    """Représentation complète pour le détail d'un cours."""

    class Meta:
        model = Course
        fields = [
            'course_id',
            'course_title',
            'body_content',
            'map_order',
            'theme',
            'validating_quiz',
            'delivered_badge',
        ]
