"""Tests des endpoints quiz (lecture + soumission).

Usage (répertoire backend/) :
    python -m tests.quiz

Avec Docker :
    docker compose exec backend python -m tests.quiz

Note : le joueur de test est de rôle 'Admin' pour désactiver le filtre
formateur et accéder à tous les quiz.
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
    from apps.edunova.models import Answer, Question, Quiz, Role, User

    failures: list[str] = []
    ts = int(time.time())

    from django.conf import settings as django_settings
    if 'testserver' not in django_settings.ALLOWED_HOSTS:
        django_settings.ALLOWED_HOSTS = list(django_settings.ALLOWED_HOSTS) + ['testserver']

    # ── Données de test ───────────────────────────────────────────────────────
    role_admin, _ = Role.objects.get_or_create(
        role_name='Admin',
        defaults={'role_rights': {'level': 'admin', 'capabilities': ['manage_users']}},
    )
    player = User(email=f'test-quiz-{ts}@edunova.test', role=role_admin)
    player.set_password('TestQuiz01!')
    player.save()

    # Quiz : 2 questions, score minimum 50 %
    quiz = Quiz.objects.create(coins_on_success=20, min_score_to_pass=50)

    q1 = Question.objects.create(quiz=quiz, question_content='1 + 1 = ?', xp_value=10)
    a1_correct = Answer.objects.create(question=q1, label_answer='2', is_correct=True)
    Answer.objects.create(question=q1, label_answer='3', is_correct=False)

    q2 = Question.objects.create(quiz=quiz, question_content='2 + 2 = ?', xp_value=10)
    a2_correct = Answer.objects.create(question=q2, label_answer='4', is_correct=True)
    a2_wrong = Answer.objects.create(question=q2, label_answer='5', is_correct=False)

    client = APIClient()
    client.force_login(player)

    print('\n=== QUIZ ===')

    # ── Play : lecture des questions ──────────────────────────────────────────
    r = client.get(f'/api/quizzes/{quiz.quiz_id}/play/')
    _check('GET /api/quizzes/<id>/play/ → 200', r.status_code == 200, failures, str(r.data))

    questions_data = r.data.get('questions', [])
    _check('Play retourne des questions', len(questions_data) == 2, failures,
           f'{len(questions_data)} question(s)')

    # Vérifie qu'is_correct est masqué
    if questions_data:
        answers_data = questions_data[0].get('answers', [])
        has_is_correct = any('is_correct' in a for a in answers_data)
        _check('is_correct absent des réponses (anti-triche)', not has_is_correct, failures)

    # ── Quiz inconnu → 404 ────────────────────────────────────────────────────
    r = client.get('/api/quizzes/999999/play/')
    _check('GET /api/quizzes/999999/play/ → 404', r.status_code == 404, failures)

    # ── Submit : toutes les bonnes réponses (score 100 %, réussite) ───────────
    r = client.post(f'/api/quizzes/{quiz.quiz_id}/submit/', {
        'answers': {
            str(q1.question_id): a1_correct.answer_id,
            str(q2.question_id): a2_correct.answer_id,
        }
    }, format='json')
    _check('POST submit (100 %) → 200', r.status_code == 200, failures, str(r.data))
    _check('Score = 100', r.data.get('score') == 100, failures, str(r.data.get('score')))
    _check('passed = True', r.data.get('passed') is True, failures)
    _check('coins_earned > 0', (r.data.get('coins_earned') or 0) > 0, failures)

    # ── Submit : aucune bonne réponse (score 0 %, échec) ─────────────────────
    r = client.post(f'/api/quizzes/{quiz.quiz_id}/submit/', {
        'answers': {
            str(q1.question_id): a2_wrong.answer_id,  # mauvaise réponse pour q1
            str(q2.question_id): a2_wrong.answer_id,
        }
    }, format='json')
    _check('POST submit (0 %) → 200', r.status_code == 200, failures, str(r.data))
    _check('Score = 0', r.data.get('score') == 0, failures)
    _check('passed = False', r.data.get('passed') is False, failures)

    # ── Submit sans auth → 403 ────────────────────────────────────────────────
    anon = APIClient()
    r = anon.post(f'/api/quizzes/{quiz.quiz_id}/submit/', {'answers': {}}, format='json')
    _check('POST submit sans auth → 403', r.status_code == 403, failures)

    # Cleanup
    quiz.delete()
    player.delete()

    print()
    if failures:
        print(f'RÉSULTAT : {len(failures)} échec(s) — {", ".join(failures)}')
    else:
        print('RÉSULTAT : tous les tests passent.')
    return len(failures)


if __name__ == '__main__':
    raise SystemExit(main())
