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
    is_equipped = serializers.SerializerMethodField()

    class Meta:
        model = UserCosmeticPurchase
        fields = [
            'purchase_id',
            'cosmetic_id',
            'cosmetic_name',
            'cosmetic_category',
            'cosmetic_asset_url',
            'purchased_at',
            'is_equipped',
        ]

    def get_is_equipped(self, obj) -> bool:
        from apps.api.cosmetic.views import CATEGORY_TO_PROFILE_FIELD
        profile_field = CATEGORY_TO_PROFILE_FIELD.get(obj.cosmetic.cosmetic_category)
        if not profile_field:
            return False
        try:
            current = getattr(obj.user.profile, profile_field, '')
            return current == obj.cosmetic.cosmetic_asset_url
        except Exception:
            return False
