from django.urls import path
from .views import AnalyzeArgumentView, ArgumentHistoryView, ArgumentDetailView

urlpatterns = [
    path('analyze/', AnalyzeArgumentView.as_view(), name='argument-analyze'),
    path('history/', ArgumentHistoryView.as_view(), name='argument-history'),
    path('<uuid:pk>/', ArgumentDetailView.as_view(), name='argument-detail'),
]
