"""Profil de l’utilisateur connecté."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.profiles.serializers import ProfileReadSerializer, ProfileUpdateSerializer


class CurrentUserProfileView(APIView):
    """GET/PATCH le profil du joueur connecté (avatar / bannière affichés)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        return Response(ProfileReadSerializer(profile).data)

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileReadSerializer(profile).data)
