from django.urls import path

from .views import AICourseGenerateView, AIStatusView

urlpatterns = [
    path('status/', AIStatusView.as_view(), name='ai-status'),
    path('courses/', AICourseGenerateView.as_view(), name='ai-course-generate'),
]
