import logging
import re

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.factory import get_ai_service
from apps.debates.models import DebateSession

from .models import LearningActivity, LearningPlan

logger = logging.getLogger(__name__)

DIMENSION_GUIDANCE = {
    'clarity': (
        'Clarity',
        'Practice a 60-second opening with one claim, two reasons, and a one-sentence conclusion.',
        'Deliver three short practice arguments; state the claim in the first sentence.',
        'Should schools require media-literacy classes?',
    ),
    'relevance': (
        'Relevance',
        'For each premise, explain in one sentence how it supports the resolution.',
        'Draft three claim-to-topic links and remove any point that does not support the resolution.',
        'Should cities prioritize public transit over road expansion?',
    ),
    'evidence': (
        'Evidence usage',
        'Practice distinguishing a verifiable source from an unsupported example.',
        'For two claims, find one checkable source each and record source, date, and limitation.',
        'Should governments expand access to renewable energy?',
    ),
    'logic': (
        'Logical consistency',
        'Write the warrant between a premise and conclusion, then test one counterexample.',
        'Complete two claim-evidence-warrant outlines and identify one possible exception for each.',
        'Should schools limit student phone use during class?',
    ),
    'persuasiveness': (
        'Persuasiveness',
        'Answer the strongest opposing point before restating your conclusion.',
        'Give two 90-second speeches that each include a concession and a supported response.',
        'Should community service be required for graduation?',
    ),
}


def _completed_sessions(user):
    return (
        DebateSession.objects
        .filter(user=user, status='COMPLETED')
        .exclude(evaluation={})
        .order_by('-completed_at')
    )


def _score_summary(sessions):
    scores = {}
    for dimension in DIMENSION_GUIDANCE:
        values = [
            session.evaluation.get('scores', {}).get(dimension)
            for session in sessions
        ]
        values = [value for value in values if isinstance(value, (int, float))]
        if values:
            scores[dimension] = round(sum(values) / len(values))
    return scores


def _fallacy_counts(sessions):
    counts = {}
    for session in sessions:
        for item in session.evaluation.get('fallacies', []):
            name = item.get('type')
            if name:
                counts[name] = counts.get(name, 0) + item.get('count', 1)
    return counts


def _recommendation_payload(user):
    sessions = list(_completed_sessions(user)[:5])
    if not sessions:
        return {
            'has_data': False,
            'focus_area': None,
            'rationale': 'Complete a debate with at least one argument to receive recommendations from your saved performance.',
            'strengths': [],
            'weaknesses': [],
            'recommendations': [],
            'recent_debates': 0,
        }

    scores = _score_summary(sessions)
    ranked = sorted(scores.items(), key=lambda item: item[1])
    focus = ranked[0][0] if ranked else None
    fallacies = _fallacy_counts(sessions)
    recommendations = []
    if focus:
        recommendations.append(DIMENSION_GUIDANCE[focus][2])
    if fallacies:
        name, count = max(fallacies.items(), key=lambda item: item[1])
        recommendations.append(f'Review the {count} detected {name} instance(s) and practice correcting the recorded reasoning.')
    for session in sessions:
        recommendations.extend(session.evaluation.get('recommendations', []))
    return {
        'has_data': bool(scores or fallacies),
        'focus_area': DIMENSION_GUIDANCE[focus][0] if focus else None,
        'rationale': (
            f'Based on {len(sessions)} recent completed debate(s)'
            + (f'; average {DIMENSION_GUIDANCE[focus][0].lower()} score is {scores[focus]}/100.' if focus else '.')
        ),
        'strengths': [
            {'skill': DIMENSION_GUIDANCE[key][0], 'score': value}
            for key, value in sorted(scores.items(), key=lambda item: item[1], reverse=True)[:2]
        ],
        'weaknesses': [
            {'skill': DIMENSION_GUIDANCE[key][0], 'score': value}
            for key, value in ranked[:2]
        ],
        'recommendations': list(dict.fromkeys(recommendations))[:5],
        'recent_debates': len(sessions),
        'common_fallacies': [
            {'type': name, 'count': count}
            for name, count in sorted(fallacies.items(), key=lambda item: item[1], reverse=True)
        ],
    }


def _update_learning_plan(user):
    recent = list(_completed_sessions(user)[:5])
    latest = recent[0] if recent else None
    plan, _created = LearningPlan.objects.get_or_create(user=user)
    if latest and plan.source_session_id == latest.pk and plan.activities.exists():
        return plan

    scores = _score_summary(recent)
    activities = []
    for priority, dimension in enumerate(sorted(scores, key=scores.get)[:2], start=1):
        skill, activity, goal, topic = DIMENSION_GUIDANCE[dimension]
        activities.append({
            'activity_key': dimension,
            'priority': priority,
            'skill': skill,
            'activity': activity,
            'measurable_goal': goal,
            'recommended_topic': topic,
        })
    fallacies = _fallacy_counts(recent)
    if fallacies:
        fallacy = max(fallacies, key=fallacies.get)
        key = re.sub(r'[^a-z0-9]+', '-', fallacy.lower()).strip('-')[:70]
        activities.append({
            'activity_key': f'fallacy-{key}',
            'priority': len(activities) + 1,
            'skill': 'Fallacy recognition',
            'activity': f'Review and rewrite a recorded {fallacy} example from your recent debate analyses.',
            'measurable_goal': 'Identify the unsupported inference and write a corrected version in two practice examples.',
            'recommended_topic': 'Should public institutions use algorithmic decision systems?',
        })

    plan.current_assessment = {
        'completed_debates_reviewed': len(recent),
        'average_scores': scores,
        'source_session': str(latest.pk) if latest else None,
        'message': (
            'Assessment is based on recent saved debate analyses.'
            if scores else 'Complete a debate with at least one argument to build a performance-based plan.'
        ),
    }
    plan.source_session = latest
    with transaction.atomic():
        plan.save(update_fields=['current_assessment', 'source_session', 'updated_at'])
        existing = {activity.activity_key: activity for activity in plan.activities.all()}
        active_keys = set()
        for activity_data in activities:
            key = activity_data['activity_key']
            active_keys.add(key)
            current = existing.get(key)
            if current:
                for field, value in activity_data.items():
                    if field != 'activity_key':
                        setattr(current, field, value)
                current.save(update_fields=[
                    'priority', 'skill', 'activity', 'measurable_goal', 'recommended_topic',
                ])
            else:
                LearningActivity.objects.create(plan=plan, **activity_data)
        plan.activities.exclude(activity_key__in=active_keys).delete()
    return plan


def _plan_payload(plan):
    activities = list(plan.activities.all())
    return {
        'id': plan.pk,
        'current_assessment': plan.current_assessment,
        'updated_at': plan.updated_at,
        'completion': {
            'completed': sum(activity.completed for activity in activities),
            'total': len(activities),
        },
        'activities': [
            {
                'id': activity.pk,
                'priority': activity.priority,
                'skill': activity.skill,
                'activity': activity.activity,
                'measurable_goal': activity.measurable_goal,
                'recommended_topic': activity.recommended_topic,
                'completed': activity.completed,
                'completed_at': activity.completed_at,
            }
            for activity in activities
        ],
    }


class CoachingRecommendationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_recommendation_payload(request.user))


class LearningPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_plan_payload(_update_learning_plan(request.user)))

    def post(self, request):
        return Response(_plan_payload(_update_learning_plan(request.user)))


class LearningActivityUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        completed = request.data.get('completed')
        if not isinstance(completed, bool):
            raise serializers.ValidationError({'completed': 'Provide true or false.'})
        activity = LearningActivity.objects.filter(pk=pk, plan__user=request.user).first()
        if activity is None:
            return Response({'detail': 'Learning activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        activity.completed = completed
        activity.completed_at = timezone.now() if completed else None
        activity.save(update_fields=['completed', 'completed_at'])
        return Response(_plan_payload(activity.plan))


DRILLS = [
    {
        'id': 1,
        'type': 'Fallacy spotting',
        'title': 'Test a causal claim',
        'scenario': 'Review an argument you encountered and identify its conclusion, evidence, and any unsupported causal links.',
        'task': 'Name the reasoning gap and write a two-sentence correction without adding unsupported facts.',
        'targetSkill': 'Logical consistency',
    },
    {
        'id': 2,
        'type': 'Rapid rebuttal',
        'title': 'Answer the strongest counterargument',
        'scenario': 'Choose a claim from one of your saved debates and state the strongest opposing point.',
        'task': 'Answer the opposing point directly, then explain how your evidence supports your response.',
        'targetSkill': 'Rebuttal',
    },
    {
        'id': 3,
        'type': 'Evidence grounding',
        'title': 'Strengthen the source link',
        'scenario': 'Select a factual claim and identify the source, date, sample, and a limitation.',
        'task': 'Explain in two or three sentences how the source supports your claim and what it does not establish.',
        'targetSkill': 'Evidence usage',
    },
]


class DrillsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(DRILLS)


class SubmitDrillView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        drill = next((item for item in DRILLS if item['id'] == pk), None)
        if drill is None:
            return Response({'detail': 'Drill not found.'}, status=status.HTTP_404_NOT_FOUND)
        submission = request.data.get('submission', '')
        if not isinstance(submission, str) or not submission.strip():
            return Response({'detail': 'submission is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = get_ai_service().evaluate_rebuttal(
                target_claim=drill['scenario'],
                fallacy_type='unsupported reasoning',
                user_rebuttal=submission.strip(),
                context=drill['task'],
            )
        except Exception:
            logger.exception('Coaching drill evaluation failed.')
            return Response(
                {'detail': 'The coaching response could not be generated. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({
            'score': result.rebuttal_score,
            'strengths': result.strengths,
            'flaws': result.flaws,
            'coachingTip': result.coach_tip,
            'improved_version': result.improved_version,
            'analysis_method': result.analysis_method,
        })
