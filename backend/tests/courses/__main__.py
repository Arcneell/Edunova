"""Tests des endpoints cours (liste, détail, inscription).

Usage (répertoire backend/) :
    python -m tests.courses

Avec Docker :
    docker compose exec backend python -m tests.courses
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
    from apps.edunova.models import (
        Answer, Badge, Course, CourseEnrollment,
        Question, Quiz, Role, Theme, User,
    )

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
    role_admin, _ = Role.objects.get_or_create(
        role_name='Admin',
        defaults={'role_rights': {'level': 'admin', 'capabilities': ['manage_users']}},
    )

    # Formateur (créateur du cours)
    formateur = User(email=f'test-formateur-{ts}@edunova.test', role=role_admin)
    formateur.set_password('TestForm01!')
    formateur.save()

    # Apprenant
    learner = User(email=f'test-learner-{ts}@edunova.test', role=role_user)
    learner.set_password('TestLearn01!')
    learner.save()
    # Assigner le formateur pour que le filtre learner fonctionne
    learner.formateur = formateur
    learner.save(update_fields=['formateur'])

    theme, _ = Theme.objects.get_or_create(theme_title=f'Test Theme {ts}')
    quiz = Quiz.objects.create(coins_on_success=10, min_score_to_pass=50, created_by=formateur)
    q = Question.objects.create(quiz=quiz, question_content='Test question?', xp_value=10)
    Answer.objects.create(question=q, label_answer='Bonne réponse', is_correct=True)
    Answer.objects.create(question=q, label_answer='Mauvaise réponse', is_correct=False)

    course = Course.objects.create(
        theme=theme,
        validating_quiz=quiz,
        course_title=f'Cours de test {ts}',
        body_content='Contenu de test.',
        created_by=formateur,
    )

    client = APIClient()
    client.force_login(learner)

    print('\n=== COURSES ===')

    # ── Liste des cours ───────────────────────────────────────────────────────
    r = client.get('/api/courses/')
    _check('GET /api/courses/ → 200', r.status_code == 200, failures, str(r.status_code))
    _check('La liste contient des cours', isinstance(r.data, (list, dict)), failures)

    # ── Détail d'un cours ─────────────────────────────────────────────────────
    r = client.get(f'/api/courses/{course.course_id}/')
    _check('GET /api/courses/<id>/ → 200', r.status_code == 200, failures, str(r.data))
    _check('course_title correct', r.data.get('course_title') == course.course_title, failures)

    # ── Cours inconnu → 404 ───────────────────────────────────────────────────
    r = client.get('/api/courses/999999/')
    _check('GET /api/courses/999999/ → 404', r.status_code == 404, failures)

    # ── Inscription ───────────────────────────────────────────────────────────
    r = client.post(f'/api/courses/{course.course_id}/enroll/')
    _check('POST /api/courses/<id>/enroll/ → 201', r.status_code == 201, failures, str(r.data))
    _check('Inscription créée en BDD', CourseEnrollment.objects.filter(
        user=learner, course=course
    ).exists(), failures)

    # ── Double inscription → 409 ───────────────────────────────────────────────────
    r = client.post(f'/api/courses/{course.course_id}/enroll/')
    _check('Double inscription → 409', r.status_code == 409, failures)

    # ── Désinscription ────────────────────────────────────────────────────────
    r = client.delete(f'/api/courses/{course.course_id}/enroll/')
    _check('DELETE /api/courses/<id>/enroll/ → 204', r.status_code == 204, failures, str(r.data))
    _check('Inscription supprimée de la BDD', not CourseEnrollment.objects.filter(
        user=learner, course=course
    ).exists(), failures)

    # ── Sans authentification → 403 ───────────────────────────────────────────
    anon = APIClient()
    r = anon.get('/api/courses/')
    _check('GET /api/courses/ sans auth → 403', r.status_code == 403, failures)

    # Cleanup
    course.delete()
    quiz.delete()
    theme.delete()
    formateur.delete()
    learner.delete()

    print()
    if failures:
        print(f'RÉSULTAT : {len(failures)} échec(s) — {", ".join(failures)}')
    else:
        print('RÉSULTAT : tous les tests passent.')
    return len(failures)


if __name__ == '__main__':
    raise SystemExit(main())
