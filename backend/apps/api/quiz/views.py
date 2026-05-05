from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
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

        course = Course.objects.filter(validating_quiz=quiz).select_related('theme', 'delivered_badge').first()

        if passed:
            with transaction.atomic():
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

                if course:
                    progress, _ = UserCourseProgress.objects.get_or_create(
                        user=request.user,
                        course=course,
                        defaults={'is_unlocked': True},
                    )
                    progress.best_score = max(progress.best_score, score)
                    if not progress.is_unlocked:
                        progress.is_unlocked = True
                        progress.unlocked_at = timezone.now()
                    progress.is_completed = True
                    if progress.completed_at is None:
                        progress.completed_at = timezone.now()
                    progress.save()

                    themed_courses = Course.objects.filter(theme=course.theme)
                    if is_learner_role(role_name):
                        themed_courses = themed_courses.filter(created_by_id=request.user.formateur_id)
                    ordered_ids = list(
                        themed_courses.order_by('map_order', 'course_id').values_list('course_id', flat=True)
                    )
                    try:
                        idx = ordered_ids.index(course.course_id)
                    except ValueError:
                        idx = -1
                    if 0 <= idx < len(ordered_ids) - 1:
                        next_id = ordered_ids[idx + 1]
                        next_prog, _ = UserCourseProgress.objects.get_or_create(
                            user=request.user,
                            course_id=next_id,
                            defaults={'is_unlocked': False},
                        )
                        if not next_prog.is_unlocked:
                            next_prog.is_unlocked = True
                            next_prog.unlocked_at = timezone.now()
                            next_prog.save(update_fields=['is_unlocked', 'unlocked_at', 'updated_at'])

                    enrolled = CourseEnrollment.objects.filter(user=request.user, course=course).exists()
                    if enrolled and course.delivered_badge:
                        UserBadge.objects.get_or_create(
                            user=request.user,
                            badge=course.delivered_badge,
                        )
        elif course:
            progress, _ = UserCourseProgress.objects.get_or_create(
                user=request.user,
                course=course,
                defaults={'is_unlocked': True},
            )
            progress.best_score = max(progress.best_score, score)
            progress.save(update_fields=['best_score', 'updated_at'])

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
