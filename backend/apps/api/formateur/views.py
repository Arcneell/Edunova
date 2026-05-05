from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.users.permissions import IsFormateur
from apps.edunova.models import Answer, Course, CourseEnrollment, Question, Quiz, UserBadge
from .serializers import (
    FormateurAnswerSerializer,
    FormateurCourseSerializer,
    FormateurQuestionSerializer,
    FormateurQuizSerializer,
    LearnerStatSerializer,
)

FORMATEUR_PERMISSIONS = [IsAuthenticated, IsFormateur]


# ── Cours ──────────────────────────────────────────────────────────────────────

class FormateurCourseListCreateView(APIView):
    """GET  /api/formateur/courses/  — liste de tous les cours
    POST /api/formateur/courses/  — créer un cours
    """

    permission_classes = FORMATEUR_PERMISSIONS

    def get(self, request):
        courses = Course.objects.select_related(
            'theme', 'validating_quiz', 'delivered_badge'
        )
        return Response(FormateurCourseSerializer(courses, many=True).data)

    def post(self, request):
        serializer = FormateurCourseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FormateurCourseDetailView(APIView):
    """GET / PATCH / DELETE /api/formateur/courses/<course_id>/"""

    permission_classes = FORMATEUR_PERMISSIONS

    def _get_course(self, course_id):
        return get_object_or_404(Course, pk=course_id)

    def get(self, request, course_id):
        return Response(FormateurCourseSerializer(self._get_course(course_id)).data)

    def patch(self, request, course_id):
        course = self._get_course(course_id)
        serializer = FormateurCourseSerializer(course, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, course_id):
        self._get_course(course_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FormateurCourseStatsView(APIView):
    """GET /api/formateur/courses/<course_id>/stats/

    Statistiques des apprenants inscrits : XP, rang, badge obtenu ou non.
    """

    permission_classes = FORMATEUR_PERMISSIONS

    def get(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)

        enrollments = (
            CourseEnrollment.objects
            .filter(course=course)
            .select_related('user__profile__rank')
        )

        badge_ids: set = set()
        if course.delivered_badge_id:
            badge_ids = set(
                UserBadge.objects
                .filter(badge_id=course.delivered_badge_id)
                .values_list('user_id', flat=True)
            )

        serializer = LearnerStatSerializer(
            enrollments, many=True, context={'badge_ids': badge_ids}
        )
        data = serializer.data
        return Response({
            'course_id': course.course_id,
            'course_title': course.course_title,
            'enrolled_count': len(data),
            'learners': data,
        })


# ── Quiz ───────────────────────────────────────────────────────────────────────

class FormateurQuizListCreateView(APIView):
    """GET  /api/formateur/quizzes/  — liste des quiz du formateur
    POST /api/formateur/quizzes/  — créer un quiz
    """

    permission_classes = FORMATEUR_PERMISSIONS

    def get(self, request):
        quizzes = Quiz.objects.all()
        return Response(FormateurQuizSerializer(quizzes, many=True).data)

    def post(self, request):
        serializer = FormateurQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FormateurQuizDetailView(APIView):
    """GET / PATCH / DELETE /api/formateur/quizzes/<quiz_id>/"""

    permission_classes = FORMATEUR_PERMISSIONS

    def _get_own_quiz(self, request, quiz_id):
        return get_object_or_404(Quiz, pk=quiz_id, created_by=request.user)

    def get(self, request, quiz_id):
        return Response(FormateurQuizSerializer(self._get_own_quiz(request, quiz_id)).data)

    def patch(self, request, quiz_id):
        quiz = self._get_own_quiz(request, quiz_id)
        serializer = FormateurQuizSerializer(quiz, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, quiz_id):
        self._get_own_quiz(request, quiz_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Questions ──────────────────────────────────────────────────────────────────

class FormateurQuestionListCreateView(APIView):
    """GET  /api/formateur/quizzes/<quiz_id>/questions/
    POST /api/formateur/quizzes/<quiz_id>/questions/
    """

    permission_classes = FORMATEUR_PERMISSIONS

    def get(self, request, quiz_id):
        get_object_or_404(Quiz, pk=quiz_id)
        questions = Question.objects.filter(quiz_id=quiz_id)
        return Response(FormateurQuestionSerializer(questions, many=True).data)

    def post(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, pk=quiz_id, created_by=request.user)
        serializer = FormateurQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(quiz=quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FormateurQuestionDetailView(APIView):
    """PATCH / DELETE /api/formateur/questions/<question_id>/"""

    permission_classes = FORMATEUR_PERMISSIONS

    def _get_own_question(self, request, question_id):
        return get_object_or_404(Question, pk=question_id, quiz__created_by=request.user)

    def patch(self, request, question_id):
        question = self._get_own_question(request, question_id)
        serializer = FormateurQuestionSerializer(question, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, question_id):
        self._get_own_question(request, question_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Réponses ───────────────────────────────────────────────────────────────────

class FormateurAnswerListCreateView(APIView):
    """GET  /api/formateur/questions/<question_id>/answers/
    POST /api/formateur/questions/<question_id>/answers/
    """

    permission_classes = FORMATEUR_PERMISSIONS

    def get(self, request, question_id):
        get_object_or_404(Question, pk=question_id)
        answers = Answer.objects.filter(question_id=question_id)
        return Response(FormateurAnswerSerializer(answers, many=True).data)

    def post(self, request, question_id):
        question = get_object_or_404(Question, pk=question_id, quiz__created_by=request.user)
        serializer = FormateurAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(question=question)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FormateurAnswerDetailView(APIView):
    """PATCH / DELETE /api/formateur/answers/<answer_id>/"""

    permission_classes = FORMATEUR_PERMISSIONS

    def _get_own_answer(self, request, answer_id):
        return get_object_or_404(Answer, pk=answer_id, question__quiz__created_by=request.user)

    def patch(self, request, answer_id):
        answer = self._get_own_answer(request, answer_id)
        serializer = FormateurAnswerSerializer(answer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, answer_id):
        self._get_own_answer(request, answer_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
