from rest_framework import serializers

from apps.edunova.models import Rank


class RankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rank
        fields = ['rank_id', 'label', 'xp_threshold']
