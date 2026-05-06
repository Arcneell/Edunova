"""Client minimaliste pour l'API Gemini (Google AI Studio).

La clef API est lue uniquement depuis ``settings.GEMINI_API_KEY`` (jamais journalisée).
Toute la conversion JSON ↔ Python est faite ici pour isoler les vues du transport HTTP.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'


class GeminiError(RuntimeError):
    """Erreur métier Gemini : couvre erreurs réseau, statuts non-200, payload mal formé."""

    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


def is_configured() -> bool:
    """Indique si la clef Gemini est présente (sans la dévoiler)."""
    return bool(getattr(settings, 'GEMINI_API_KEY', '').strip())


def _course_response_schema(num_questions: int) -> dict[str, Any]:
    """Schéma JSON imposé à Gemini pour fiabiliser le parsing côté serveur."""
    return {
        'type': 'object',
        'properties': {
            'course_title': {'type': 'string'},
            'body_content': {
                'type': 'string',
                'description': 'Contenu pédagogique du cours en Markdown (titres, listes, exemples).',
            },
            'questions': {
                'type': 'array',
                'minItems': num_questions,
                'maxItems': num_questions,
                'items': {
                    'type': 'object',
                    'properties': {
                        'statement': {'type': 'string'},
                        'xp_value': {'type': 'integer'},
                        'answers': {
                            'type': 'array',
                            'minItems': 2,
                            'maxItems': 5,
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'label': {'type': 'string'},
                                    'is_correct': {'type': 'boolean'},
                                },
                                'required': ['label', 'is_correct'],
                            },
                        },
                    },
                    'required': ['statement', 'answers'],
                },
            },
        },
        'required': ['course_title', 'body_content', 'questions'],
    }


def _build_prompt(*, topic: str, level: str, language: str, num_questions: int) -> str:
    """Construit le prompt utilisateur. Pas de saut de ligne « important » côté JSON."""
    return (
        f"Tu es un formateur expert. Conçois un cours pédagogique complet sur le sujet : « {topic} ».\n"
        f"Niveau ciblé : {level}. Langue : {language}.\n"
        f"Le contenu (champ body_content) doit être rédigé en Markdown : titres ##, listes, "
        f"exemples concrets, et un court récapitulatif final. Vise environ 500 à 900 mots.\n"
        f"Génère exactement {num_questions} questions de quiz à choix unique permettant "
        f"de valider les acquis du cours. Pour chaque question : 4 réponses, exactement une "
        f"correcte (is_correct=true), les autres plausibles mais erronées. xp_value entre 5 et 20.\n"
        "Respecte strictement le schéma JSON fourni : aucun champ supplémentaire, aucun texte hors JSON."
    )


def generate_course(
    *,
    topic: str,
    level: str,
    language: str,
    num_questions: int,
    model: str | None = None,
) -> dict[str, Any]:
    """Appelle Gemini et retourne un dict ``{course_title, body_content, questions: [...]}``.

    Lève :
        GeminiError : configuration manquante, erreur réseau, statut HTTP ≠ 200, JSON invalide.
    """
    if not is_configured():
        raise GeminiError('GEMINI_API_KEY non configurée côté serveur.', status=503)

    chosen_model = (model or getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash-lite')).strip()
    timeout_s = int(getattr(settings, 'GEMINI_TIMEOUT_S', 30))

    url = f'{GEMINI_BASE_URL}/{chosen_model}:generateContent'
    payload = {
        'contents': [
            {'role': 'user', 'parts': [{'text': _build_prompt(
                topic=topic, level=level, language=language, num_questions=num_questions,
            )}]}
        ],
        'generationConfig': {
            'temperature': 0.6,
            'responseMimeType': 'application/json',
            'responseSchema': _course_response_schema(num_questions),
        },
    }

    try:
        # Clef en query string : convention Google AI Studio. Jamais loggée.
        response = requests.post(
            url,
            params={'key': settings.GEMINI_API_KEY},
            json=payload,
            timeout=timeout_s,
            headers={'Content-Type': 'application/json'},
        )
    except requests.RequestException as exc:
        logger.warning('Gemini : erreur réseau (%s)', exc.__class__.__name__)
        raise GeminiError('Service IA injoignable.', status=502) from exc

    if response.status_code != 200:
        # On ne renvoie pas le détail Google au client : risque de fuite d'infos sensibles.
        logger.warning('Gemini : statut %s (%s)', response.status_code, response.text[:300])
        raise GeminiError('Le service IA a renvoyé une erreur.', status=502)

    try:
        data = response.json()
    except ValueError as exc:
        raise GeminiError('Réponse IA non JSON.', status=502) from exc

    candidates = data.get('candidates') or []
    if not candidates:
        raise GeminiError('Réponse IA vide (aucun candidat).', status=502)
    parts = (candidates[0].get('content') or {}).get('parts') or []
    if not parts or 'text' not in parts[0]:
        raise GeminiError('Réponse IA mal formée (pas de texte).', status=502)

    try:
        parsed = json.loads(parts[0]['text'])
    except (TypeError, ValueError) as exc:
        raise GeminiError('Le JSON renvoyé par l’IA est invalide.', status=502) from exc

    return parsed
