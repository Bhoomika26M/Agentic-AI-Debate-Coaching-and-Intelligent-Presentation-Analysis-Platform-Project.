import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class RoleChoices(models.TextChoices):
    LEARNER = 'LEARNER', 'Learner'
    COACH = 'COACH', 'Debate Coach'
    EDUCATOR = 'EDUCATOR', 'Educator'
    ADMIN = 'ADMIN', 'Administrator'

class DebateFormatChoices(models.TextChoices):
    OXFORD = 'OXFORD', 'Oxford Style'
    PARLIAMENTARY = 'PARLIAMENTARY', 'British Parliamentary'
    LINCOLN_DOUGLAS = 'LINCOLN_DOUGLAS', 'Lincoln-Douglas'

class ExperienceChoices(models.TextChoices):
    NOVICE = 'NOVICE', 'Novice'
    INTERMEDIATE = 'INTERMEDIATE', 'Collegiate Intermediate'
    ADVANCED = 'ADVANCED', 'Varsity Championship'

class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.LEARNER
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, default='')
    institution = models.CharField(max_length=255, blank=True, default='')
    preferred_debate_format = models.CharField(
        max_length=30,
        choices=DebateFormatChoices.choices,
        default=DebateFormatChoices.OXFORD
    )
    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceChoices.choices,
        default=ExperienceChoices.NOVICE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
