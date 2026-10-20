import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.ai_engine.mock_service import MockAIService
from apps.users.models import CustomUser

from .models import DebateSession, DebateTurn


class DebateSimulationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username='debate_user', password='test-password')
        self.other = CustomUser.objects.create_user(username='other_user', password='test-password')
        self.client.force_authenticate(self.user)
        self.ai = MockAIService()
        patcher = patch('apps.debates.views.get_ai_service', return_value=self.ai)
        patcher.start()
        self.addCleanup(patcher.stop)

    def create_session(self, **extra):
        data = {
            'custom_topic_title': 'Schools should limit phone use during class',
            'user_stance': 'NEGATIVE',
            'difficulty': 'BEGINNER',
            'format': 'OXFORD',
        }
        data.update(extra)
        response = self.client.post('/api/v1/debates/sessions/', data, format='json')
        self.assertEqual(response.status_code, 201)
        return response.data

    def submit(self, session_id, text, turn_id=None):
        data = {'argument_text': text}
        if turn_id:
            data['client_turn_id'] = str(turn_id)
        return self.client.post(
            f'/api/v1/debates/sessions/{session_id}/submit-turn/',
            data,
            format='json',
        )

    def test_session_assigns_the_opposite_position_and_persists_difficulty(self):
        session = self.create_session(ai_stance='NEGATIVE')
        stored = DebateSession.objects.get(pk=session['id'])
        self.assertEqual(stored.user_stance, 'NEGATIVE')
        self.assertEqual(stored.ai_stance, 'AFFIRMATIVE')
        self.assertEqual(stored.difficulty, 'BEGINNER')
        self.assertEqual(session['turns'][0]['speaker'], 'AI')
        self.assertIn('Schools should limit phone use', session['turns'][0]['transcript'])

    def test_affirmative_user_position_assigns_negative_opponent(self):
        session = self.create_session(user_stance='AFFIRMATIVE')
        self.assertEqual(session['user_stance'], 'AFFIRMATIVE')
        self.assertEqual(session['ai_stance'], 'NEGATIVE')

    def test_topic_is_required_to_start_a_session(self):
        response = self.client.post(
            '/api/v1/debates/sessions/',
            {'custom_topic_title': '   ', 'user_stance': 'AFFIRMATIVE'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_turn_response_uses_argument_and_preserves_history(self):
        session = self.create_session()
        first = self.submit(
            session['id'],
            'Students need access to phones to coordinate urgent family responsibilities.',
            uuid.uuid4(),
        )
        self.assertEqual(first.status_code, 200)
        self.assertIn('family responsibilities', first.data['counterargument'])
        self.assertTrue(first.data['follow_up_question'])
        self.assertEqual(first.data['response_method'], 'rule_based')

        with patch.object(self.ai, 'generate_debate_turn', wraps=self.ai.generate_debate_turn) as generator:
            second = self.submit(
                session['id'],
                'Classroom restrictions can include an emergency exception.',
                uuid.uuid4(),
            )
        self.assertEqual(second.status_code, 200)
        history = generator.call_args.kwargs['turn_history']
        self.assertTrue(any('family responsibilities' in turn['transcript'] for turn in history))
        self.assertTrue(any('AI' == turn['speaker'] for turn in history))
        turns = list(DebateTurn.objects.filter(session_id=session['id']).order_by('turn_number'))
        self.assertEqual([turn.speaker for turn in turns], ['AI', 'USER', 'AI', 'USER', 'AI'])
        self.assertTrue(turns[1].analysis['analysis']['toulmin']['claim'])

    def test_idempotency_key_prevents_duplicate_submissions(self):
        session = self.create_session()
        key = uuid.uuid4()
        first = self.submit(session['id'], 'The policy needs a defined emergency exception.', key)
        second = self.submit(session['id'], 'The policy needs a defined emergency exception.', key)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['user_turn']['id'], second.data['user_turn']['id'])
        self.assertEqual(DebateTurn.objects.filter(session_id=session['id']).count(), 3)

    def test_empty_submission_is_rejected(self):
        session = self.create_session()
        response = self.submit(session['id'], '   ')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(DebateTurn.objects.filter(session_id=session['id']).count(), 1)

    def test_ai_failure_does_not_save_a_partial_turn(self):
        session = self.create_session()

        class BrokenService:
            def generate_debate_turn(self, **kwargs):
                raise RuntimeError('provider unavailable')

        with patch('apps.debates.views.get_ai_service', return_value=BrokenService()):
            response = self.submit(session['id'], 'This argument should not be persisted.')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(DebateTurn.objects.filter(session_id=session['id']).count(), 1)

    def test_evaluation_is_derived_from_turn_scores_and_completion_is_idempotent(self):
        session = self.create_session()
        self.submit(
            session['id'],
            'The policy needs an exception. A survey reports that 54% of students use phones for family messages.',
        )
        finished = self.client.post(f"/api/v1/debates/sessions/{session['id']}/conclude/")
        self.assertEqual(finished.status_code, 200)
        self.assertEqual(finished.data['status'], 'COMPLETED')
        self.assertIsNotNone(finished.data['overall_score'])
        self.assertEqual(finished.data['evaluation']['overall_score'], finished.data['overall_score'])
        self.assertTrue(finished.data['evaluation']['scores'])
        repeated = self.client.post(f"/api/v1/debates/sessions/{session['id']}/conclude/")
        self.assertEqual(repeated.data['evaluation'], finished.data['evaluation'])
        rejected = self.submit(session['id'], 'A late argument.')
        self.assertEqual(rejected.status_code, 400)

    def test_user_cannot_access_another_users_session(self):
        private = DebateSession.objects.create(
            user=self.other,
            custom_topic_title='Private resolution',
            user_stance='AFFIRMATIVE',
            ai_stance='NEGATIVE',
        )
        self.assertEqual(self.client.get(f'/api/v1/debates/sessions/{private.pk}/').status_code, 404)
        self.assertEqual(self.submit(private.pk, 'No access.').status_code, 404)
        self.assertEqual(self.client.post(f'/api/v1/debates/sessions/{private.pk}/conclude/').status_code, 404)
