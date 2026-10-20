from django.urls import path
from .views import (
    AnalyzeArgumentView,
    ArgumentDetailView,
    ArgumentHistoryView,
    DetectFallaciesView,
)

urlpatterns = [
    path('analyze/', AnalyzeArgumentView.as_view(), name='argument-analyze'),
    path('fallacies/', DetectFallaciesView.as_view(), name='argument-fallacies'),
    path('history/', ArgumentHistoryView.as_view(), name='argument-history'),
    path('<uuid:pk>/', ArgumentDetailView.as_view(), name='argument-detail'),
]
