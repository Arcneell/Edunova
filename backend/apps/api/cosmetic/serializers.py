from rest_framework import serializers

from apps.edunova.models import Cosmetic, UserCosmeticPurchase


class CosmeticSerializer(serializers.ModelSerializer):
    """Liste des cosmétiques disponibles en boutique."""

    class Meta:
        model = Cosmetic
        fields = [
            'cosmetic_id',
            'cosmetic_name',
            'cosmetic_category',
            'cosmetic_cost',
            'cosmetic_asset_url',
        ]


class UserCosmeticPurchaseSerializer(serializers.ModelSerializer):
    """Historique d'achat d'un cosmétique."""

    cosmetic_id = serializers.IntegerField(source='cosmetic.cosmetic_id')
    cosmetic_name = serializers.CharField(source='cosmetic.cosmetic_name')
    cosmetic_category = serializers.CharField(source='cosmetic.cosmetic_category')
    cosmetic_asset_url = serializers.URLField(source='cosmetic.cosmetic_asset_url')

    class Meta:
        model = UserCosmeticPurchase
        fields = [
            'purchase_id',
            'cosmetic_id',
            'cosmetic_name',
            'cosmetic_category',
            'cosmetic_asset_url',
            'purchased_at',
        ]
