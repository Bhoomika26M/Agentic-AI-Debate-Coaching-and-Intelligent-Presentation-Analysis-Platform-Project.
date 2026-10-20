import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('debates', '0003_debate_difficulty_evaluation_idempotency'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LearningPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('current_assessment', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('source_session', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='learning_plans',
                    to='debates.debatesession',
                )),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='learning_plan',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='LearningActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_key', models.CharField(max_length=80)),
                ('priority', models.PositiveSmallIntegerField(default=1)),
                ('skill', models.CharField(max_length=100)),
                ('activity', models.CharField(max_length=300)),
                ('measurable_goal', models.CharField(max_length=300)),
                ('recommended_topic', models.CharField(blank=True, default='', max_length=300)),
                ('completed', models.BooleanField(default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('plan', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='activities',
                    to='coaching.learningplan',
                )),
            ],
            options={
                'ordering': ['priority', 'id'],
                'constraints': [
                    models.UniqueConstraint(
                        fields=('plan', 'activity_key'),
                        name='unique_activity_key_per_plan',
                    ),
                ],
            },
        ),
    ]
