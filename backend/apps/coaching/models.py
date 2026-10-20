from django.conf import settings
from django.db import models


class LearningPlan(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='learning_plan',
    )
    current_assessment = models.JSONField(default=dict, blank=True)
    source_session = models.ForeignKey(
        'debates.DebateSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='learning_plans',
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LearningActivity(models.Model):
    plan = models.ForeignKey(
        LearningPlan,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    activity_key = models.CharField(max_length=80)
    priority = models.PositiveSmallIntegerField(default=1)
    skill = models.CharField(max_length=100)
    activity = models.CharField(max_length=300)
    measurable_goal = models.CharField(max_length=300)
    recommended_topic = models.CharField(max_length=300, blank=True, default='')
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['priority', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['plan', 'activity_key'],
                name='unique_activity_key_per_plan',
            ),
        ]
