from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView

from apps.api.users.permissions import is_learner_role
from apps.edunova.models import Course, CourseEnrollment, Quiz, Rank, UserBadge, UserCourseProgress
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

        if passed:
            coins_earned = quiz.coins_on_success
            profile = request.user.profile
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
                if enrolled:
                    UserBadge.objects.get_or_create(
                        user=request.user,
                        badge=course.delivered_badge,
                    )

                progress, _ = UserCourseProgress.objects.get_or_create(
                    user=request.user,
                    course=course,
                    defaults={
                        'is_unlocked': True,
                        'unlocked_at': timezone.now(),
                    },
                )
                update_fields = []
                if not progress.is_unlocked:
                    progress.is_unlocked = True
                    progress.unlocked_at = progress.unlocked_at or timezone.now()
                    update_fields.extend(['is_unlocked', 'unlocked_at'])
                if score > progress.best_score:
                    progress.best_score = score
                    update_fields.append('best_score')
                if not progress.is_completed:
                    progress.is_completed = True
                    progress.completed_at = timezone.now()
                    update_fields.extend(['is_completed', 'completed_at'])
                if update_fields:
                    update_fields.append('updated_at')
                    progress.save(update_fields=update_fields)

                next_course = (
                    Course.objects
                    .filter(theme=course.theme, map_order__gt=course.map_order)
                    .order_by('map_order', 'course_id')
                    .first()
                )
                if next_course:
                    next_progress, _ = UserCourseProgress.objects.get_or_create(
                        user=request.user,
                        course=next_course,
                    )
                    if not next_progress.is_unlocked:
                        next_progress.is_unlocked = True
                        next_progress.unlocked_at = timezone.now()
                        next_progress.save(update_fields=['is_unlocked', 'unlocked_at', 'updated_at'])

        return Response({
            'score': score,
            'passed': passed,
            'xp_earned': xp_earned if passed else 0,
            'coins_earned': coins_earned,
        })
