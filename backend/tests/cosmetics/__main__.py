"""Tests des endpoints cosmétiques (liste, achat, équipement).

Usage (répertoire backend/) :
    python -m tests.cosmetics

Avec Docker :
    docker compose exec backend python -m tests.cosmetics

Prérequis : avoir exécuté seed_cosmetics (8 avatars toon-head).
"""

from __future__ import annotations

import os
import sys
import time


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
    from apps.edunova.models import Cosmetic, Role, User, UserCosmeticPurchase

    failures: list[str] = []
    ts = int(time.time())

    from django.conf import settings as django_settings
    if 'testserver' not in django_settings.ALLOWED_HOSTS:
        django_settings.ALLOWED_HOSTS = list(django_settings.ALLOWED_HOSTS) + ['testserver']

    # ── Données de test ───────────────────────────────────────────────────────
    role_user, _ = Role.objects.get_or_create(
        role_name='utilisateur',
        defaults={'role_rights': {'level': 'user', 'capabilities': ['learn']}},
    )
    user = User(email=f'test-cosm-{ts}@edunova.test', role=role_user)
    user.set_password('TestCosm01!')
    user.save()
    # Créditer le wallet pour les achats payants
    profile = user.profile
    profile.wallet_balance = 1000
    profile.save(update_fields=['wallet_balance'])

    # Cosmétique gratuit (avatar_face)
    free_cosm, cosm_created = Cosmetic.objects.get_or_create(
        cosmetic_name=f'TestAvatar{ts}',
        cosmetic_category='avatar_face',
        defaults={
            'cosmetic_cost': 0,
            'cosmetic_asset_url': f'https://api.dicebear.com/9.x/toon-head/svg?seed=Test{ts}',
        },
    )

    # Cosmétique payant (avatar_face)
    paid_cosm, paid_created = Cosmetic.objects.get_or_create(
        cosmetic_name=f'TestAvatarPaid{ts}',
        cosmetic_category='avatar_face',
        defaults={
            'cosmetic_cost': 500,
            'cosmetic_asset_url': f'https://api.dicebear.com/9.x/toon-head/svg?seed=Paid{ts}',
        },
    )

    client = APIClient()
    client.force_login(user)

    print('\n=== COSMETICS ===')

    # ── Liste des cosmétiques ─────────────────────────────────────────────────
    r = client.get('/api/cosmetics/')
    _check('GET /api/cosmetics/ → 200', r.status_code == 200, failures, str(r.status_code))
    items = r.data if isinstance(r.data, list) else r.data.get('results', r.data)
    _check('Liste non vide', len(items) > 0, failures)

    # ── Sans auth → 403 ───────────────────────────────────────────────────────
    anon = APIClient()
    r = anon.get('/api/cosmetics/')
    _check('GET /api/cosmetics/ sans auth → 403', r.status_code == 403, failures)

    # ── Achat d'un cosmétique gratuit ─────────────────────────────────────────
    r = client.post('/api/cosmetics/purchase/', {'cosmetic_id': free_cosm.cosmetic_id}, format='json')
    _check('POST /api/cosmetics/purchase/ (gratuit) → 201', r.status_code == 201, failures, str(r.data))
    _check('Achat enregistré en BDD', UserCosmeticPurchase.objects.filter(
        user=user, cosmetic=free_cosm
    ).exists(), failures)

    # ── Double achat → 409 ──────────────────────────────────────────────────────
    r = client.post('/api/cosmetics/purchase/', {'cosmetic_id': free_cosm.cosmetic_id}, format='json')
    _check('Double achat → 409', r.status_code == 409, failures)

    # ── Achat d'un cosmétique payant ──────────────────────────────────────────
    r = client.post('/api/cosmetics/purchase/', {'cosmetic_id': paid_cosm.cosmetic_id}, format='json')
    _check('POST /api/cosmetics/purchase/ (payant) → 201', r.status_code == 201, failures, str(r.data))
    user.profile.refresh_from_db()
    _check('Wallet débité (500 pièces)', user.profile.wallet_balance == 500, failures,
           f'wallet={user.profile.wallet_balance}')

    # ── Liste des achats ──────────────────────────────────────────────────────
    r = client.get('/api/me/purchases/')
    _check('GET /api/me/purchases/ → 200', r.status_code == 200, failures)
    purchases = r.data if isinstance(r.data, list) else r.data.get('results', r.data)
    owned_ids = [p.get('cosmetic_id') for p in purchases]
    _check('Achats contiennent le cosmétique gratuit', free_cosm.cosmetic_id in owned_ids, failures)
    _check('is_equipped présent dans les achats', 'is_equipped' in (purchases[0] if purchases else {}), failures)

    # ── Équipement d'un cosmétique possédé ───────────────────────────────────
    r = client.post('/api/me/equip/', {'cosmetic_id': free_cosm.cosmetic_id}, format='json')
    _check('POST /api/me/equip/ → 200', r.status_code == 200, failures, str(r.data))
    user.profile.refresh_from_db()
    _check('current_avatar_url mis à jour', user.profile.current_avatar_url == free_cosm.cosmetic_asset_url,
           failures, user.profile.current_avatar_url)

    # ── is_equipped = True sur l'achat équipé ────────────────────────────────
    r = client.get('/api/me/purchases/')
    purchases = r.data if isinstance(r.data, list) else r.data.get('results', r.data)
    equipped_entry = next((p for p in purchases if p.get('cosmetic_id') == free_cosm.cosmetic_id), None)
    _check('is_equipped = True après équipement', equipped_entry is not None and equipped_entry.get('is_equipped') is True,
           failures, str(equipped_entry))

    # ── Équiper un cosmétique non possédé → 403 ───────────────────────────────
    unowned = Cosmetic.objects.create(
        cosmetic_name=f'Unowned{ts}',
        cosmetic_category='avatar_face',
        cosmetic_cost=9999,
        cosmetic_asset_url=f'https://api.dicebear.com/9.x/toon-head/svg?seed=Unowned{ts}',
    )
    r = client.post('/api/me/equip/', {'cosmetic_id': unowned.cosmetic_id}, format='json')
    _check('POST /api/me/equip/ (non possédé) → 403', r.status_code == 403, failures)

    # ── Équiper sans cosmetic_id → 400 ───────────────────────────────────────
    r = client.post('/api/me/equip/', {}, format='json')
    _check('POST /api/me/equip/ sans cosmetic_id → 400', r.status_code == 400, failures)

    # Cleanup
    UserCosmeticPurchase.objects.filter(user=user).delete()
    if cosm_created:
        free_cosm.delete()
    if paid_created:
        paid_cosm.delete()
    unowned.delete()
    user.delete()

    print()
    if failures:
        print(f'RÉSULTAT : {len(failures)} échec(s) — {", ".join(failures)}')
    else:
        print('RÉSULTAT : tous les tests passent.')
    return len(failures)


if __name__ == '__main__':
    raise SystemExit(main())
