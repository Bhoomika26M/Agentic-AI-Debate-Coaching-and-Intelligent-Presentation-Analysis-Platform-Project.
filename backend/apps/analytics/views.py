from collections import Counter

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.arguments.models import ArgumentAnalysis
from apps.coaching.models import LearningPlan
from apps.debates.models import DebateSession
from apps.speech_pres.models import SpeechSession


class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        all_sessions = DebateSession.objects.filter(user=user)
        completed = list(
            all_sessions.filter(status='COMPLETED').order_by('-completed_at')[:20]
        )
        recent = list(all_sessions.select_related('topic').order_by('-started_at')[:5])
        scored = [session for session in completed if session.overall_score is not None]
        avg_score = (
            round(sum(session.overall_score for session in scored) / len(scored), 1)
            if scored else None
        )
        progress_history = []
        for index, session in enumerate(reversed(scored[-10:]), start=1):
            scores = session.evaluation.get('scores', {})
            progress_history.append({
                'round': f"Debate {index}",
                'session_id': str(session.pk),
                'score': session.overall_score,
                'logic': scores.get('logic'),
                'evidence': scores.get('evidence'),
                'clarity': scores.get('clarity'),
                'persuasiveness': scores.get('persuasiveness'),
                'rebuttal_effectiveness': session.evaluation.get('rebuttal_effectiveness'),
            })

        recent_analyses = list(
            ArgumentAnalysis.objects
            .filter(user=user)
            .order_by('-created_at')[:10]
        )
        argument_trend = [
            {
                'round': f"Analysis {index}",
                'score': analysis.overall_score,
                'logic': analysis.logic_score,
                'evidence': analysis.evidence_score,
                'clarity': analysis.clarity_score,
                'relevance': analysis.relevance_score,
                'persuasiveness': analysis.persuasiveness_score,
            }
            for index, analysis in enumerate(reversed(recent_analyses), start=1)
        ]
        fallacy_counts = Counter(
            fallacy.fallacy_type
            for analysis in recent_analyses
            for fallacy in analysis.fallacies.all()
        )
        for session in completed:
            for fallacy in session.evaluation.get('fallacies', []):
                fallacy_counts[fallacy.get('type', 'Unspecified')] += fallacy.get('count', 1)

        plan = LearningPlan.objects.filter(user=user).prefetch_related('activities').first()
        activities = list(plan.activities.all()) if plan else []
        recommendations = []
        for session in completed:
            recommendations.extend(session.evaluation.get('recommendations', []))
        recommendations = list(dict.fromkeys(recommendations))[:5]

        return Response({
            'total_debates': all_sessions.count(),
            'completed_debates': len(completed),
            'avg_score': avg_score,
            'latest_score': scored[0].overall_score if scored else None,
            'speeches_analyzed': SpeechSession.objects.filter(user=user).count(),
            'recent_sessions': [
                {
                    'id': str(session.pk),
                    'topic': session.topic_title,
                    'status': session.status,
                    'score': session.overall_score,
                    'started_at': session.started_at,
                    'completed_at': session.completed_at,
                    'difficulty': session.get_difficulty_display(),
                }
                for session in recent
            ],
            'progress_history': progress_history,
            'argument_quality_trend': argument_trend,
            'common_fallacies': [
                {'name': name, 'count': count}
                for name, count in fallacy_counts.most_common()
            ],
            'rebuttal_effectiveness': [
                {
                    'session_id': str(session.pk),
                    'score': session.evaluation.get('rebuttal_effectiveness'),
                }
                for session in reversed(completed)
                if session.evaluation.get('rebuttal_effectiveness') is not None
            ],
            'coaching_recommendations': recommendations,
            'learning_plan_progress': {
                'completed': sum(activity.completed for activity in activities),
                'total': len(activities),
            },
        })


class SkillsRadarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = DebateSession.objects.filter(
            user=request.user,
            status='COMPLETED',
        ).order_by('-completed_at')[:20]
        score_values = {
            'Formal Logic': [],
            'Evidence Grounding': [],
            'Persuasive Rhetoric': [],
            'Rebuttal Accuracy': [],
            'Clarity': [],
        }
        for session in sessions:
            values = session.evaluation.get('scores', {})
            for label, key in (
                ('Formal Logic', 'logic'),
                ('Evidence Grounding', 'evidence'),
                ('Persuasive Rhetoric', 'persuasiveness'),
                ('Rebuttal Accuracy', 'rebuttal_effectiveness'),
                ('Clarity', 'clarity'),
            ):
                score = values.get(key)
                if score is None and key == 'rebuttal_effectiveness':
                    score = session.evaluation.get(key)
                if isinstance(score, (int, float)):
                    score_values[label].append(score)
        return Response([
            {'subject': label, 'score': round(sum(values) / len(values)) if values else None}
            for label, values in score_values.items()
            if values
        ])


class ProgressHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsOverviewView().get(request).data
        return Response(data['progress_history'])


class FallacyFrequencyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsOverviewView().get(request).data
        return Response(data['common_fallacies'])
