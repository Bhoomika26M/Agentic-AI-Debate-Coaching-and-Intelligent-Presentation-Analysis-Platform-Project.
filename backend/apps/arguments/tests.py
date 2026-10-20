from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch

from apps.ai_engine.argument_analysis import (
    DEFAULT_SCORE_WEIGHTS,
    analyze_argument_rule_based,
    calculate_overall_score,
)
from apps.ai_engine.mock_service import MockAIService
from apps.users.models import CustomUser
from .models import ArgumentAnalysis


class RuleBasedArgumentAnalysisTests(TestCase):
    def test_detects_the_eight_supported_fallacy_patterns(self):
        examples = {
            'Ad Hominem': 'Your opponent is an idiot, so the proposal is wrong.',
            'Straw Man': 'So you want to ban all public transportation.',
            'False Dilemma': 'Either we reject this plan or accept failure; there is no other alternative.',
            'Slippery Slope': 'If we adopt this rule, it will inevitably lead to restrictions and then total control.',
            'Appeal to Authority': 'This policy is right because a famous actor says it is right.',
            'Circular Reasoning': 'The policy is correct because the policy is correct.',
            'Hasty Generalization': 'One example proves the point; therefore everyone will fail.',
            'Red Herring': "Instead of addressing the budget, let's talk about a different issue.",
        }
        for fallacy_name, argument in examples.items():
            with self.subTest(fallacy=fallacy_name):
                result = analyze_argument_rule_based(argument)
                self.assertIn(fallacy_name, [item.type for item in result.fallacies])
                item = next(item for item in result.fallacies if item.type == fallacy_name)
                self.assertIn(item.excerpt, argument)
                self.assertGreaterEqual(item.confidence, 0)
                self.assertLessEqual(item.confidence, 100)
                self.assertTrue(item.correction)

    def test_does_not_flag_a_neutral_argument(self):
        result = analyze_argument_rule_based(
            'A survey of 500 students found that the library needs longer hours. '
            'The university should consider a pilot extension and evaluate usage.'
        )
        self.assertEqual(result.fallacies, [])
        self.assertIn('not proof', result.feedback)

    def test_scores_are_bounded_and_weighted_from_dimensions(self):
        result = analyze_argument_rule_based(
            'The policy should be tested because survey data from 400 residents supports a pilot.',
            context='The policy should improve public transit.',
        )
        score_dimensions = {
            'clarity': result.scores.clarity,
            'relevance': result.scores.relevance,
            'evidence': result.scores.evidence,
            'logic': result.scores.logic,
            'persuasiveness': result.scores.persuasiveness,
        }
        self.assertEqual(result.scores.overall, calculate_overall_score(score_dimensions))
        self.assertEqual(set(DEFAULT_SCORE_WEIGHTS), set(score_dimensions))
        for score in [*score_dimensions.values(), result.scores.overall]:
            self.assertGreaterEqual(score, 0)
            self.assertLessEqual(score, 100)


class ArgumentAnalysisAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='analysis_owner',
            password='password123',
        )
        self.other_user = CustomUser.objects.create_user(
            username='other_owner',
            password='password123',
        )
        self.client.force_authenticate(user=self.user)
        self.analysis_service = patch(
            'apps.arguments.views.get_ai_service',
            return_value=MockAIService(),
        )
        self.analysis_service.start()
        self.addCleanup(self.analysis_service.stop)

    def test_analysis_is_saved_and_returned_with_structured_fields(self):
        response = self.client.post('/api/v1/arguments/analyze/', {
            'argument_text': 'One example proves it; therefore everyone will fail.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['id'])
        self.assertEqual(response.data['analysis_method'], 'rule_based')
        self.assertEqual(response.data['fallacies'][0]['type'], 'Hasty Generalization')
        self.assertTrue(ArgumentAnalysis.objects.filter(user=self.user).exists())
        self.assertEqual(response.data['raw_text'], 'One example proves it; therefore everyone will fail.')
        self.assertEqual(len(response.data['scores']), 6)

    def test_invalid_and_empty_arguments_are_rejected(self):
        for body in ({}, {'argument_text': '   '}):
            with self.subTest(body=body):
                response = self.client.post(
                    '/api/v1/arguments/analyze/',
                    body,
                    format='json',
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fallacy_endpoint_returns_uncertain_no_match_result(self):
        response = self.client.post('/api/v1/arguments/fallacies/', {
            'argument_text': 'A survey reported three outcomes; the proposal should be tested in a limited pilot.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['fallacies'], [])
        self.assertTrue(response.data['uncertain'])

    def test_history_and_detail_are_limited_to_the_authenticated_owner(self):
        response = self.client.post('/api/v1/arguments/analyze/', {
            'argument_text': 'The policy is correct because the policy is correct.',
        }, format='json')
        report_id = response.data['id']
        self.assertEqual(self.client.get('/api/v1/arguments/history/').data[0]['id'], report_id)

        self.client.force_authenticate(user=self.other_user)
        self.assertEqual(
            self.client.get(f'/api/v1/arguments/{report_id}/').status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.get('/api/v1/arguments/history/').data, [])

# Create your tests here.
