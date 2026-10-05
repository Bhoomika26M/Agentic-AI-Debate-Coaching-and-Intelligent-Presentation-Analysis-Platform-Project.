from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import CustomUser, RoleChoices
from apps.debates.models import DebateTopic, DebateSession
from apps.ai_engine.factory import get_ai_service
from apps.ai_engine.schemas import ArgumentAnalysisResult

class DebatePlatformTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='test_learner',
            email='learner@college.edu',
            password='password123',
            role=RoleChoices.LEARNER
        )
        self.topic = DebateTopic.objects.create(
            title='Universal Basic Income is Essential in the Era of AI',
            category='ECONOMICS',
            difficulty='COLLEGIATE'
        )

    def test_jwt_login(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'test_learner',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'test_learner')

    def test_argument_analysis_endpoint(self):
        response = self.client.post('/api/v1/arguments/analyze/', {
            'argument_text': 'AI judges should replace human judges because algorithms never experience fatigue, which means injustice will be eliminated.'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('toulmin', response.data)
        self.assertIn('scores', response.data)
        self.assertIn('fallacies', response.data)
        self.assertIn('counterarguments', response.data)

    def test_debate_session_and_turn_flow(self):
        # Authenticate client
        self.client.force_authenticate(user=self.user)

        # 1. Create debate session
        session_resp = self.client.post('/api/v1/debates/sessions/', {
            'topic': str(self.topic.id),
            'format': 'OXFORD',
            'user_stance': 'AFFIRMATIVE',
            'ai_stance': 'NEGATIVE',
            'ai_persona': 'Socratic Inquisitor'
        })
        self.assertEqual(session_resp.status_code, status.HTTP_201_CREATED)
        session_id = session_resp.data['id']

        # 2. Submit user turn
        turn_resp = self.client.post(f'/api/v1/debates/sessions/{session_id}/submit-turn/', {
            'argument_text': 'Automation displaces cognitive labor faster than workforce retraining programs can adapt.'
        })
        self.assertEqual(turn_resp.status_code, status.HTTP_200_OK)
        self.assertIn('user_turn', turn_resp.data)
        self.assertIn('ai_turn', turn_resp.data)
        self.assertIn('ai_rebuttal', turn_resp.data)

        # 3. Conclude session
        conclude_resp = self.client.post(f'/api/v1/debates/sessions/{session_id}/conclude/')
        self.assertEqual(conclude_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(conclude_resp.data['status'], 'COMPLETED')

    def test_speech_analysis_endpoint(self):
        response = self.client.post('/api/v1/speech/analyze-audio/', {
            'transcript': 'Honorable judges, you know, we basically must adapt our legal standards. Um, because technology moves rapidly.',
            'duration_seconds': 30
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('wpm', response.data)
        self.assertIn('filler_count', response.data)
        self.assertGreaterEqual(response.data['filler_count'], 2)

    def test_ai_service_layer_direct(self):
        ai = get_ai_service()
        res = ai.analyze_argument('We must regulate autonomous systems before catastrophic proliferation occurs.')
        self.assertIsInstance(res, ArgumentAnalysisResult)
        self.assertTrue(res.toulmin.claim)
        self.assertGreaterEqual(res.scores.overall, 0)
