from django.test import TestCase
from rest_framework.test import APIClient

from apps.arguments.models import ArgumentAnalysis
from apps.debates.models import DebateSession
from apps.users.models import CustomUser


class DashboardAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username='dashboard_user', password='password')
        self.other = CustomUser.objects.create_user(username='other_dashboard_user', password='password')

    def test_dashboard_uses_only_actual_user_data(self):
        session = DebateSession.objects.create(
            user=self.user,
            custom_topic_title='Should public transit be expanded?',
            user_stance='AFFIRMATIVE',
            ai_stance='NEGATIVE',
            status='COMPLETED',
            overall_score=72,
            evaluation={
                'scores': {'logic': 70, 'evidence': 60, 'clarity': 80, 'persuasiveness': 75},
                'rebuttal_effectiveness': 64,
                'fallacies': [{'type': 'False Dilemma', 'count': 1}],
                'recommendations': ['Add a verified source to the supporting claim.'],
            },
        )
        ArgumentAnalysis.objects.create(
            user=self.user,
            raw_text='A report found a 20% change.',
            claim='A report found a 20% change.',
            grounds='Report',
            warrant='Supports the change.',
            logic_score=70,
            evidence_score=61,
            relevance_score=74,
            persuasiveness_score=69,
            clarity_score=80,
            overall_score=71,
        )
        DebateSession.objects.create(
            user=self.other,
            custom_topic_title='Other private debate',
            user_stance='AFFIRMATIVE',
            ai_stance='NEGATIVE',
            status='COMPLETED',
            overall_score=99,
            evaluation={'scores': {'logic': 99}},
        )

        self.client.force_authenticate(self.user)
        response = self.client.get('/api/v1/analytics/overview/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_debates'], 1)
        self.assertEqual(response.data['completed_debates'], 1)
        self.assertEqual(response.data['latest_score'], 72)
        self.assertEqual(response.data['common_fallacies'], [{'name': 'False Dilemma', 'count': 1}])
        self.assertEqual(response.data['coaching_recommendations'], ['Add a verified source to the supporting claim.'])
        self.assertEqual(response.data['argument_quality_trend'][0]['score'], 71)
        self.assertEqual(response.data['rebuttal_effectiveness'][0]['score'], 64)
        self.assertEqual(response.data['recent_sessions'][0]['id'], str(session.pk))

    def test_dashboard_empty_state_and_authentication(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/v1/analytics/overview/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_debates'], 0)
        self.assertIsNone(response.data['avg_score'])
        self.assertEqual(response.data['recent_sessions'], [])
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/v1/analytics/overview/').status_code, 401)
