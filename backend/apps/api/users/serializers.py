"""Sérialiseurs compte utilisateur (élève) et gestion staff."""

import re

from django.contrib.auth import authenticate

from rest_framework import serializers

from apps.api.profiles.serializers import ProfileReadSerializer
from apps.api.users.permissions import (
    REGISTERABLE_SIGNUP_ROLES,
    normalize_role_name_ascii,
    is_formateur_role,
    is_learner_role,
)
from apps.edunova.models import Role, User


class RoleBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('role_id', 'role_name')


class MeSerializer(serializers.ModelSerializer):
    role = RoleBriefSerializer(read_only=True)
    formateur_id = serializers.IntegerField(source='formateur.user_id', read_only=True)
    current_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('user_id', 'email', 'role', 'formateur_id', 'is_staff', 'current_avatar_url')
        read_only_fields = fields

    def get_current_avatar_url(self, obj) -> str:
        try:
            return obj.profile.current_avatar_url or ''
        except Exception:
            return ''


class MeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email',)

    def validate_email(self, value: str) -> str:
        user = self.context['request'].user
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Cette adresse e-mail est déjà utilisée.')
        return value.lower()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        required=False,
        allow_null=True,
    )

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Cette adresse e-mail est déjà enregistrée.')
        return value.lower()

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError(
                'Le mot de passe doit contenir au moins 8 caractères.'
            )
        if re.search(r'[^A-Za-z0-9]', value) is None:
            raise serializers.ValidationError(
                'Le mot de passe doit contenir au moins un caractère spécial.'
            )
        return value

    def validate(self, attrs: dict) -> dict:
        role = attrs.get('role')
        if role:
            key = normalize_role_name_ascii(role.role_name)
            if key not in REGISTERABLE_SIGNUP_ROLES:
                raise serializers.ValidationError(
                    {
                        'role_id': 'Ce rôle ne peut pas être choisi à l’inscription.'
                    }
                )
        return attrs

    def create(self, validated_data: dict) -> User:
        email = validated_data['email']
        password = validated_data['password']
        role = validated_data.get('role')

        if role is None:
            role = Role.objects.filter(role_name__iexact='élève').first()
            if role is None:
                role = Role.objects.filter(role_name__iexact='utilisateur').first()
            if role is None:
                role = Role.objects.order_by('role_id').first()
            if role is None:
                raise serializers.ValidationError(
                    {'role_id': 'Aucun rôle par défaut en base : créez un rôle ou indiquez role_id.'}
                )

        # Lie automatiquement les apprenants à un formateur référent (le moins
        # chargé) pour qu'ils voient un parcours dès l'inscription publique.
        formateur_default: User | None = None
        if is_learner_role(role.role_name):
            formateur_default = (
                User.objects
                .filter(role__role_name__iexact='formateur', is_active=True)
                .order_by('apprenants__user_id', 'user_id')
                .first()
            )

        user = User(email=email, role=role, formateur=formateur_default)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        email = attrs['email'].lower()
        password = attrs['password']
        user = authenticate(
            self.context['request'],
            email=email,
            password=password,
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError(
                {'detail': 'Identifiants invalides ou compte inactif.'},
                code='authorization',
            )
        attrs['user'] = user
        return attrs


class AdminUserListSerializer(serializers.ModelSerializer):
    role = RoleBriefSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'user_id',
            'email',
            'role',
            'is_active',
            'is_staff',
            'date_joined',
            'last_login',
        )
        read_only_fields = fields


class AdminUserCreateSerializer(serializers.Serializer):
    """Création d’un compte par un administrateur (mot de passe connu au moment du POST)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source='role')
    formateur_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='formateur',
        required=False,
        allow_null=True,
    )
    is_active = serializers.BooleanField(required=False, default=True)
    is_staff = serializers.BooleanField(required=False, default=False)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Cette adresse e-mail est déjà utilisée.')
        return value.lower()

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        role = attrs.get('role')
        formateur = attrs.get('formateur')
        role_name = getattr(role, 'role_name', None)
        if formateur:
            formateur_role_name = getattr(getattr(formateur, 'role', None), 'role_name', None)
            if not is_formateur_role(formateur_role_name):
                raise serializers.ValidationError(
                    {'formateur_id': 'Le compte lié doit avoir le rôle formateur.'}
                )
        if is_learner_role(role_name) and formateur is None:
            raise serializers.ValidationError(
                {'formateur_id': 'Un utilisateur doit être lié à un formateur.'}
            )
        return attrs

    def create(self, validated_data: dict) -> User:
        request_user = self.context['request'].user
        wants_staff = bool(validated_data.get('is_staff', False))
        is_staff = wants_staff if getattr(request_user, 'is_superuser', False) else False
        user = User(
            email=validated_data['email'],
            role=validated_data['role'],
            formateur=validated_data.get('formateur'),
            is_active=bool(validated_data.get('is_active', True)),
            is_staff=is_staff,
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class AdminUserDetailSerializer(serializers.ModelSerializer):
    role = RoleBriefSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        write_only=True,
        required=False,
    )
    profile = ProfileReadSerializer(read_only=True)
    formateur_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='formateur',
        write_only=True,
        required=False,
        allow_null=True,
    )
    formateur = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'user_id',
            'email',
            'role',
            'role_id',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login',
            'profile',
            'formateur',
            'formateur_id',
        )
        read_only_fields = (
            'user_id',
            'role',
            'date_joined',
            'last_login',
            'profile',
            'is_superuser',
        )

    def get_formateur(self, obj: User):
        if not obj.formateur_id:
            return None
        return {
            'user_id': obj.formateur.user_id,
            'email': obj.formateur.email,
        }

    def validate_email(self, value: str) -> str:
        instance = self.instance
        qs = User.objects.filter(email__iexact=value)
        if instance is not None:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Cette adresse e-mail est déjà utilisée.')
        return value.lower()

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        role = attrs.get('role', getattr(self.instance, 'role', None))
        formateur = attrs.get('formateur', getattr(self.instance, 'formateur', None))
        role_name = getattr(role, 'role_name', None)
        if formateur:
            formateur_role_name = getattr(getattr(formateur, 'role', None), 'role_name', None)
            if not is_formateur_role(formateur_role_name):
                raise serializers.ValidationError(
                    {'formateur_id': 'Le compte lié doit avoir le rôle formateur.'}
                )
        if is_learner_role(role_name) and formateur is None:
            raise serializers.ValidationError(
                {'formateur_id': 'Un utilisateur doit être lié à un formateur.'}
            )
        return attrs
