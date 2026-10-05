from django.urls import path
from .views import CoachingRecommendationsView, DrillsListView, SubmitDrillView

urlpatterns = [
    path('recommendations/', CoachingRecommendationsView.as_view(), name='coaching-recommendations'),
    path('drills/', DrillsListView.as_view(), name='coaching-drills'),
    path('drills/<int:pk>/submit/', SubmitDrillView.as_view(), name='submit-drill'),
]
