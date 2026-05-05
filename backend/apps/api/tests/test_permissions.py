"""Vérifications ciblées : élèves / utilisateurs hors staff ne pas passer IsStaffOrFormateur ni IsStaffUser."""

from types import SimpleNamespace

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.api.users.permissions import IsStaffOrFormateur, IsStaffUser


class _User(SimpleNamespace):
    pass


class FormateurAndStaffPermissionsTest(SimpleTestCase):
    databases = []

    def setUp(self):
        self.factory = APIRequestFactory()

    def _request(self):
        return self.factory.post('/api/formateur/quizzes/')

    def test_eleve_denied_formateur_api(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=False, role=_User(role_name='élève'))
        self.assertFalse(IsStaffOrFormateur().has_permission(request, None))

    def test_eleve_ascii_denied_formateur_api(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=False, role=_User(role_name='eleve'))
        self.assertFalse(IsStaffOrFormateur().has_permission(request, None))

    def test_utilisateur_role_denied_formateur_api(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=False, role=_User(role_name='utilisateur'))
        self.assertFalse(IsStaffOrFormateur().has_permission(request, None))

    def test_anonymous_denied_formateur_api(self):
        request = self._request()
        request.user = _User(is_authenticated=False)
        self.assertFalse(IsStaffOrFormateur().has_permission(request, None))

    def test_formateur_allowed(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=False, role=_User(role_name='formateur'))
        self.assertTrue(IsStaffOrFormateur().has_permission(request, None))

    def test_staff_allowed_even_without_formateur_role(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=True, role=_User(role_name='élève'))
        self.assertTrue(IsStaffOrFormateur().has_permission(request, None))

    def test_eleve_denied_admin_users(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=False, role=_User(role_name='élève'))
        self.assertFalse(IsStaffUser().has_permission(request, None))

    def test_staff_allowed_admin_users(self):
        request = self._request()
        request.user = _User(is_authenticated=True, is_staff=True, role=_User(role_name='élève'))
        self.assertTrue(IsStaffUser().has_permission(request, None))
