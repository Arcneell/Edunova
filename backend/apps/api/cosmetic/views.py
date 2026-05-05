from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.edunova.models import Cosmetic, UserCosmeticPurchase
from .serializers import CosmeticSerializer, UserCosmeticPurchaseSerializer


class CosmeticListView(ListAPIView):
    """GET /api/cosmetics/

    Liste tous les cosmétiques disponibles en boutique.
    """

    queryset = Cosmetic.objects.all()
    serializer_class = CosmeticSerializer
    permission_classes = [IsAuthenticated]


class CosmeticPurchaseView(APIView):
    """POST /api/cosmetics/purchase/

    Corps attendu : { "cosmetic_id": <id> }

    Vérifie le solde, débite wallet_balance, crée UserCosmeticPurchase.
    Idempotence : retourne 409 si le cosmétique est déjà acheté.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        cosmetic_id = request.data.get('cosmetic_id')
        if not cosmetic_id:
            return Response(
                {'detail': 'Le champ cosmetic_id est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cosmetic = get_object_or_404(Cosmetic, pk=cosmetic_id)

        if UserCosmeticPurchase.objects.filter(user=request.user, cosmetic=cosmetic).exists():
            return Response(
                {'detail': 'Vous possédez déjà ce cosmétique.'},
                status=status.HTTP_409_CONFLICT,
            )

        profile = request.user.profile
        if profile.wallet_balance < cosmetic.cosmetic_cost:
            return Response(
                {'detail': 'Solde insuffisant.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        profile.wallet_balance -= cosmetic.cosmetic_cost
        profile.save()

        purchase = UserCosmeticPurchase.objects.create(user=request.user, cosmetic=cosmetic)
        return Response(
            UserCosmeticPurchaseSerializer(purchase).data,
            status=status.HTTP_201_CREATED,
        )


class MyPurchaseListView(ListAPIView):
    """GET /api/me/purchases/

    Historique des cosmétiques achetés par l'utilisateur connecté.
    """

    serializer_class = UserCosmeticPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserCosmeticPurchase.objects.filter(
            user=self.request.user
        ).select_related('cosmetic')
