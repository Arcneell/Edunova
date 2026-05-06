"""Tests des endpoints IA (génération de cours via Gemini).

L'appel HTTP réel à Gemini est remplacé par un monkey-patch de
``apps.api.ai.views.generate_course`` afin de garder les tests offline et déterministes.

Usage (répertoire backend/) :
    python -m tests.ai

Avec Docker :
    docker compose exec backend python -m tests.ai
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

    from django.conf import settings as django_settings
    from rest_framework.test import APIClient

    from apps.api.ai import views as ai_views
    from apps.edunova.models import (
        ActivityLog, Answer, Course, Question, Quiz, Role, Theme, User,
    )

    failures: list[str] = []
    ts = int(time.time())

    if 'testserver' not in django_settings.ALLOWED_HOSTS:
        django_settings.ALLOWED_HOSTS = list(django_settings.ALLOWED_HOSTS) + ['testserver']

    # ── Données de test ───────────────────────────────────────────────────────
    role_formateur, _ = Role.objects.get_or_create(
        role_name='formateur',
        defaults={'role_rights': {'level': 'staff', 'capabilities': ['teach']}},
    )
    role_user, _ = Role.objects.get_or_create(
        role_name='utilisateur',
        defaults={'role_rights': {'level': 'user', 'capabilities': ['learn']}},
    )

    formateur = User(email=f'test-ai-formateur-{ts}@edunova.test', role=role_formateur)
    formateur.set_password('TestForm01!')
    formateur.save()

    learner = User(email=f'test-ai-learner-{ts}@edunova.test', role=role_user)
    learner.set_password('TestLearn01!')
    learner.save()

    theme, _ = Theme.objects.get_or_create(theme_title=f'AI Theme {ts}')

    # Stub : remplace l'appel Gemini par une réponse synthétique au format attendu.
    def _fake_generate_course(*, topic, level, language, num_questions, model=None):
        return {
            'course_title': f'Cours sur {topic}',
            'body_content': f'## Introduction\nContenu généré pour {topic} (niveau {level}).',
            'questions': [
                {
                    'statement': f'Question {i + 1} sur {topic} ?',
                    'xp_value': 10,
                    'answers': [
                        {'label': f'Bonne réponse {i + 1}', 'is_correct': True},
                        {'label': f'Mauvaise A {i + 1}', 'is_correct': False},
                        {'label': f'Mauvaise B {i + 1}', 'is_correct': False},
                        {'label': f'Mauvaise C {i + 1}', 'is_correct': False},
                    ],
                }
                for i in range(num_questions)
            ],
        }

    original_generate = ai_views.generate_course
    original_is_configured = ai_views.is_configured
    ai_views.generate_course = _fake_generate_course
    ai_views.is_configured = lambda: True

    print('\n=== AI ===')

    client = APIClient()

    try:
        # ── Sans authentification → 403 ───────────────────────────────────────
        anon = APIClient()
        r = anon.post('/api/formateur/ai/courses/', {'topic': 'Test', 'theme': theme.theme_id}, format='json')
        _check('POST /api/formateur/ai/courses/ sans auth → 403', r.status_code == 403, failures, str(r.status_code))

        # ── Apprenant interdit ────────────────────────────────────────────────
        client.force_login(learner)
        r = client.post('/api/formateur/ai/courses/', {'topic': 'Sujet test apprenant', 'theme': theme.theme_id}, format='json')
        _check('POST en tant qu’apprenant → 403', r.status_code == 403, failures, str(r.status_code))
        client.logout()

        # ── Formateur : status route ──────────────────────────────────────────
        client.force_login(formateur)
        r = client.get('/api/formateur/ai/status/')
        _check('GET /api/formateur/ai/status/ → 200', r.status_code == 200, failures, str(r.status_code))
        _check('status.configured = True (stub)', r.data.get('configured') is True, failures, str(r.data))

        # ── Topic trop court → 400 ────────────────────────────────────────────
        r = client.post('/api/formateur/ai/courses/', {'topic': 'abc', 'theme': theme.theme_id}, format='json')
        _check('Topic trop court → 400', r.status_code == 400, failures, str(r.status_code))

        # ── Génération nominale ───────────────────────────────────────────────
        payload = {
            'topic': 'Les bases du HTML',
            'theme': theme.theme_id,
            'level': 'debutant',
            'language': 'fr',
            'num_questions': 4,
            'coins_on_success': 25,
            'min_score_to_pass': 70,
        }
        r = client.post('/api/formateur/ai/courses/', payload, format='json')
        _check('POST nominal → 201', r.status_code == 201, failures, str(r.data))
        if r.status_code == 201:
            body = r.data
            course_id = body.get('course', {}).get('course_id')
            quiz_id = body.get('quiz', {}).get('quiz_id')
            _check('course_id renvoyé', isinstance(course_id, int), failures)
            _check('quiz_id renvoyé', isinstance(quiz_id, int), failures)
            _check('4 questions persistées', Question.objects.filter(quiz_id=quiz_id).count() == 4, failures)
            _check(
                '4×4 = 16 réponses persistées',
                Answer.objects.filter(question__quiz_id=quiz_id).count() == 16,
                failures,
            )
            _check(
                'ActivityLog AI_COURSE_GENERATE écrit',
                ActivityLog.objects.filter(
                    user=formateur,
                    action=ActivityLog.Action.AI_COURSE_GENERATE,
                    metadata__course_id=course_id,
                ).exists(),
                failures,
            )

            # Cleanup ciblé
            Course.objects.filter(course_id=course_id).delete()
            Quiz.objects.filter(quiz_id=quiz_id).delete()

        # ── Service non configuré → 503 ───────────────────────────────────────
        ai_views.is_configured = lambda: False
        r = client.post('/api/formateur/ai/courses/', payload, format='json')
        _check('Sans clef Gemini → 503', r.status_code == 503, failures, str(r.status_code))
        ai_views.is_configured = lambda: True

    finally:
        ai_views.generate_course = original_generate
        ai_views.is_configured = original_is_configured

    # Cleanup global
    ActivityLog.objects.filter(user__in=[formateur, learner]).delete()
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
