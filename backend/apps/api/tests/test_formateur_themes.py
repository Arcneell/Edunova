from rest_framework import status
from rest_framework.test import APITestCase

from apps.edunova.models import Course, Quiz, Role, Theme, User


class FormateurThemeApiTests(APITestCase):
    def setUp(self):
        self.role_fm = Role.objects.create(role_name='formateur', role_rights={})
        self.role_el = Role.objects.create(role_name='élève', role_rights={})
        # ``User`` a USERNAME_FIELD='email' mais hérite du UserManager Django
        # standard qui exige un ``username`` positionnel : on instancie donc
        # directement le modèle (ce que fait aussi le seed et le RegisterSerializer).
        self.fm = User(
            email='formateur-theme-api@test.invalid',
            role=self.role_fm,
        )
        self.fm.set_password('test-password')
        self.fm.save()
        self.el = User(
            email='eleve-theme-api@test.invalid',
            role=self.role_el,
            formateur=self.fm,
        )
        self.el.set_password('test-password')
        self.el.save()

    def test_eleve_ne_peut_pas_creer_de_theme(self):
        self.client.force_authenticate(user=self.el)
        r = self.client.post(
            '/api/formateur/themes/',
            {'theme_title': 'Hacking'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_formateur_cree_et_supprime_theme_vide(self):
        self.client.force_authenticate(user=self.fm)
        r = self.client.post(
            '/api/formateur/themes/',
            {'theme_title': ' Maths avancées '},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['theme_title'], 'Maths avancées')
        theme_id = r.data['theme_id']

        r2 = self.client.delete(f'/api/formateur/themes/{theme_id}/')
        self.assertEqual(r2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Theme.objects.filter(pk=theme_id).exists())

    def test_suppression_theme_avec_cours_refusee(self):
        theme = Theme.objects.create(theme_title='Bloqué')
        quiz = Quiz.objects.create(coins_on_success=0, min_score_to_pass=50, created_by=self.fm)
        Course.objects.create(
            theme=theme,
            validating_quiz=quiz,
            course_title='Cours lie',
            body_content='x',
            map_order=0,
            created_by=self.fm,
        )
        self.client.force_authenticate(user=self.fm)
        r = self.client.delete(f'/api/formateur/themes/{theme.theme_id}/')
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('detail', r.data)
