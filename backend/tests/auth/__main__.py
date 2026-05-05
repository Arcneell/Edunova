"""Tests des endpoints d'authentification.

Usage (répertoire backend/) :
    python -m tests.auth

Avec Docker :
    docker compose exec backend python -m tests.auth
"""

from __future__ import annotations

import os
import sys
import time

from django.test import override_settings


def _setup_django() -> None:
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    import django
    django.setup()


def _check(label: str, condition: bool, failures: list[str], detail: str = '') -> None:
    marker = '[OK]  ' if condition else '[FAIL]'
    suffix = f' — {detail}' if detail and not condition else ''
    print(f'  {marker} {label}{suffix}')
    if not condition:
        failures.append(label)


def main() -> int:
    _setup_django()

    from rest_framework.test import APIClient
    from apps.edunova.models import Role, User

    failures: list[str] = []
    ts = int(time.time())
    email = f'test-auth-{ts}@edunova.test'

    from django.conf import settings as django_settings
    if 'testserver' not in django_settings.ALLOWED_HOSTS:
        django_settings.ALLOWED_HOSTS = list(django_settings.ALLOWED_HOSTS) + ['testserver']
    password = 'TestAuth01!'

    role, _ = Role.objects.get_or_create(
        role_name='utilisateur',
        defaults={'role_rights': {'level': 'user', 'capabilities': ['learn']}},
    )

    client = APIClient()
    print('\n=== AUTH ===')

    # ── Register ────────────────────────────────────────────────────────────
    r = client.post('/api/auth/register/', {
        'email': email,
        'password': password,
        'role': role.role_id,
    }, format='json')
    _check('POST /api/auth/register/ → 201', r.status_code == 201, failures, str(r.data))
    _check('Réponse contient email', r.data.get('email') == email, failures)

    # ── /me/ session active juste après register ─────────────────────────
    r = client.get('/api/me/')
    _check('GET /api/me/ (session post-register) → 200', r.status_code == 200, failures)

    # ── Logout ───────────────────────────────────────────────────────────────
    r = client.post('/api/auth/logout/')
    _check('POST /api/auth/logout/ → 204', r.status_code == 204, failures)

    # ── /me/ après logout → 403 ──────────────────────────────────────────────
    r = client.get('/api/me/')
    _check('GET /api/me/ après logout → 403', r.status_code == 403, failures)

    # ── Login correct ─────────────────────────────────────────────────────────
    r = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    _check('POST /api/auth/login/ → 200', r.status_code == 200, failures, str(r.data))
    _check('Réponse contient email (login)', r.data.get('email') == email, failures)

    # ── /me/ après login ──────────────────────────────────────────────────────
    r = client.get('/api/me/')
    _check('GET /api/me/ après login → 200', r.status_code == 200, failures)

    # ── Login mauvais mot de passe → 400 ─────────────────────────────────────
    bad = APIClient()
    r = bad.post('/api/auth/login/', {'email': email, 'password': 'WrongPass!'}, format='json')
    _check('POST /api/auth/login/ mauvais mdp → 400', r.status_code == 400, failures)

    # ── Login email inexistant → 400 ──────────────────────────────────────────
    r = bad.post('/api/auth/login/', {'email': 'ghost@edunova.test', 'password': password}, format='json')
    _check("POST /api/auth/login/ email inconnu → 400", r.status_code == 400, failures)

    # Cleanup
    User.objects.filter(email=email).delete()

    print()
    if failures:
        print(f'RÉSULTAT : {len(failures)} échec(s) — {", ".join(failures)}')
    else:
        print('RÉSULTAT : tous les tests passent.')
    return len(failures)


if __name__ == '__main__':
    raise SystemExit(main())
