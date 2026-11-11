from django.urls import path
from .views import (
    AnalyzeSpeechView,
    AnalyzeDeckView,
    SpeechSessionListView,
    SpeechSessionDetailView,
    PresentationSessionListView,
    PresentationSessionDetailView,
)

urlpatterns = [
    path('analyze-audio/', AnalyzeSpeechView.as_view(), name='analyze-speech'),
    path('analyze-deck/', AnalyzeDeckView.as_view(), name='analyze-deck'),

    # Speech-specific history endpoints used by the learner experience.
    path('sessions/', SpeechSessionListView.as_view(), name='speech-sessions-list-legacy'),
    path('sessions/<uuid:pk>/', SpeechSessionDetailView.as_view(), name='speech-session-detail-legacy'),
    path('speech-sessions/', SpeechSessionListView.as_view(), name='speech-sessions-list'),
    path('speech-sessions/<uuid:pk>/', SpeechSessionDetailView.as_view(), name='speech-session-detail'),

    # Presentation history endpoints used by the analytics/reporting experience.
    path('presentation-sessions/', PresentationSessionListView.as_view(), name='presentation-sessions-list'),
    path('presentation-sessions/<uuid:pk>/', PresentationSessionDetailView.as_view(), name='presentation-session-detail'),
]
