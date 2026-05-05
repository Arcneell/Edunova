from rest_framework import serializers

from apps.edunova.models import Theme


class ThemeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ['theme_id', 'theme_title']
