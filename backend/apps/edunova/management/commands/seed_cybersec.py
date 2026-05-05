from __future__ import annotations

from dataclasses import dataclass

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.edunova.models import (
    Answer,
    Badge,
    Course,
    CourseEnrollment,
    Profile,
    Question,
    Quiz,
    Rank,
    Role,
    Theme,
    User,
)


@dataclass(frozen=True)
class QuizSeed:
    key: str
    coins_on_success: int
    min_score_to_pass: int
    questions: list[dict]


QUIZZES: list[QuizSeed] = [
    QuizSeed(
        key="fondamentaux_secu",
        coins_on_success=80,
        min_score_to_pass=70,
        questions=[
            {
                "label": "Quel principe de securite garantit que seules les personnes autorisees peuvent lire une donnee ?",
                "xp": 20,
                "answers": [
                    ("Confidentialite", True),
                    ("Integrite", False),
                    ("Disponibilite", False),
                    ("Non-repudiation", False),
                ],
            },
            {
                "label": "Qu'est-ce qu'une attaque de type 'phishing' ?",
                "xp": 20,
                "answers": [
                    ("Usurpation d'identite par e-mail ou faux site", True),
                    ("Injection de code SQL dans un formulaire", False),
                    ("Surcharge d'un serveur par des requetes massives", False),
                    ("Interception du trafic reseau chiffre", False),
                ],
            },
            {
                "label": "Quelle mesure reduit le plus efficacement la surface d'attaque d'un systeme ?",
                "xp": 20,
                "answers": [
                    ("Principe du moindre privilege", True),
                    ("Utiliser uniquement IPv6", False),
                    ("Desactiver les journaux systeme", False),
                    ("Multiplier les comptes administrateurs", False),
                ],
            },
            {
                "label": "Que signifie le sigle CIA en securite de l'information ?",
                "xp": 20,
                "answers": [
                    ("Confidentiality, Integrity, Availability", True),
                    ("Control, Isolation, Authentication", False),
                    ("Cipher, Integrity, Authorization", False),
                    ("Compliance, Identification, Audit", False),
                ],
            },
        ],
    ),
    QuizSeed(
        key="cryptographie",
        coins_on_success=120,
        min_score_to_pass=75,
        questions=[
            {
                "label": "Quelle difference y a-t-il entre chiffrement symetrique et asymetrique ?",
                "xp": 25,
                "answers": [
                    ("Symetrique : meme cle ; asymetrique : paire cle publique/privee", True),
                    ("Symetrique : plus lent ; asymetrique : plus rapide", False),
                    ("Asymetrique utilise uniquement des cles de 128 bits", False),
                    ("Symetrique ne peut chiffrer que des fichiers texte", False),
                ],
            },
            {
                "label": "A quoi sert une fonction de hachage cryptographique ?",
                "xp": 25,
                "answers": [
                    ("Produire une empreinte de taille fixe non reversible", True),
                    ("Chiffrer un message avec une cle secrete", False),
                    ("Generer une paire de cles RSA", False),
                    ("Compresser les donnees avant transmission", False),
                ],
            },
            {
                "label": "Quel protocole assure la confidentialite et l'integrite des communications web ?",
                "xp": 25,
                "answers": [
                    ("TLS", True),
                    ("FTP", False),
                    ("ICMP", False),
                    ("Telnet", False),
                ],
            },
            {
                "label": "Qu'est-ce qu'une attaque de type 'man-in-the-middle' ?",
                "xp": 25,
                "answers": [
                    ("Interception et modification des communications entre deux parties", True),
                    ("Bombardement d'un service avec des requetes UDP", False),
                    ("Decouverte de mots de passe par force brute", False),
                    ("Injection de scripts dans une page web", False),
                ],
            },
        ],
    ),
    QuizSeed(
        key="securite_applicative",
        coins_on_success=150,
        min_score_to_pass=80,
        questions=[
            {
                "label": "Quel est le principal risque d'une injection SQL ?",
                "xp": 30,
                "answers": [
                    ("Acces non autorise ou destruction de la base de donnees", True),
                    ("Ralentissement des requetes SELECT uniquement", False),
                    ("Surcharge de la memoire applicative", False),
                    ("Corruption des fichiers journaux", False),
                ],
            },
            {
                "label": "Comment prevenir les attaques XSS (Cross-Site Scripting) ?",
                "xp": 30,
                "answers": [
                    ("Echapper et valider toutes les entrees utilisateur cote serveur", True),
                    ("Utiliser uniquement des formulaires en methode GET", False),
                    ("Desactiver JavaScript dans le navigateur des utilisateurs", False),
                    ("Supprimer les cookies de session", False),
                ],
            },
            {
                "label": "Que represente le Top 10 OWASP ?",
                "xp": 30,
                "answers": [
                    ("Les risques de securite applicative les plus critiques", True),
                    ("Un classement des meilleurs pare-feux commerciaux", False),
                    ("Les dix langages de programmation les plus securises", False),
                    ("Un standard de certification ISO pour les developpeurs", False),
                ],
            },
            {
                "label": "Quel mecanisme protege contre la falsification de requetes intersites (CSRF) ?",
                "xp": 30,
                "answers": [
                    ("Token CSRF unique par session inclus dans chaque formulaire", True),
                    ("Hachage du mot de passe avec bcrypt", False),
                    ("Redirection HTTPS systematique", False),
                    ("Filtrage des adresses IP clientes", False),
                ],
            },
        ],
    ),
]


COURSES = [
    {
        "title": "Fondamentaux de la cybersecurite",
        "order": 4,
        "quiz_key": "fondamentaux_secu",
        "badge": "Badge Sentinelle Numerique",
        "content": (
            "Decouvrir la triade CIA, les types d'attaques courants (phishing, DDoS, "
            "ingenierie sociale) et les bonnes pratiques de base pour reduire la surface "
            "d'attaque d'un systeme d'information."
        ),
    },
    {
        "title": "Cryptographie appliquee",
        "order": 5,
        "quiz_key": "cryptographie",
        "badge": "Badge Cryptographe Junior",
        "content": (
            "Comprendre les principes du chiffrement symetrique et asymetrique, des "
            "fonctions de hachage, des certificats TLS et de la gestion des cles pour "
            "securiser les communications et les donnees au repos."
        ),
    },
    {
        "title": "Securite des applications web",
        "order": 6,
        "quiz_key": "securite_applicative",
        "badge": "Badge Auditeur AppSec",
        "content": (
            "Identifier et corriger les vulnerabilites applicatives majeures : injections "
            "SQL, XSS, CSRF, misconfiguration, secrets exposes. S'appuyer sur le Top 10 "
            "OWASP comme referentiel de bonnes pratiques."
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Genere un jeu de donnees complet sur la thematique "
        "'cybersecurite' (roles, users, profils, cours, quiz, Q/R)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="Edunova123!",
            help="Mot de passe applique aux utilisateurs crees/mis a jour.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime les donnees pedagogiques cybersec de seed avant regeneration.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password: str = options["password"]
        do_reset: bool = options["reset"]

        if do_reset:
            self._reset_dataset()

        roles = self._seed_roles()
        ranks = self._seed_ranks()
        users = self._seed_users(roles=roles, password=password)
        self._seed_profiles(users=users, ranks=ranks)
        self._seed_pedagogy(users=users)

        self.stdout.write(self.style.SUCCESS("Seed cybersecurite termine."))
        self.stdout.write(f"- Roles: {Role.objects.count()}")
        self.stdout.write(f"- Users: {User.objects.count()}")
        self.stdout.write(f"- Profiles: {Profile.objects.count()}")
        self.stdout.write(f"- Themes: {Theme.objects.count()}")
        self.stdout.write(f"- Courses: {Course.objects.count()}")
        self.stdout.write(f"- Quiz: {Quiz.objects.count()}")
        self.stdout.write(f"- Questions: {Question.objects.count()}")
        self.stdout.write(f"- Reponses: {Answer.objects.count()}")

    def _reset_dataset(self) -> None:
        self.stdout.write("Reset des donnees seed cybersec pedagogiques...")
        theme_title = "Cybersecurite"
        course_titles = [c["title"] for c in COURSES]
        CourseEnrollment.objects.filter(course__theme__theme_title=theme_title).delete()
        Course.objects.filter(course_title__in=course_titles).delete()
        Badge.objects.filter(badge_name__in=[c["badge"] for c in COURSES]).delete()
        for quiz_seed in QUIZZES:
            Quiz.objects.filter(
                min_score_to_pass=quiz_seed.min_score_to_pass,
                coins_on_success=quiz_seed.coins_on_success,
            ).delete()
        Theme.objects.filter(theme_title=theme_title).delete()

    def _seed_roles(self) -> dict[str, Role]:
        role_specs = {
            "admin": {
                "name": "admin",
                "rights": {
                    "manage_users": True,
                    "manage_courses": True,
                    "manage_quizzes": True,
                    "manage_questions": True,
                },
            },
            "formateur": {
                "name": "formateur",
                "rights": {
                    "manage_courses": True,
                    "manage_quizzes": True,
                    "manage_questions": True,
                    "manage_users": False,
                },
            },
            "utilisateur": {
                "name": "utilisateur",
                "rights": {
                    "manage_users": False,
                    "manage_courses": False,
                    "manage_quizzes": False,
                    "play_quizzes": True,
                },
            },
        }

        roles: dict[str, Role] = {}
        for key, spec in role_specs.items():
            role, _ = Role.objects.update_or_create(
                role_name=spec["name"],
                defaults={"role_rights": spec["rights"]},
            )
            roles[key] = role
        return roles

    def _seed_ranks(self) -> dict[str, Rank]:
        rank_specs = {
            "novice":        {"label": "Analyste Debutant",      "xp": 0,    "stars": 1},
            "intermediaire": {"label": "Specialiste Securite",   "xp": 1000, "stars": 2},
            "expert":        {"label": "Expert Cybersecurite",   "xp": 3000, "stars": 3},
        }
        ranks: dict[str, Rank] = {}
        for key, spec in rank_specs.items():
            rank, _ = Rank.objects.update_or_create(
                label=spec["label"],
                defaults={"xp_threshold": spec["xp"], "stars": spec["stars"]},
            )
            ranks[key] = rank
        return ranks

    def _seed_users(self, *, roles: dict[str, Role], password: str) -> dict[str, User]:
        user_specs = [
            {
                "key": "admin",
                "email": "admin.secu@edunova.local",
                "role": roles["admin"],
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
            {
                "key": "formateur1",
                "email": "formateur.crypto@edunova.local",
                "role": roles["formateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "formateur2",
                "email": "formateur.appsec@edunova.local",
                "role": roles["formateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "user1",
                "email": "utilisateur.pentest@edunova.local",
                "role": roles["utilisateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "user2",
                "email": "utilisateur.soc@edunova.local",
                "role": roles["utilisateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "user3",
                "email": "utilisateur.devsecops@edunova.local",
                "role": roles["utilisateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
        ]

        users: dict[str, User] = {}
        for spec in user_specs:
            user, _ = User.objects.update_or_create(
                email=spec["email"],
                defaults={
                    "role": spec["role"],
                    "is_staff": spec["is_staff"],
                    "is_superuser": spec["is_superuser"],
                    "is_active": spec["is_active"],
                },
            )
            user.set_password(password)
            user.save(update_fields=["password", "username"])
            users[spec["key"]] = user
        return users

    def _seed_profiles(self, *, users: dict[str, User], ranks: dict[str, Rank]) -> None:
        profile_specs = {
            "admin": {"xp": 3100, "wallet": 1500, "streak": 35, "rank": ranks["expert"]},
            "formateur1": {"xp": 1900, "wallet": 1050, "streak": 22, "rank": ranks["expert"]},
            "formateur2": {"xp": 1200, "wallet": 730, "streak": 14, "rank": ranks["intermediaire"]},
            "user1": {"xp": 410, "wallet": 210, "streak": 7, "rank": ranks["novice"]},
            "user2": {"xp": 850, "wallet": 390, "streak": 13, "rank": ranks["intermediaire"]},
            "user3": {"xp": 560, "wallet": 260, "streak": 9, "rank": ranks["intermediaire"]},
        }
        for key, spec in profile_specs.items():
            Profile.objects.update_or_create(
                user=users[key],
                defaults={
                    "total_xp": spec["xp"],
                    "wallet_balance": spec["wallet"],
                    "current_streak": spec["streak"],
                    "rank": spec["rank"],
                },
            )

    def _seed_pedagogy(self, *, users: dict[str, User]) -> None:
        theme, _ = Theme.objects.get_or_create(theme_title="Cybersecurite")

        quizzes: dict[str, Quiz] = {}
        for quiz_seed in QUIZZES:
            quiz, _ = Quiz.objects.update_or_create(
                min_score_to_pass=quiz_seed.min_score_to_pass,
                coins_on_success=quiz_seed.coins_on_success,
            )
            quizzes[quiz_seed.key] = quiz

            quiz.questions.all().delete()
            for q in quiz_seed.questions:
                question = Question.objects.create(
                    quiz=quiz,
                    question_content=q["label"],
                    xp_value=q["xp"],
                )
                for answer_label, is_correct in q["answers"]:
                    Answer.objects.create(
                        question=question,
                        label_answer=answer_label,
                        is_correct=is_correct,
                    )

        for course_data in COURSES:
            badge, _ = Badge.objects.get_or_create(
                badge_name=course_data["badge"],
                defaults={
                    "icon_url": f"https://cdn.edunova.local/badges/{course_data['order']}.svg",
                },
            )
            course, _ = Course.objects.update_or_create(
                course_title=course_data["title"],
                defaults={
                    "theme": theme,
                    "validating_quiz": quizzes[course_data["quiz_key"]],
                    "delivered_badge": badge,
                    "body_content": course_data["content"],
                    "map_order": course_data["order"],
                },
            )
            for user_key in ("user1", "user2", "user3", "formateur1", "formateur2"):
                CourseEnrollment.objects.get_or_create(user=users[user_key], course=course)
