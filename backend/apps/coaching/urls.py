from django.urls import path
from .views import (
    CoachingRecommendationsView,
    DrillsListView,
    LearningActivityUpdateView,
    LearningPlanView,
    SubmitDrillView,
)

urlpatterns = [
    path('recommendations/', CoachingRecommendationsView.as_view(), name='coaching-recommendations'),
    path('learning-plan/', LearningPlanView.as_view(), name='learning-plan'),
    path('learning-plan/activities/<int:pk>/', LearningActivityUpdateView.as_view(), name='learning-activity-update'),
    path('drills/', DrillsListView.as_view(), name='coaching-drills'),
    path('drills/<int:pk>/submit/', SubmitDrillView.as_view(), name='submit-drill'),
]
