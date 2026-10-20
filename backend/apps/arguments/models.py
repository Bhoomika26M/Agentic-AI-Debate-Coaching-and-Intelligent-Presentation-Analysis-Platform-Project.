import uuid
from django.db import models
from django.conf import settings

class ArgumentAnalysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='arguments')
    debate_session = models.ForeignKey(
        'debates.DebateSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='argument_analyses',
    )
    raw_text = models.TextField()
    context = models.TextField(blank=True, default='')
    analysis_method = models.CharField(max_length=20, default='rule_based')
    supporting_claims = models.JSONField(default=list, blank=True)
    evidence = models.JSONField(default=list, blank=True)
    reasoning_weaknesses = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)
    improved_argument = models.TextField(blank=True, default='')

    # Toulmin components
    claim = models.TextField()
    grounds = models.TextField()
    warrant = models.TextField()
    backing = models.TextField(blank=True, default='')
    qualifier = models.CharField(max_length=255, default='Universal')
    rebuttal = models.TextField(blank=True, default='')

    # Normalized scores (0 - 100)
    logic_score = models.IntegerField(default=70)
    evidence_score = models.IntegerField(default=70)
    relevance_score = models.IntegerField(default=70)
    persuasiveness_score = models.IntegerField(default=70)
    clarity_score = models.IntegerField(default=70)
    overall_score = models.IntegerField(default=70)

    feedback = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Analysis by {self.user.username} on {self.created_at.strftime('%Y-%m-%d')}"

class LogicalFallacyInstance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis = models.ForeignKey(ArgumentAnalysis, on_delete=models.CASCADE, related_name='fallacies')
    fallacy_type = models.CharField(max_length=100)
    excerpt = models.TextField()
    explanation = models.TextField()
    suggested_correction = models.TextField(blank=True, default='')
    confidence = models.PositiveSmallIntegerField(default=75)

class CounterArgument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis = models.ForeignKey(ArgumentAnalysis, on_delete=models.CASCADE, related_name='counterarguments')
    perspective = models.CharField(max_length=100)
    counter_claim = models.TextField()
    counter_evidence = models.TextField(blank=True, default='')
