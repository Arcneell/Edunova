from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('edunova', '0002_alter_course_delivered_badge_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserCourseProgress',
            fields=[
                ('progress_id', models.BigAutoField(db_column='progress_id', primary_key=True, serialize=False)),
                ('is_unlocked', models.BooleanField(db_column='is_unlocked', default=False, verbose_name='débloqué')),
                ('is_completed', models.BooleanField(db_column='is_completed', default=False, verbose_name='complété')),
                ('best_score', models.PositiveSmallIntegerField(db_column='best_score', default=0, validators=[MinValueValidator(0), MaxValueValidator(100)], verbose_name='meilleur score')),
                ('unlocked_at', models.DateTimeField(blank=True, null=True, verbose_name='débloqué le')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='complété le')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='mis à jour le')),
                ('course', models.ForeignKey(db_column='course_id', on_delete=django.db.models.deletion.CASCADE, related_name='user_progress', to='edunova.course')),
                ('user', models.ForeignKey(db_column='user_id', on_delete=django.db.models.deletion.CASCADE, related_name='course_progress', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'progression cours utilisateur',
                'verbose_name_plural': 'progressions cours utilisateur',
                'db_table': 'user_course_progress',
            },
        ),
        migrations.AddConstraint(
            model_name='usercourseprogress',
            constraint=models.UniqueConstraint(fields=('user', 'course'), name='uniq_user_course_progress'),
        ),
    ]
