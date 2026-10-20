from django.urls import path
from .views import (
    AnalyticsOverviewView,
    SkillsRadarView,
    ProgressHistoryView,
    FallacyFrequencyView
)

urlpatterns = [
    path('overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('skills-radar/', SkillsRadarView.as_view(), name='skills-radar'),
    path('progress-history/', ProgressHistoryView.as_view(), name='progress-history'),
    path('fallacy-frequency/', FallacyFrequencyView.as_view(), name='fallacy-frequency'),
]
