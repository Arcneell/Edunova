"""
Modèles du domaine Edunova (MCD).

Tout le schéma est regroupé dans ce fichier par choix de projet.
Les commentaires de section reprennent les regroupements métier.
"""

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

# -----------------------------------------------------------------------------
# Identité et progression (ROLE, USER, PROFILE, RANK)
# -----------------------------------------------------------------------------


class Role(models.Model):
    """Rôle applicatif : agrège les droits (JSON côté serveur uniquement)."""

    role_id = models.BigAutoField(_('identifiant rôle'), primary_key=True, db_column='role_id')
    role_name = models.CharField(_('nom du rôle'), max_length=150, unique=True, db_column='role_name')
    role_rights = models.JSONField(
        _('droits'),
        default=dict,
        help_text=_('Structure JSON des permissions (ne jamais faire confiance au seul client).'),
    )

    class Meta:
        db_table = 'role'
        verbose_name = _('rôle')
        verbose_name_plural = _('rôles')
        ordering = ['role_name']

    def __str__(self) -> str:
        return self.role_name


class Rank(models.Model):
    """Rang lié au profil (seuil d’XP)."""

    rank_id = models.BigAutoField(_('identifiant rang'), primary_key=True, db_column='rank_id')
    label = models.CharField(_('libellé'), max_length=150)
    xp_threshold = models.PositiveBigIntegerField(
        _('seuil XP'),
        default=0,
        validators=[MinValueValidator(0)],
        db_column='xp_threshold',
        help_text=_('XP minimum pour atteindre ce rang (inclus).'),
    )

    class Meta:
        db_table = 'rank'
        verbose_name = _('rang')
        verbose_name_plural = _('rangs')
        ordering = ['xp_threshold']

    def __str__(self) -> str:
        return f'{self.label} ({self.xp_threshold} XP)'


# -----------------------------------------------------------------------------
# Récompenses et boutique (BADGE, COSMETIC)
# -----------------------------------------------------------------------------


class Badge(models.Model):
    """Badge obtenable (cours, succès, etc.)."""

    badge_id = models.BigAutoField(_('identifiant badge'), primary_key=True, db_column='badge_id')
    badge_name = models.CharField(_('nom'), max_length=200, db_column='badge_name')
    icon_url = models.URLField(_('URL de l’icône'), max_length=500, db_column='icon_url')

    class Meta:
        db_table = 'badge'
        verbose_name = _('badge')
        verbose_name_plural = _('badges')
        ordering = ['badge_name']

    def __str__(self) -> str:
        return self.badge_name


class Cosmetic(models.Model):
    """Élément vendu ou affiché (avatar, bannière, etc.)."""

    cosmetic_id = models.BigAutoField(_('identifiant cosmétique'), primary_key=True, db_column='cosmetic_id')
    cosmetic_name = models.CharField(_('nom'), max_length=200, db_column='cosmetic_name')
    cosmetic_category = models.CharField(
        _('catégorie'),
        max_length=64,
        db_column='cosmetic_category',
        help_text=_('À normaliser via les serializers / catalogue métier.'),
    )
    cosmetic_cost = models.PositiveIntegerField(_('coût'), db_column='cosmetic_cost')
    cosmetic_asset_url = models.URLField(_('URL de l’asset'), max_length=500, db_column='cosmetic_asset_url')

    class Meta:
        db_table = 'cosmetic'
        verbose_name = _('cosmétique')
        verbose_name_plural = _('cosmétiques')
        ordering = ['cosmetic_category', 'cosmetic_name']

    def __str__(self) -> str:
        return self.cosmetic_name


# -----------------------------------------------------------------------------
# Parcours pédagogique (THEME, QUIZ, QUESTION, ANSWER, COURSE)
# -----------------------------------------------------------------------------


class Theme(models.Model):
    """Thème regroupant plusieurs cours."""

    theme_id = models.BigAutoField(_('identifiant thème'), primary_key=True, db_column='theme_id')
    theme_title = models.CharField(_('titre'), max_length=255, db_column='theme_title')

    class Meta:
        db_table = 'theme'
        verbose_name = _('thème')
        verbose_name_plural = _('thèmes')
        ordering = ['theme_title']

    def __str__(self) -> str:
        return self.theme_title


class Quiz(models.Model):
    """Évaluation rattachée à un ou plusieurs cours (relation VALIDER côté MCD)."""

    quiz_id = models.BigAutoField(_('identifiant quiz'), primary_key=True, db_column='quiz_id')
    coins_on_success = models.PositiveIntegerField(_('pièces si réussite'), db_column='coins_on_success')
    min_score_to_pass = models.PositiveSmallIntegerField(
        _('score minimum pour valider'),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_('Pourcentage entier entre 0 et 100.'),
        db_column='min_score_to_pass',
    )

    class Meta:
        db_table = 'quiz'
        verbose_name = _('quiz')
        verbose_name_plural = _('quiz')
        ordering = ['quiz_id']

    def __str__(self) -> str:
        return f'Quiz #{self.pk} (≥ {self.min_score_to_pass}%)'


class User(AbstractUser):
    """
    Compte authentifié (MCD USER).

    Le mot de passe est toujours géré par le hacheur Django (champ ``password``).
    Ne jamais enregistrer de mot de passe en clair.
    """

    user_id = models.BigAutoField(primary_key=True, db_column='user_id')

    username = models.CharField(
        _('pseudo interne'),
        max_length=150,
        unique=True,
        editable=False,
        help_text=_('Aligné sur l’e-mail pour la compatibilité Django.'),
    )
    email = models.EmailField(_('adresse e-mail'), unique=True, db_index=True)

    role = models.ForeignKey(
        'edunova.Role',
        on_delete=models.PROTECT,
        related_name='users',
        verbose_name=_('rôle'),
        db_column='role_id',
    )

    cosmetics_purchased = models.ManyToManyField(
        'edunova.Cosmetic',
        through='edunova.UserCosmeticPurchase',
        related_name='buyers',
        blank=True,
    )
    badges_earned = models.ManyToManyField(
        'edunova.Badge',
        through='edunova.UserBadge',
        related_name='earned_by_users',
        blank=True,
    )
    courses_followed = models.ManyToManyField(
        'edunova.Course',
        through='edunova.CourseEnrollment',
        related_name='followers',
        blank=True,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = 'user'
        verbose_name = _('utilisateur')
        verbose_name_plural = _('utilisateurs')

    def __str__(self) -> str:
        return self.email

    def save(self, *args, **kwargs):
        # Connexion admin Django : USERNAME_FIELD = email, mais AbstractUser exige ``username`` unique.
        self.username = self.email
        super().save(*args, **kwargs)


class Profile(models.Model):
    """Données de jeu / progression (MCD PROFILE, 1–1 avec User)."""

    profile_id = models.BigAutoField(_('identifiant profil'), primary_key=True, db_column='profile_id')
    user = models.OneToOneField(
        'edunova.User',
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('utilisateur'),
    )
    total_xp = models.PositiveBigIntegerField(_('XP total'), default=0, db_column='total_xp')
    wallet_balance = models.PositiveBigIntegerField(
        _('solde portefeuille'),
        default=0,
        db_column='wallet_balance',
        validators=[MinValueValidator(0)],
    )
    current_avatar_url = models.URLField(
        _('URL avatar actuel'),
        max_length=500,
        blank=True,
        default='',
        db_column='current_avatar_url',
    )
    current_banner_url = models.URLField(
        _('URL bannière actuelle'),
        max_length=500,
        blank=True,
        default='',
        db_column='current_banner_url',
    )
    current_streak = models.PositiveIntegerField(_('série courante'), default=0, db_column='current_streak')
    rank = models.ForeignKey(
        'edunova.Rank',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='profiles',
        verbose_name=_('rang'),
        db_column='rank_id',
    )

    class Meta:
        db_table = 'profile'
        verbose_name = _('profil')
        verbose_name_plural = _('profils')

    def __str__(self) -> str:
        return f'Profil #{self.pk}'


class Question(models.Model):
    """Question d’un quiz."""

    question_id = models.BigAutoField(_('identifiant question'), primary_key=True, db_column='question_id')
    quiz = models.ForeignKey(
        'edunova.Quiz',
        on_delete=models.CASCADE,
        related_name='questions',
        verbose_name=_('quiz'),
        db_column='quiz_id',
    )
    question_content = models.TextField(_('énoncé'), db_column='question_content')
    xp_value = models.PositiveIntegerField(
        _('valeur XP'),
        default=0,
        validators=[MinValueValidator(0)],
        db_column='xp_value',
    )

    class Meta:
        db_table = 'question'
        verbose_name = _('question')
        verbose_name_plural = _('questions')
        ordering = ['quiz', 'question_id']

    def __str__(self) -> str:
        return f'Question #{self.pk}'


class Answer(models.Model):
    """Réponse possible à une question."""

    answer_id = models.BigAutoField(_('identifiant réponse'), primary_key=True, db_column='answer_id')
    question = models.ForeignKey(
        'edunova.Question',
        on_delete=models.CASCADE,
        related_name='answers',
        verbose_name=_('question'),
        db_column='question_id',
    )
    label_answer = models.TextField(_('libellé'), db_column='label_answer')
    is_correct = models.BooleanField(_('réponse correcte'), default=False, db_column='is_correct')

    class Meta:
        db_table = 'answer'
        verbose_name = _('réponse')
        verbose_name_plural = _('réponses')
        ordering = ['question', 'answer_id']

    def __str__(self) -> str:
        return f'Réponse #{self.pk}'


class Course(models.Model):
    """Cours rattaché à un thème, un quiz de validation et un badge délivré (MCD)."""

    course_id = models.BigAutoField(_('identifiant cours'), primary_key=True, db_column='course_id')
    theme = models.ForeignKey(
        'edunova.Theme',
        on_delete=models.PROTECT,
        related_name='courses',
        verbose_name=_('thème'),
        db_column='theme_id',
    )
    validating_quiz = models.ForeignKey(
        'edunova.Quiz',
        on_delete=models.PROTECT,
        related_name='validated_courses',
        verbose_name=_('quiz de validation'),
        db_column='validating_quiz_id',
        help_text=_('Relation MCD : VALIDER.'),
    )
    delivered_badge = models.OneToOneField(
        'edunova.Badge',
        on_delete=models.PROTECT,
        related_name='course_delivery',
        verbose_name=_('badge délivré'),
        db_column='delivered_badge_id',
        help_text=_('Relation MCD : DELIVRER (un cours → un badge ; un badge → au plus un cours).'),
    )
    course_title = models.CharField(_('titre'), max_length=255, db_column='course_title')
    body_content = models.TextField(_('contenu'), db_column='body_content')
    map_order = models.PositiveIntegerField(
        _('ordre sur la carte'),
        default=0,
        db_column='map_order',
    )

    class Meta:
        db_table = 'course'
        verbose_name = _('cours')
        verbose_name_plural = _('cours')
        ordering = ['theme', 'map_order', 'course_title']

    def __str__(self) -> str:
        return self.course_title


# -----------------------------------------------------------------------------
# Tables de liaison N–N (MCD ACHETER, GAGNER, SUIVRE)
# -----------------------------------------------------------------------------


class UserCosmeticPurchase(models.Model):
    """Liaison ACHETER entre utilisateur et cosmétique."""

    purchase_id = models.BigAutoField(primary_key=True, db_column='purchase_id')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cosmetic_purchases',
        db_column='user_id',
    )
    cosmetic = models.ForeignKey(
        'edunova.Cosmetic',
        on_delete=models.PROTECT,
        related_name='purchases',
        db_column='cosmetic_id',
    )
    purchased_at = models.DateTimeField(_('acheté le'), auto_now_add=True)

    class Meta:
        db_table = 'user_cosmetic_purchase'
        verbose_name = _('achat cosmétique')
        verbose_name_plural = _('achats cosmétiques')
        constraints = [
            models.UniqueConstraint(fields=['user', 'cosmetic'], name='uniq_user_cosmetic_purchase'),
        ]

    def __str__(self) -> str:
        return f'{self.user_id} → {self.cosmetic_id}'


class UserBadge(models.Model):
    """Liaison GAGNER entre utilisateur et badge."""

    user_badge_id = models.BigAutoField(primary_key=True, db_column='user_badge_id')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='badge_links',
        db_column='user_id',
    )
    badge = models.ForeignKey(
        'edunova.Badge',
        on_delete=models.PROTECT,
        related_name='user_links',
        db_column='badge_id',
    )
    earned_at = models.DateTimeField(_('obtenu le'), auto_now_add=True)

    class Meta:
        db_table = 'user_badge'
        verbose_name = _('badge utilisateur')
        verbose_name_plural = _('badges utilisateurs')
        constraints = [
            models.UniqueConstraint(fields=['user', 'badge'], name='uniq_user_badge'),
        ]

    def __str__(self) -> str:
        return f'{self.user_id} → {self.badge_id}'


class CourseEnrollment(models.Model):
    """Liaison SUIVRE entre utilisateur et cours suivi."""

    enrollment_id = models.BigAutoField(primary_key=True, db_column='enrollment_id')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_enrollments',
        db_column='user_id',
    )
    course = models.ForeignKey(
        'edunova.Course',
        on_delete=models.CASCADE,
        related_name='enrollments',
        db_column='course_id',
    )
    enrolled_at = models.DateTimeField(_('inscrit le'), auto_now_add=True)

    class Meta:
        db_table = 'course_enrollment'
        verbose_name = _('inscription cours')
        verbose_name_plural = _('inscriptions cours')
        constraints = [
            models.UniqueConstraint(fields=['user', 'course'], name='uniq_user_course_enrollment'),
        ]

    def __str__(self) -> str:
        return f'{self.user_id} → {self.course_id}'
