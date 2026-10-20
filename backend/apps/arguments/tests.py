import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ai_engine.argument_analysis import (
    analyze_argument_rule_based,
    calculate_overall_score,
)
from apps.ai_engine.mock_service import MockAIService
from apps.debates.models import DebateSession
from apps.users.models import CustomUser

from .models import ArgumentAnalysis


FALLACY_EXAMPLES = {
    "Ad Hominem": "You are a corrupt liar, so your argument is wrong.",
    "Straw Man": "So you want to ban all public transport, therefore the policy should be rejected.",
    "False Dilemma": "Either we ban the plan or we accept the only option.",
    "Slippery Slope": "If we allow this rule, it will inevitably lead to more restrictions and then end debate.",
    "Appeal to Authority": "This policy is right because a famous actor says it is right.",
    "Circular Reasoning": "The policy is correct because the policy is correct.",
    "Hasty Generalization": "I met one shop owner; therefore everyone should reject the policy.",
    "Red Herring": "Instead of addressing the budget, we should talk about the mayor's clothing.",
}


class RuleBasedArgumentAnalysisTests(TestCase):
    def test_detects_each_supported_fallacy(self):
        for expected, argument in FALLACY_EXAMPLES.items():
            with self.subTest(fallacy=expected):
                result = analyze_argument_rule_based(argument)
                self.assertIn(expected, [fallacy.type for fallacy in result.fallacies])
                fallacy = next(item for item in result.fallacies if item.type == expected)
                self.assertEqual(fallacy.excerpt, argument)
                self.assertGreaterEqual(fallacy.confidence, 0)
                self.assertLessEqual(fallacy.confidence, 100)
                self.assertTrue(fallacy.explanation)
                self.assertTrue(fallacy.correction)

    def test_neutral_argument_returns_uncertain_no_fallacy_result(self):
        result = analyze_argument_rule_based(
            "The library should extend weekend hours. A student survey reports that 62% of respondents study on weekends."
        )
        self.assertEqual(result.fallacies, [])
        self.assertIn("No clear instance", result.feedback)
        self.assertEqual(result.analysis_method, "rule_based")

    def test_extracts_claim_support_evidence_and_scores_from_input(self):
        result = MockAIService().analyze_argument(
            "The city should add bus service. A 2024 survey found that 62% of riders wait more than 20 minutes.",
            context="public transit",
        )
        self.assertEqual(result.toulmin.claim, "The city should add bus service.")
        self.assertEqual(len(result.supporting_claims), 1)
        self.assertEqual(len(result.evidence), 1)
        self.assertIn("survey", result.evidence[0].lower())
        self.assertIn("bus", result.improved_argument.lower())
        for score in (
            result.scores.clarity,
            result.scores.relevance,
            result.scores.evidence,
            result.scores.logic,
            result.scores.persuasiveness,
            result.scores.overall,
        ):
            self.assertGreaterEqual(score, 0)
            self.assertLessEqual(score, 100)

    @override_settings(ARGUMENT_SCORE_WEIGHTS=json.dumps({
        "clarity": 0,
        "relevance": 0,
        "evidence": 0,
        "logic": 1,
        "persuasiveness": 0,
    }))
    def test_overall_score_uses_configured_weights(self):
        scores = {
            "clarity": 20,
            "relevance": 30,
            "evidence": 40,
            "logic": 67,
            "persuasiveness": 80,
        }
        self.assertEqual(calculate_overall_score(scores), 67)


class ArgumentAnalysisApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username="debater", password="safe-test-password")
        self.other_user = CustomUser.objects.create_user(username="other", password="safe-test-password")
        self.ai_service_patcher = patch(
            "apps.arguments.views.get_ai_service",
            return_value=MockAIService(),
        )
        self.ai_service_patcher.start()
        self.addCleanup(self.ai_service_patcher.stop)

    def test_authenticated_analysis_is_saved_with_report_fields(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/v1/arguments/analyze/",
            {
                "argument_text": "The city should add bus service. A transit study reports 62% higher ridership.",
                "context": "public transit",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["analysis_method"], "rule_based")
        self.assertEqual(response.data["scores"]["overall"], calculate_overall_score({
            "clarity": response.data["scores"]["clarity"],
            "relevance": response.data["scores"]["relevance"],
            "evidence": response.data["scores"]["evidence"],
            "logic": response.data["scores"]["logic"],
            "persuasiveness": response.data["scores"]["persuasiveness"],
        }))
        report = ArgumentAnalysis.objects.get(pk=response.data["id"])
        self.assertEqual(report.user, self.user)
        self.assertEqual(len(report.evidence), 1)
        self.assertTrue(report.improved_argument)

    def test_anonymous_analysis_is_returned_but_not_saved(self):
        response = self.client.post(
            "/api/v1/arguments/analyze/",
            {"argument_text": "The library should extend weekend hours."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["analysis_method"], "rule_based")
        self.assertEqual(ArgumentAnalysis.objects.count(), 0)

    def test_blank_and_overlong_inputs_are_rejected(self):
        blank = self.client.post(
            "/api/v1/arguments/analyze/",
            {"argument_text": "   "},
            format="json",
        )
        overlong = self.client.post(
            "/api/v1/arguments/analyze/",
            {"argument_text": "a" * 10001},
            format="json",
        )
        self.assertEqual(blank.status_code, 400)
        self.assertEqual(overlong.status_code, 400)

    def test_history_and_detail_are_private_to_authenticated_owner(self):
        owned = ArgumentAnalysis.objects.create(
            user=self.user,
            raw_text="My argument",
            claim="My claim",
            grounds="",
            warrant="",
        )
        other = ArgumentAnalysis.objects.create(
            user=self.other_user,
            raw_text="Private argument",
            claim="Private claim",
            grounds="",
            warrant="",
        )
        self.client.force_authenticate(self.user)
        history = self.client.get("/api/v1/arguments/history/")
        self.assertEqual(history.status_code, 200)
        self.assertEqual([item["id"] for item in history.data], [str(owned.id)])
        allowed = self.client.get(f"/api/v1/arguments/{owned.id}/")
        forbidden = self.client.get(f"/api/v1/arguments/{other.id}/")
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(forbidden.status_code, 404)

    def test_fallacy_endpoint_and_debate_session_ownership(self):
        response = self.client.post(
            "/api/v1/arguments/fallacies/",
            {"argument_text": FALLACY_EXAMPLES["False Dilemma"]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["fallacies"][0]["type"], "False Dilemma")

        self.client.force_authenticate(self.user)
        owned_session = DebateSession.objects.create(
            user=self.user,
            custom_topic_title="My debate",
        )
        saved = self.client.post(
            "/api/v1/arguments/analyze/",
            {
                "argument_text": "The library should extend weekend hours.",
                "debate_session_id": str(owned_session.id),
            },
            format="json",
        )
        self.assertEqual(saved.status_code, 201)
        self.assertEqual(saved.data["debate_session"], owned_session.id)

        session = DebateSession.objects.create(user=self.other_user, custom_topic_title="Other user's debate")
        denied = self.client.post(
            "/api/v1/arguments/analyze/",
            {
                "argument_text": "The library should extend weekend hours.",
                "debate_session_id": str(session.id),
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 400)

    def test_history_requires_authentication(self):
        self.assertEqual(self.client.get("/api/v1/arguments/history/").status_code, 401)
