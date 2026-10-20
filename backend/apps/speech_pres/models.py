import uuid
from django.db import models
from django.conf import settings

class SpeechSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='speeches')
    title = models.CharField(max_length=255, default='Speech Practice Session')
    audio_file = models.FileField(upload_to='speeches/', null=True, blank=True)
    transcript = models.TextField()
    duration_seconds = models.FloatField(default=0.0)
    words_per_minute = models.IntegerField(default=140)
    filler_word_count = models.IntegerField(default=0)
    filler_word_breakdown = models.JSONField(default=dict)
    pacing_score = models.IntegerField(default=80)
    articulation_score = models.IntegerField(default=80)
    overall_score = models.IntegerField(default=80)
    feedback = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Speech by {self.user.username} ({self.created_at.strftime('%Y-%m-%d')})"

class PresentationSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='presentations')
    title = models.CharField(max_length=255, default='Presentation Deck Review')
    deck_file = models.FileField(upload_to='presentations/', null=True, blank=True)
    total_slides = models.IntegerField(default=1)
    overall_score = models.IntegerField(default=80)
    summary = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Presentation '{self.title}' ({self.user.username})"

class SlideEvaluation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(PresentationSession, on_delete=models.CASCADE, related_name='slides')
    slide_number = models.IntegerField()
    headline = models.CharField(max_length=255, blank=True, default='')
    word_count = models.IntegerField(default=0)
    density_rating = models.CharField(max_length=20, default='OPTIMAL') # OPTIMAL, TOO_DENSE, TOO_SPARSE
    visual_structure_score = models.IntegerField(default=85)
    clarity_score = models.IntegerField(default=85)
    critique = models.TextField(blank=True, default='')
    recommendation = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['slide_number']
