"""Sérialiseurs compte utilisateur (élève) et gestion staff."""

from django.contrib.auth import authenticate

from rest_framework import serializers

from apps.api.profiles.serializers import ProfileReadSerializer
from apps.api.users.permissions import RESTRICTED_ROLES
from apps.edunova.models import Role, User


class RoleBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('role_id', 'role_name')


class MeSerializer(serializers.ModelSerializer):
    role = RoleBriefSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('user_id', 'email', 'role', 'is_staff')
        read_only_fields = fields


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

    def validate(self, attrs: dict) -> dict:
        role = attrs.get('role')
        if role and role.role_name.strip().lower() in RESTRICTED_ROLES:
            raise serializers.ValidationError(
                {'role_id': 'Ce rôle ne peut pas être assigné à l\'inscription.'}
            )
        return attrs

    def create(self, validated_data: dict) -> User:
        email = validated_data['email']
        password = validated_data['password']
        role = validated_data.get('role')

        if role is None:
            role = Role.objects.filter(role_name__iexact='élève').first()
            if role is None:
                role = Role.objects.order_by('role_id').first()
            if role is None:
                raise serializers.ValidationError(
                    {'role_id': 'Aucun rôle par défaut en base : créez un rôle ou indiquez role_id.'}
                )

        user = User(email=email, role=role)
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


class AdminUserDetailSerializer(serializers.ModelSerializer):
    role = RoleBriefSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        write_only=True,
        required=False,
    )
    profile = ProfileReadSerializer(read_only=True)

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
        )
        read_only_fields = (
            'user_id',
            'role',
            'date_joined',
            'last_login',
            'profile',
            'is_superuser',
        )

    def validate_email(self, value: str) -> str:
        instance = self.instance
        qs = User.objects.filter(email__iexact=value)
        if instance is not None:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Cette adresse e-mail est déjà utilisée.')
        return value.lower()
