from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.edunova.models import Cosmetic

AVATAR_FACE = [
    {'cosmetic_name': 'Wyatt',     'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Wyatt'},
    {'cosmetic_name': 'Mackenzie', 'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Mackenzie'},
    {'cosmetic_name': 'Eden',      'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Eden'},
    {'cosmetic_name': 'Chase',     'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Chase'},
    {'cosmetic_name': 'George',    'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=George'},
    {'cosmetic_name': 'Kimberly',  'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Kimberly'},
    {'cosmetic_name': 'Alexander', 'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Alexander'},
    {'cosmetic_name': 'Jameson',   'cosmetic_asset_url': 'https://api.dicebear.com/9.x/toon-head/svg?seed=Jameson'},
]


class Command(BaseCommand):
    help = 'Seed cosmétiques (avatars DiceBear toon-head)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Supprime tous les cosmétiques avant de les recréer',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset']:
            deleted, _ = Cosmetic.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'{deleted} cosmétique(s) supprimé(s).'))

        created = updated = 0
        for data in AVATAR_FACE:
            _, is_new = Cosmetic.objects.update_or_create(
                cosmetic_name=data['cosmetic_name'],
                cosmetic_category='avatar_face',
                defaults={
                    'cosmetic_cost': 0,
                    'cosmetic_asset_url': data['cosmetic_asset_url'],
                },
            )
            if is_new:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Avatars : {created} créé(s), {updated} mis à jour.'
        ))
