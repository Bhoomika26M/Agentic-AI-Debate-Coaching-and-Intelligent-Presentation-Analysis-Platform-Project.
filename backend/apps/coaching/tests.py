from django.test import TestCase
from rest_framework.test import APIClient

from apps.debates.models import DebateSession
from apps.users.models import CustomUser

from .models import LearningActivity, LearningPlan


def completed_session(user, scores, fallacies=None, topic='Practice resolution'):
    return DebateSession.objects.create(
        user=user,
        custom_topic_title=topic,
        user_stance='AFFIRMATIVE',
        ai_stance='NEGATIVE',
        status='COMPLETED',
        overall_score=round(sum(scores.values()) / len(scores)),
        evaluation={
            'overall_score': round(sum(scores.values()) / len(scores)),
            'scores': scores,
            'fallacies': fallacies or [],
            'recommendations': ['Add a cited source for the main claim.'],
            'strengths': [],
            'weaknesses': [],
        },
    )


class PersonalizedLearningPlanTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username='learner', password='password')
        self.other = CustomUser.objects.create_user(username='someone_else', password='password')
        self.client.force_authenticate(self.user)

    def test_plan_uses_real_scores_and_updates_activity_progress(self):
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

    def test_refresh_adapts_without_resetting_matching_completion(self):
        completed_session(
            self.user,
            {'clarity': 70, 'relevance': 60, 'evidence': 40, 'logic': 50, 'persuasiveness': 65},
        )
        first_plan = self.client.get('/api/v1/coaching/learning-plan/').data
        evidence_activity = next(item for item in first_plan['activities'] if item['skill'] == 'Evidence usage')
        self.client.patch(
            f"/api/v1/coaching/learning-plan/activities/{evidence_activity['id']}/",
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

    def test_recommendations_are_empty_before_performance_data(self):
        response = self.client.get('/api/v1/coaching/recommendations/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['has_data'])
        self.assertEqual(response.data['recommendations'], [])

    def test_plan_and_activity_access_require_owner_authentication(self):
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
