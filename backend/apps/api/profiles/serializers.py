"""Sérialiseurs pour le profil joueur."""

from rest_framework import serializers

from apps.edunova.models import Profile, Rank


class RankBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rank
        fields = ('rank_id', 'label', 'stars', 'xp_threshold')


class ProfileReadSerializer(serializers.ModelSerializer):
    rank = RankBriefSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = (
            'total_xp',
            'wallet_balance',
            'current_avatar_url',
            'current_banner_url',
            'current_streak',
            'rank',
        )


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('current_avatar_url', 'current_banner_url')
