"""Routes utilisateur sous ``/api/`` (auth, moi, profil, admin)."""

from django.urls import path

from apps.api.badges.views import MyBadgeListView
from apps.api.cosmetic.views import EquipCosmeticView, MyPurchaseListView
from apps.api.course.views import MyCourseListView
from apps.api.profiles.views import CurrentUserProfileView
from apps.api.users import views

urlpatterns = [
    path('auth/csrf/', views.AuthCsrfView.as_view(), name='api_auth_csrf'),
    path('auth/register/', views.RegisterView.as_view(), name='api_auth_register'),
    path('auth/login/', views.LoginView.as_view(), name='api_auth_login'),
    path('auth/logout/', views.LogoutView.as_view(), name='api_auth_logout'),
    path('me/', views.MeView.as_view(), name='api_me'),
    path('me/profile/', CurrentUserProfileView.as_view(), name='api_me_profile'),
    path('me/courses/', MyCourseListView.as_view(), name='api_me_courses'),
    path('me/badges/', MyBadgeListView.as_view(), name='api_me_badges'),
    path('me/purchases/', MyPurchaseListView.as_view(), name='api_me_purchases'),
    path('me/equip/', EquipCosmeticView.as_view(), name='api_me_equip'),
    path('admin/users/', views.AdminUserListView.as_view(), name='api_admin_users_list'),
    path('admin/users/<int:user_id>/', views.AdminUserDetailView.as_view(), name='api_admin_users_detail'),
    path('admin/logs/', views.AdminActivityLogListView.as_view(), name='api_admin_logs'),
]
