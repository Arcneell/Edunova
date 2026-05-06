"""Endpoints d'aide IA pour les formateurs.

Le client (frontend formateur) appelle ces routes pour générer en une opération un cours
complet : titre + contenu Markdown + quiz de validation (questions et réponses).

Sécurité : protégés par ``IsStaffOrFormateur`` + throttle ``ai_generate``. La clef
Gemini ne quitte jamais le backend.
"""

from __future__ import annotations

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.api.users.permissions import IsStaffOrFormateur
from apps.edunova.models import (
    ActivityLog,
    Answer,
    Course,
    Question,
    Quiz,
)

from .gemini_client import GeminiError, generate_course, is_configured
from .serializers import AICourseGenerateRequestSerializer

AI_PERMISSIONS = [IsAuthenticated, IsStaffOrFormateur]


class AIGenerateThrottle(UserRateThrottle):
    """Throttle dédié — coût IA externe non nul."""

    scope = 'ai_generate'


def _persist_course_with_quiz(*, request, generated: dict, params: dict) -> dict:
    """Crée Quiz → Question → Answer → Course en transaction. Retourne un payload sérialisable."""
    questions_payload = generated.get('questions') or []

    with transaction.atomic():
        quiz = Quiz.objects.create(
            coins_on_success=params['coins_on_success'],
            min_score_to_pass=params['min_score_to_pass'],
            created_by=request.user,
        )
        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.QUIZ_CREATE,
            metadata={
                'quiz_id': quiz.quiz_id,
                'origin': 'ai_course_generate',
            },
        )

        questions_meta: list[dict] = []
        for raw_q in questions_payload:
            statement = (raw_q.get('statement') or '').strip()
            if not statement:
                continue
            xp_value = raw_q.get('xp_value')
            try:
                xp_value = max(0, int(xp_value)) if xp_value is not None else 10
            except (TypeError, ValueError):
                xp_value = 10

            question = Question.objects.create(
                quiz=quiz,
                question_content=statement,
                xp_value=xp_value,
            )

            answers_payload = raw_q.get('answers') or []
            created_answer_ids: list[int] = []
            for raw_a in answers_payload:
                label = (raw_a.get('label') or '').strip()
                if not label:
                    continue
                answer = Answer.objects.create(
                    question=question,
                    label_answer=label,
                    is_correct=bool(raw_a.get('is_correct')),
                )
                created_answer_ids.append(answer.answer_id)

            questions_meta.append({
                'question_id': question.question_id,
                'answer_count': len(created_answer_ids),
            })

        course = Course.objects.create(
            theme=params['theme'],
            validating_quiz=quiz,
            delivered_badge=params.get('delivered_badge'),
            course_title=(generated.get('course_title') or '').strip()[:255] or 'Cours sans titre',
            body_content=generated.get('body_content') or '',
            map_order=params['map_order'],
            created_by=request.user,
        )

        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.COURSE_CREATE,
            metadata={
                'course_id': course.course_id,
                'title': course.course_title,
                'origin': 'ai_course_generate',
            },
        )
        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.AI_COURSE_GENERATE,
            metadata={
                'course_id': course.course_id,
                'quiz_id': quiz.quiz_id,
                'topic': params['topic'][:200],
                'level': params['level'],
                'language': params['language'],
                'questions_created': len(questions_meta),
                'model': params['model'],
            },
        )

    return {
        'course': {
            'course_id': course.course_id,
            'course_title': course.course_title,
            'body_content': course.body_content,
            'map_order': course.map_order,
            'theme': course.theme_id,
            'validating_quiz': course.validating_quiz_id,
            'delivered_badge': course.delivered_badge_id,
        },
        'quiz': {
            'quiz_id': quiz.quiz_id,
            'coins_on_success': quiz.coins_on_success,
            'min_score_to_pass': quiz.min_score_to_pass,
        },
        'questions': questions_meta,
    }


class AICourseGenerateView(APIView):
    """POST /api/formateur/ai/courses/

    Génère un cours complet via Gemini puis le persiste (Cours + Quiz + Questions + Réponses)
    en une seule transaction. Renvoie les identifiants créés pour rebondir côté front.
    """

    permission_classes = AI_PERMISSIONS
    throttle_classes = [AIGenerateThrottle]

    def post(self, request):
        if not is_configured():
            return Response(
                {'detail': 'Service IA non configuré (GEMINI_API_KEY manquante côté serveur).'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = AICourseGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        params['model'] = (params.get('model') or '').strip() or None

        try:
            generated = generate_course(
                topic=params['topic'],
                level=params['level'],
                language=params['language'],
                num_questions=params['num_questions'],
                model=params['model'],
            )
        except GeminiError as exc:
            return Response(
                {'detail': str(exc)},
                status=exc.status or status.HTTP_502_BAD_GATEWAY,
            )

        if not isinstance(generated, dict):
            return Response(
                {'detail': 'Réponse IA invalide.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        result = _persist_course_with_quiz(
            request=request,
            generated=generated,
            params={**params, 'model': params.get('model') or 'default'},
        )
        return Response(result, status=status.HTTP_201_CREATED)


class AIStatusView(APIView):
    """GET /api/formateur/ai/status/

    Permet au front de griser le bouton « Générer avec l'IA » lorsque le serveur n'a pas
    de clef configurée, plutôt qu'attendre une 503 au moment de la requête.
    """

    permission_classes = AI_PERMISSIONS

    def get(self, request):
        from django.conf import settings  # import local : éviter d'exposer settings au top

        return Response({
            'configured': is_configured(),
            'model': getattr(settings, 'GEMINI_MODEL', None) if is_configured() else None,
        })
