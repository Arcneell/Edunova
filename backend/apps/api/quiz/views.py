from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView

from apps.api.users.permissions import is_learner_role
from apps.edunova.models import ActivityLog, Course, CourseEnrollment, Quiz, Rank, UserBadge, UserCourseProgress
from .serializers import QuizPlaySerializer


class QuizPlayView(RetrieveAPIView):
    """GET /api/quizzes/<quiz_id>/play/

    Retourne les questions et réponses du quiz sans le champ `is_correct`
    pour éviter la triche côté client.
    """

    serializer_class = QuizPlaySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'quiz_id'
    lookup_url_kwarg = 'quiz_id'

    def get_queryset(self):
        queryset = Quiz.objects.prefetch_related('questions__answers')
        role_name = getattr(getattr(self.request.user, 'role', None), 'role_name', '')
        if is_learner_role(role_name):
            queryset = queryset.filter(validated_courses__created_by_id=self.request.user.formateur_id)
        return queryset


class QuizSubmitView(APIView):
    """POST /api/quizzes/<quiz_id>/submit/

    Corps attendu :
        { "answers": { "<question_id>": <answer_id>, ... } }

    Calcule le score, et si réussite (score >= min_score_to_pass) :
    - Crédite les pièces et l'XP sur le profil
    - Met à jour le rang
    - Attribue le badge du cours associé si l'utilisateur est inscrit
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        quiz_queryset = Quiz.objects.all()
        role_name = getattr(getattr(request.user, 'role', None), 'role_name', '')
        if is_learner_role(role_name):
            quiz_queryset = quiz_queryset.filter(
                validated_courses__created_by_id=request.user.formateur_id
            )
        quiz = get_object_or_404(quiz_queryset.distinct(), pk=quiz_id)
        answers_input = request.data.get('answers', {})

        questions = list(quiz.questions.prefetch_related('answers').all())
        total = len(questions)

        if total == 0:
            return Response({'detail': 'Ce quiz ne contient aucune question.'}, status=400)

        xp_earned = 0
        correct_count = 0

        for question in questions:
            answer_id = answers_input.get(str(question.question_id))
            if answer_id is not None:
                if question.answers.filter(answer_id=answer_id, is_correct=True).exists():
                    correct_count += 1
                    xp_earned += question.xp_value

        score = int((correct_count / total) * 100)
        passed = score >= quiz.min_score_to_pass
        coins_earned = 0
        rank_up = False
        current_rank = None

        if passed:
            coins_earned = quiz.coins_on_success
            profile = request.user.profile
            old_rank_id = profile.rank_id
            profile.wallet_balance += coins_earned
            profile.total_xp += xp_earned

            new_rank = (
                Rank.objects
                .filter(xp_threshold__lte=profile.total_xp)
                .order_by('-xp_threshold')
                .first()
            )
            if new_rank:
                profile.rank = new_rank
                rank_up = (new_rank.rank_id != old_rank_id)
                current_rank = new_rank
            profile.save()

            # Attribution du badge si le quiz valide un cours et que l'utilisateur est inscrit
            course = (
                Course.objects
                .filter(validating_quiz=quiz)
                .select_related('delivered_badge')
                .first()
            )
            if course:
                enrolled = CourseEnrollment.objects.filter(
                    user=request.user, course=course
                ).exists()
                if enrolled and course.delivered_badge:
                    UserBadge.objects.get_or_create(
                        user=request.user,
                        badge=course.delivered_badge,
                    )

        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.Action.QUIZ_SUBMIT,
            metadata={
                'quiz_id': quiz_id,
                'score': score,
                'passed': passed,
                'xp_earned': xp_earned if passed else 0,
                'coins_earned': coins_earned,
            },
        )
        return Response({
            'score': score,
            'passed': passed,
            'xp_earned': xp_earned if passed else 0,
            'coins_earned': coins_earned,
            'rank_up': rank_up,
            'rank': {
                'rank_id': current_rank.rank_id,
                'label': current_rank.label,
                'stars': current_rank.stars,
                'xp_threshold': current_rank.xp_threshold,
            } if current_rank else None,
        })
