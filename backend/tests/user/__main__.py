"""
Jeux de données de test : rôles (Admin, utilisateur, formateur) puis comptes associés.

Usage (répertoire backend/) :
    python -m tests.user

Avec Docker (après migrate) :
    docker compose exec backend python -m tests.user

Variables d’environnement (optionnelles) :
    EDUNOVA_SEED_PASSWORD — mot de passe des comptes (défaut : TestUser01!)
    EDUNOVA_FORCE_RESET_PASSWORD — si 1/true, applique le mot de passe même si le compte existe déjà.

Les e-mails utilisés sont des adresses réservées « .test » ou « .local » conformes RFC et non routées.
"""

from __future__ import annotations

import os
import sys


def main() -> int:
    # Racine projet Django = répertoire contenant manage.py
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

    import django

    django.setup()

    from apps.edunova.models import Role, User

    password = os.environ.get('EDUNOVA_SEED_PASSWORD', 'TestUser01!')
    force_pw = os.environ.get('EDUNOVA_FORCE_RESET_PASSWORD', '').lower() in ('1', 'true', 'yes')

    definitions: tuple[tuple[str, dict], tuple[str, dict], tuple[str, dict]] = (
        (
            'Admin',
            {'role_rights': {'level': 'admin', 'capabilities': ['manage_users', 'manage_content']}},
        ),
        (
            'utilisateur',
            {'role_rights': {'level': 'user', 'capabilities': ['learn', 'quiz']}},
        ),
        (
            'formateur',
            {'role_rights': {'level': 'trainer', 'capabilities': ['manage_courses', 'view_learners']}},
        ),
    )

    roles: dict[str, Role] = {}
    for role_name, extra in definitions:
        role, created = Role.objects.get_or_create(
            role_name=role_name,
            defaults={**extra},
        )
        if not created:
            Role.objects.filter(pk=role.pk).update(**extra)
            role.refresh_from_db()
        roles[role_name] = role
        print('[role]', 'créé' if created else 'mis à jour', f'id={role.role_id} nom={role.role_name!r}')

    users_spec: tuple[tuple[str, str, dict], ...] = (
        ('seed-admin@edunova.test', 'Admin', {'is_staff': True}),
        ('seed-user@edunova.test', 'utilisateur', {'is_staff': False}),
        ('seed-formateur@edunova.test', 'formateur', {'is_staff': False}),
    )

    for email, role_name, flags in users_spec:
        role = roles[role_name]
        defaults = {'role': role, **flags}
        user, created = User.objects.get_or_create(email=email.lower(), defaults=defaults)
        if created:
            user.set_password(password)
            user.save()
            print('[user]', 'créé', f'id={user.user_id} email={email!r} rôle={role_name!r}', flags)
        else:
            updated: list[str] = []
            if user.role_id != role.role_id:
                user.role = role
                updated.append('role')
            for k, v in flags.items():
                if getattr(user, k) != v:
                    setattr(user, k, v)
                    updated.append(k)
            if force_pw:
                user.set_password(password)
                updated.append('mot de passe')
            if updated:
                user.save()
                print('[user]', 'mis à jour', f'id={user.user_id} email={email!r}', ', '.join(updated))
            else:
                print('[user]', 'existe déjà (inchangé)', f'id={user.user_id} email={email!r}')

    print('')
    print('Mot de passe (nouveaux comptes ou EDUNOVA_FORCE_RESET_PASSWORD) :', password)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
