from django.urls import path
from .views import (
    DebateTopicListCreateView,
    DebateSessionListCreateView,
    DebateSessionDetailView,
    SubmitTurnView,
    ConcludeSessionView
)

urlpatterns = [
    path('topics/', DebateTopicListCreateView.as_view(), name='topic-list-create'),
    path('sessions/', DebateSessionListCreateView.as_view(), name='session-list-create'),
    path('sessions/<uuid:pk>/', DebateSessionDetailView.as_view(), name='session-detail'),
    path('sessions/<uuid:pk>/submit-turn/', SubmitTurnView.as_view(), name='submit-turn'),
    path('sessions/<uuid:pk>/conclude/', ConcludeSessionView.as_view(), name='conclude-session'),
]
