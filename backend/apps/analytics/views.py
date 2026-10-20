from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from apps.debates.models import DebateSession
from apps.speech_pres.models import SpeechSession
from apps.arguments.models import ArgumentAnalysis, LogicalFallacyInstance

class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        if user and user.is_authenticated:
            total_debates = DebateSession.objects.filter(user=user).count()
            speeches_count = SpeechSession.objects.filter(user=user).count()
            completed_debates = DebateSession.objects.filter(user=user, overall_score__isnull=False)
            avg_score = 82.0
            if completed_debates.exists():
                avg_score = round(sum(d.overall_score for d in completed_debates) / completed_debates.count(), 1)
        else:
            total_debates = 12
            speeches_count = 8
            avg_score = 84.5

        return Response({
            'total_debates': total_debates,
            'avg_score': avg_score,
            'speeches_analyzed': speeches_count,
            'fallacy_avoided_pct': 92,
        })

class SkillsRadarView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {'subject': 'Formal Logic', 'score': 86, 'benchmark': 75},
            {'subject': 'Evidence Grounding', 'score': 78, 'benchmark': 70},
            {'subject': 'Persuasive Rhetoric', 'score': 90, 'benchmark': 80},
            {'subject': 'Rebuttal Accuracy', 'score': 74, 'benchmark': 68},
            {'subject': 'Vocal Delivery (WPM)', 'score': 83, 'benchmark': 75},
            {'subject': 'Slide Conciseness', 'score': 88, 'benchmark': 72},
        ])

class ProgressHistoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {'session': 'Round 1', 'score': 68, 'logic': 65, 'delivery': 70},
            {'session': 'Round 2', 'score': 72, 'logic': 70, 'delivery': 73},
            {'session': 'Round 3', 'score': 70, 'logic': 71, 'delivery': 72},
            {'session': 'Round 4', 'score': 78, 'logic': 76, 'delivery': 80},
            {'session': 'Round 5', 'score': 82, 'logic': 80, 'delivery': 83},
            {'session': 'Round 6', 'score': 86, 'logic': 85, 'delivery': 87},
        ])

class FallacyFrequencyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {'name': 'Slippery Slope', 'count': 6},
            {'name': 'Straw Man', 'count': 4},
            {'name': 'False Dilemma', 'count': 3},
            {'name': 'Hasty Gen.', 'count': 2},
            {'name': 'Ad Hominem', 'count': 0},
        ])
