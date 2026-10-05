import uuid
from django.db import models
from django.conf import settings

class DebateFormat(models.TextChoices):
    OXFORD = 'OXFORD', 'Oxford Parliamentary'
    LINCOLN_DOUGLAS = 'LINCOLN_DOUGLAS', 'Lincoln-Douglas'
    PARLIAMENTARY = 'PARLIAMENTARY', 'British Parliamentary'

class StanceChoices(models.TextChoices):
    AFFIRMATIVE = 'AFFIRMATIVE', 'Affirmative'
    NEGATIVE = 'NEGATIVE', 'Negative'

class SessionStatus(models.TextChoices):
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    ABANDONED = 'ABANDONED', 'Abandoned'

class DebateTopic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=100, default='TECHNOLOGY')
    difficulty = models.CharField(max_length=50, default='COLLEGIATE')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class DebateSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='debate_sessions')
    topic = models.ForeignKey(DebateTopic, on_delete=models.SET_NULL, null=True)
    custom_topic_title = models.CharField(max_length=500, blank=True, default='')
    format = models.CharField(max_length=50, choices=DebateFormat.choices, default=DebateFormat.OXFORD)
    user_stance = models.CharField(max_length=20, choices=StanceChoices.choices, default=StanceChoices.AFFIRMATIVE)
    ai_stance = models.CharField(max_length=20, choices=StanceChoices.choices, default=StanceChoices.NEGATIVE)
    ai_persona = models.CharField(max_length=100, default='Socratic Inquisitor')
    status = models.CharField(max_length=20, choices=SessionStatus.choices, default=SessionStatus.IN_PROGRESS)
    overall_score = models.IntegerField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Debate on {self.topic_title} ({self.user.username})"

    @property
    def topic_title(self):
        return self.topic.title if self.topic else self.custom_topic_title

class DebateTurn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(DebateSession, on_delete=models.CASCADE, related_name='turns')
    turn_number = models.IntegerField(default=1)
    speaker = models.CharField(max_length=10) # 'USER' or 'AI'
    transcript = models.TextField()
    turn_score = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['turn_number', 'created_at']
