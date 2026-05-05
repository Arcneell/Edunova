from django.urls import path

from .views import CourseDetailView, CourseEnrollView, CourseListView

urlpatterns = [
    path('', CourseListView.as_view(), name='course-list'),
    path('<int:course_id>/', CourseDetailView.as_view(), name='course-detail'),
    path('<int:course_id>/enroll/', CourseEnrollView.as_view(), name='course-enroll'),
]
