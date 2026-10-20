from django.urls import path
from .views import (
    AnalyzeSpeechView,
    AnalyzeDeckView,
    SpeechSessionListView,
    PresentationSessionListView
)

urlpatterns = [
    path('analyze-audio/', AnalyzeSpeechView.as_view(), name='analyze-speech'),
    path('analyze-deck/', AnalyzeDeckView.as_view(), name='analyze-deck'),
    path('speech-sessions/', SpeechSessionListView.as_view(), name='speech-sessions-list'),
    path('presentation-sessions/', PresentationSessionListView.as_view(), name='presentation-sessions-list'),
]
