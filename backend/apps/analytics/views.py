from collections import Counter

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.arguments.models import ArgumentAnalysis
from apps.coaching.models import LearningPlan
from apps.debates.models import DebateSession
from apps.speech_pres.models import SpeechSession


def _overview_data(user):
    all_sessions = DebateSession.objects.filter(user=user)
    completed = list(
        all_sessions.filter(status='COMPLETED')
        .order_by('-completed_at')
        .prefetch_related('turns')
        [:20]
    )
    recent = list(
        all_sessions.select_related('topic')
        .order_by('-started_at')[:5]
    )
    scored = [session for session in completed if session.overall_score is not None]
    average = (
        round(sum(session.overall_score for session in scored) / len(scored), 1)
        if scored else None
    )
    progress_history = [
        {
            'round': f'Debate {index}',
            'session_id': str(session.pk),
            'score': session.overall_score,
            'logic': session.evaluation.get('scores', {}).get('logic'),
            'evidence': session.evaluation.get('scores', {}).get('evidence'),
            'clarity': session.evaluation.get('scores', {}).get('clarity'),
            'persuasiveness': session.evaluation.get('scores', {}).get('persuasiveness'),
            'rebuttal_effectiveness': session.evaluation.get('rebuttal_effectiveness'),
        }
        for index, session in enumerate(reversed(scored[-10:]), start=1)
    ]

    recent_analyses = list(
        ArgumentAnalysis.objects
        .filter(user=user)
        .order_by('-created_at')
        .prefetch_related('fallacies')[:10]
    )
    argument_trend = [
        {
            'round': f'Analysis {index}',
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
    recommendations = []
    for session in completed:
        evaluation = session.evaluation or {}
        for item in evaluation.get('fallacies', []):
            fallacy_counts[item.get('type', 'Unspecified')] += item.get('count', 1)
        recommendations.extend(evaluation.get('recommendations', []))
    recommendations = list(dict.fromkeys(recommendations))[:5]
    plan = (
        LearningPlan.objects.filter(user=user)
        .prefetch_related('activities')
        .first()
    )
    activities = list(plan.activities.all()) if plan else []

    return {
        'total_debates': all_sessions.count(),
        'completed_debates': all_sessions.filter(status='COMPLETED').count(),
        'total_argument_analyses': ArgumentAnalysis.objects.filter(user=user).count(),
        'avg_score': average,
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
    }


class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_overview_data(request.user))


class SkillsRadarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = list(
            DebateSession.objects.filter(user=request.user, status='COMPLETED')
            .order_by('-completed_at')[:20]
        )
        dimensions = {
            'Formal Logic': ('logic', []),
            'Evidence Grounding': ('evidence', []),
            'Persuasive Rhetoric': ('persuasiveness', []),
            'Rebuttal Responsiveness Estimate': ('rebuttal_effectiveness', []),
            'Clarity': ('clarity', []),
        }
        for session in sessions:
            evaluation = session.evaluation or {}
            scores = evaluation.get('scores', {})
            for label, (key, values) in dimensions.items():
                value = scores.get(key)
                if value is None and key == 'rebuttal_effectiveness':
                    value = evaluation.get(key)
                if isinstance(value, (int, float)):
                    values.append(value)
        return Response([
            {'subject': label, 'score': round(sum(values) / len(values))}
            for label, (_key, values) in dimensions.items()
            if values
        ])


class ProgressHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_overview_data(request.user)['progress_history'])


class FallacyFrequencyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_overview_data(request.user)['common_fallacies'])
