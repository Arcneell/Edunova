#!/usr/bin/env python
"""Point d’entrée en ligne de commande Django."""
import os
import sys


def main() -> None:
    """Délègue à ``django-admin`` selon les arguments CLI."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            'Impossible d’importer Django. Vérifier que l’environnement virtuel '
            'ou l’image Docker inclut Django et que PYTHONPATH contient ce projet.'
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
