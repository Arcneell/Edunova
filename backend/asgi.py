"""
Point d’entrée ASGI (async), utilisé par Daphne, Uvicorn, Hypercorn avec Django Channels…
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

application = get_asgi_application()
