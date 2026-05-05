from rest_framework import serializers

from apps.edunova.models import Badge, UserBadge


class BadgeSerializer(serializers.ModelSerializer):
    """Catalogue des badges disponibles."""

    class Meta:
        model = Badge
        fields = ['badge_id', 'badge_name', 'icon_url']


class UserBadgeSerializer(serializers.ModelSerializer):
    """Badge obtenu par l'utilisateur avec la date d'obtention."""

    badge_id = serializers.IntegerField(source='badge.badge_id')
    badge_name = serializers.CharField(source='badge.badge_name')
    icon_url = serializers.URLField(source='badge.icon_url')

    class Meta:
        model = UserBadge
        fields = ['badge_id', 'badge_name', 'icon_url', 'earned_at']
