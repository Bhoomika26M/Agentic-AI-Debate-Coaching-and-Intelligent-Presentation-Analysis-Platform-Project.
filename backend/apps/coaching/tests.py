from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.ai_engine.mock_service import MockAIService
from apps.debates.models import DebateSession
from apps.users.models import CustomUser

from .models import LearningActivity, LearningPlan


def completed_session(user, scores, fallacies=None):
    overall = round(sum(scores.values()) / len(scores))
    return DebateSession.objects.create(
        user=user,
        custom_topic_title='Practice resolution',
        user_stance='AFFIRMATIVE',
        ai_stance='NEGATIVE',
        status='COMPLETED',
        overall_score=overall,
        evaluation={
            'overall_score': overall,
            'scores': scores,
            'fallacies': fallacies or [],
            'recommendations': ['Add a cited source for the main claim.'],
        },
    )


class PersonalizedLearningPlanTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username='learner', password='password')
        self.other = CustomUser.objects.create_user(username='someone_else', password='password')
        self.client.force_authenticate(self.user)
        patcher = patch(
            'apps.coaching.views.get_ai_service',
            return_value=MockAIService(),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_plan_uses_saved_scores_and_tracks_activity_completion(self):
        completed_session(
            self.user,
            {'clarity': 78, 'relevance': 75, 'evidence': 42, 'logic': 55, 'persuasiveness': 66},
            [{'type': 'Hasty Generalization', 'count': 1}],
        )
        response = self.client.get('/api/v1/coaching/learning-plan/')
        self.assertEqual(response.status_code, 200)
        plan = response.data
        self.assertEqual(plan['current_assessment']['average_scores']['evidence'], 42)
        self.assertGreaterEqual(len(plan['activities']), 2)
        activity = plan['activities'][0]
        updated = self.client.patch(
            f"/api/v1/coaching/learning-plan/activities/{activity['id']}/",
            {'completed': True},
            format='json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(next(item for item in updated.data['activities'] if item['id'] == activity['id'])['completed'])

    def test_refresh_adapts_plan_and_preserves_matching_activity_completion(self):
        completed_session(
            self.user,
            {'clarity': 70, 'relevance': 60, 'evidence': 40, 'logic': 50, 'persuasiveness': 65},
        )
        plan = self.client.get('/api/v1/coaching/learning-plan/').data
        evidence = next(item for item in plan['activities'] if item['skill'] == 'Evidence usage')
        self.client.patch(
            f"/api/v1/coaching/learning-plan/activities/{evidence['id']}/",
            {'completed': True},
            format='json',
        )
        completed_session(
            self.user,
            {'clarity': 68, 'relevance': 55, 'evidence': 45, 'logic': 52, 'persuasiveness': 63},
        )
        refreshed = self.client.post('/api/v1/coaching/learning-plan/', {}, format='json')
        evidence_after = next(item for item in refreshed.data['activities'] if item['skill'] == 'Evidence usage')
        self.assertTrue(evidence_after['completed'])

    def test_recommendations_have_an_explicit_empty_state_without_performance_data(self):
        response = self.client.get('/api/v1/coaching/recommendations/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['has_data'])
        self.assertEqual(response.data['recommendations'], [])

    def test_plan_and_activity_access_are_authenticated_and_owner_scoped(self):
        plan = LearningPlan.objects.create(user=self.other)
        activity = LearningActivity.objects.create(
            plan=plan,
            activity_key='evidence',
            skill='Evidence',
            activity='Practice source checks',
            measurable_goal='Check two sources',
        )
        response = self.client.patch(
            f'/api/v1/coaching/learning-plan/activities/{activity.pk}/',
            {'completed': True},
            format='json',
        )
        self.assertEqual(response.status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/v1/coaching/learning-plan/').status_code, 401)

    def test_drill_submission_returns_real_service_feedback(self):
        response = self.client.post(
            '/api/v1/coaching/drills/1/submit/',
            {'submission': 'The stated conclusion does not follow unless the causal link is supported.'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(response.data['analysis_method'], ['rule_based', 'gemini'])
        self.assertGreaterEqual(response.data['score'], 0)
        self.assertLessEqual(response.data['score'], 100)
