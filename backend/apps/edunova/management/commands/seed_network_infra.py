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
        key="topologies_lan",
        coins_on_success=80,
        min_score_to_pass=70,
        questions=[
            {
                "label": "Quelle topologie est la plus sensible a la rupture d'un lien unique ?",
                "xp": 20,
                "answers": [
                    ("Etoile", False),
                    ("Bus", True),
                    ("Maillage complet", False),
                    ("Anneau redondant", False),
                ],
            },
            {
                "label": "Quel equipement opere principalement en couche 2 du modele OSI ?",
                "xp": 20,
                "answers": [
                    ("Switch", True),
                    ("Routeur", False),
                    ("Pare-feu applicatif", False),
                    ("Serveur DNS", False),
                ],
            },
            {
                "label": "Quel est l'avantage principal d'une topologie en etoile ?",
                "xp": 20,
                "answers": [
                    ("Isolation simplifiee des pannes", True),
                    ("Cout de cablage minimal", False),
                    ("Aucun equipement central requis", False),
                    ("Latence toujours nulle", False),
                ],
            },
        ],
    ),
    QuizSeed(
        key="routage_vlan",
        coins_on_success=120,
        min_score_to_pass=75,
        questions=[
            {
                "label": "A quoi sert un VLAN dans un reseau d'entreprise ?",
                "xp": 25,
                "answers": [
                    ("Segmenter logiquement le reseau", True),
                    ("Augmenter la vitesse CPU", False),
                    ("Remplacer le pare-feu", False),
                    ("Assurer le chiffrement TLS", False),
                ],
            },
            {
                "label": "Quel protocole est le plus utilise pour le routage dynamique interne ?",
                "xp": 25,
                "answers": [
                    ("OSPF", True),
                    ("FTP", False),
                    ("NTP", False),
                    ("SMTP", False),
                ],
            },
            {
                "label": "Quel element est necessaire pour faire communiquer deux VLANs ?",
                "xp": 25,
                "answers": [
                    ("Routage inter-VLAN", True),
                    ("Un hub passif", False),
                    ("Un repartiteur coaxial", False),
                    ("Un serveur DHCP secondaire uniquement", False),
                ],
            },
        ],
    ),
    QuizSeed(
        key="securite_supervision",
        coins_on_success=140,
        min_score_to_pass=80,
        questions=[
            {
                "label": "Quel composant applique des regles de filtrage entre zones reseau ?",
                "xp": 30,
                "answers": [
                    ("Pare-feu", True),
                    ("Point d'acces Wi-Fi", False),
                    ("Onduleur", False),
                    ("Switch non manageable", False),
                ],
            },
            {
                "label": "Quel outil est utilise pour collecter et centraliser les logs securite ?",
                "xp": 30,
                "answers": [
                    ("SIEM", True),
                    ("Proxy ARP", False),
                    ("Load balancer L4", False),
                    ("Serveur PXE", False),
                ],
            },
            {
                "label": "Pourquoi surveiller la latence et la perte de paquets en continu ?",
                "xp": 30,
                "answers": [
                    ("Detecter rapidement les degradations de service", True),
                    ("Augmenter automatiquement la bande passante WAN", False),
                    ("Supprimer les besoins de sauvegarde", False),
                    ("Remplacer les tests de charge", False),
                ],
            },
        ],
    ),
]


COURSES = [
    {
        "title": "Fondamentaux LAN et topologies",
        "order": 1,
        "quiz_key": "topologies_lan",
        "badge": "Badge Architecte LAN",
        "content": (
            "Comprendre les topologies physiques et logiques, les domaines de collision "
            "et de broadcast, ainsi que le role des switches dans un LAN moderne."
        ),
    },
    {
        "title": "Routage, VLAN et segmentation",
        "order": 2,
        "quiz_key": "routage_vlan",
        "badge": "Badge Ingenieur Segmentation",
        "content": (
            "Configurer la segmentation reseau avec les VLANs, introduire le routage "
            "inter-VLAN et appliquer des bonnes pratiques de design d'entreprise."
        ),
    },
    {
        "title": "Securite et supervision reseau",
        "order": 3,
        "quiz_key": "securite_supervision",
        "badge": "Badge Analyste NOC/SOC",
        "content": (
            "Mettre en place des controles de securite, de la collecte de logs "
            "et une supervision proactive des performances et incidents."
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Genere un jeu de donnees complet sur la thematique "
        "'infrastructures reseaux' (roles, users, profils, cours, quiz, Q/R)."
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
            help="Supprime les donnees pedagogiques de seed avant regeneration.",
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

        self.stdout.write(self.style.SUCCESS("Seed infrastructures reseaux termine."))
        self.stdout.write(f"- Roles: {Role.objects.count()}")
        self.stdout.write(f"- Users: {User.objects.count()}")
        self.stdout.write(f"- Profiles: {Profile.objects.count()}")
        self.stdout.write(f"- Themes: {Theme.objects.count()}")
        self.stdout.write(f"- Courses: {Course.objects.count()}")
        self.stdout.write(f"- Quiz: {Quiz.objects.count()}")
        self.stdout.write(f"- Questions: {Question.objects.count()}")
        self.stdout.write(f"- Reponses: {Answer.objects.count()}")

    def _reset_dataset(self) -> None:
        self.stdout.write("Reset des donnees seed pedagogiques...")
        CourseEnrollment.objects.all().delete()
        Course.objects.all().delete()
        Badge.objects.all().delete()
        Question.objects.all().delete()
        Quiz.objects.all().delete()
        Theme.objects.all().delete()

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
            "novice":        {"label": "Technicien Novice",         "xp": 0,    "stars": 1},
            "intermediaire": {"label": "Administrateur Reseau",      "xp": 1000, "stars": 2},
            "expert":        {"label": "Architecte Infrastructure",  "xp": 3000, "stars": 3},
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
                "email": "admin.reseau@edunova.local",
                "role": roles["admin"],
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
            {
                "key": "formateur1",
                "email": "formateur.core@edunova.local",
                "role": roles["formateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "formateur2",
                "email": "formateur.secu@edunova.local",
                "role": roles["formateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "user1",
                "email": "utilisateur.switch@edunova.local",
                "role": roles["utilisateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "user2",
                "email": "utilisateur.vlan@edunova.local",
                "role": roles["utilisateur"],
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
            {
                "key": "user3",
                "email": "utilisateur.monitoring@edunova.local",
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
            "admin": {"xp": 2200, "wallet": 1200, "streak": 28, "rank": ranks["expert"]},
            "formateur1": {"xp": 1700, "wallet": 900, "streak": 20, "rank": ranks["expert"]},
            "formateur2": {
                "xp": 1400,
                "wallet": 820,
                "streak": 16,
                "rank": ranks["intermediaire"],
            },
            "user1": {"xp": 320, "wallet": 180, "streak": 6, "rank": ranks["novice"]},
            "user2": {"xp": 780, "wallet": 340, "streak": 11, "rank": ranks["intermediaire"]},
            "user3": {"xp": 640, "wallet": 290, "streak": 9, "rank": ranks["intermediaire"]},
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
        theme, _ = Theme.objects.get_or_create(theme_title="Infrastructures reseaux")

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
