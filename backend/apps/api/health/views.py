from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """GET /api/health/

    Retourne ``{"ok": true}`` pour la surveillance de l'instance.
    Accessible sans authentification.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"ok": True})
