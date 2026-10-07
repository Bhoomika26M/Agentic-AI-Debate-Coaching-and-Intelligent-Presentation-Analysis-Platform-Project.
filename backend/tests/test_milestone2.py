"""
Comprehensive Milestone 2 Verification Suite
Tests:
- Logical Fallacy Catalog (all 8 fallacies listed in PDF)
- Fallacy Detection Engine (Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring)
- Reasoning Quality Analysis & Evaluation Criteria (Clarity, Relevance, Evidence Strength, Logical Consistency, Persuasiveness)
- Weighted Performance Scoring Model (AQ 30%, EU 20%, LC 20%, RE 15%, CS 15%)
- Automated Debate Feedback Reports
- Session Transcript Analysis Integration with Database Persistence & RBAC
"""

import sys
import os
import unittest
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app


class TestMilestone2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._client_cm = TestClient(app, raise_server_exceptions=True)
        cls._client_cm.__enter__()
        cls.client = cls._client_cm
        cls.ts = int(datetime.now().timestamp() * 1000)

        # Register a test learner and coach
        res_learner = cls.client.post("/api/v1/auth/register", json={
            "full_name": "Milestone2 Learner",
            "email": f"m2_learner_{cls.ts}@example.com",
            "password": "Password123!",
            "role": "learner",
        })
        cls.learner_token = res_learner.json()["access_token"]
        cls.learner_headers = {"Authorization": f"Bearer {cls.learner_token}"}

        res_coach = cls.client.post("/api/v1/auth/register", json={
            "full_name": "Milestone2 Coach",
            "email": f"m2_coach_{cls.ts}@example.com",
            "password": "Password123!",
            "role": "coach",
        })
        cls.coach_token = res_coach.json()["access_token"]
        cls.coach_headers = {"Authorization": f"Bearer {cls.coach_token}"}

    @classmethod
    def tearDownClass(cls):
        cls._client_cm.__exit__(None, None, None)

    def test_01_supported_fallacies_catalog(self):
        """Verify that all 8 fallacies required by the specification are returned."""
        res = self.client.get("/api/v1/analysis/fallacies")
        self.assertEqual(res.status_code, 200)
        fallacies = res.json()
        names = [f["name"] for f in fallacies]
        expected = [
            "Ad Hominem",
            "Straw Man",
            "False Dilemma",
            "Slippery Slope",
            "Appeal to Authority",
            "Circular Reasoning",
            "Hasty Generalization",
            "Red Herring",
        ]
        self.assertEqual(len(names), 8)
        for item in expected:
            self.assertIn(item, names)

    def test_02_detect_ad_hominem_and_slippery_slope(self):
        """Verify detection of personal attack and unfounded causal chain fallacies."""
        flawed_speech = (
            "We cannot trust this proposal because my opponent is a liar and corrupt. "
            "Furthermore, if we permit this minor curfew revision, it will inevitably lead to "
            "complete destruction of our cities and society will collapse."
        )
        res = self.client.post(
            "/api/v1/analysis/evaluate",
            json={"text": flawed_speech, "topic": "Urban Youth Curfews"},
            headers=self.learner_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        detected_types = [f["fallacy_type"] for f in data["fallacies"]]
        self.assertIn("Ad Hominem", detected_types)
        self.assertIn("Slippery Slope", detected_types)

        # Check penalty in logical consistency
        self.assertLess(data["evaluation_criteria"]["logical_consistency"], 70.0)
        # Check correction suggestions exist
        for f in data["fallacies"]:
            self.assertTrue(len(f["correction_suggestion"]) > 10)
            self.assertTrue(len(f["explanation"]) > 10)

    def test_03_detect_false_dilemma_and_straw_man(self):
        """Verify detection of false dichotomy and caricature fallacies."""
        speech = (
            "Either we ban artificial intelligence completely, or humanity will face complete ruin. "
            "Proponents basically want to destroy all human employment and leave everyone starving."
        )
        res = self.client.post(
            "/api/v1/analysis/evaluate",
            json={"text": speech, "topic": "Artificial Intelligence Safety"},
            headers=self.learner_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        detected_types = [f["fallacy_type"] for f in data["fallacies"]]
        self.assertIn("False Dilemma", detected_types)
        self.assertIn("Straw Man", detected_types)

    def test_04_detect_circular_reasoning_and_appeal_to_authority(self):
        """Verify circular reasoning and prestige evidence detection."""
        speech = (
            "We must obey the law because breaking the law is illegal and forbidden. "
            "Moreover, a famous celebrity stated that this economic plan is flawless."
        )
        res = self.client.post(
            "/api/v1/analysis/evaluate",
            json={"text": speech, "topic": "Rule of Law"},
            headers=self.learner_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        detected_types = [f["fallacy_type"] for f in data["fallacies"]]
        self.assertIn("Circular Reasoning", detected_types)
        self.assertIn("Appeal to Authority", detected_types)

    def test_05_detect_hasty_gen_and_red_herring(self):
        """Verify hasty generalization and topic evasion fallacies."""
        speech = (
            "I know one person who had bad side effects, so all vaccines are completely dangerous. "
            "Besides, why are we talking about healthcare when what about the space program from last year?"
        )
        res = self.client.post(
            "/api/v1/analysis/evaluate",
            json={"text": speech, "topic": "Public Health Mandates"},
            headers=self.learner_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        detected_types = [f["fallacy_type"] for f in data["fallacies"]]
        self.assertIn("Hasty Generalization", detected_types)
        self.assertIn("Red Herring", detected_types)

    def test_06_sound_argument_evaluation_and_weighted_scoring(self):
        """Verify that a well-substantiated, fallacy-free argument receives a high composite score."""
        sound_speech = (
            "Mr. Speaker, renewable energy adoption represents an indispensable economic necessity. "
            "Firstly, empirical analysis from the International Energy Agency indicates solar generation costs "
            "declined by 82% over the preceding decade. Secondly, independent economic modeling demonstrates "
            "that clean energy transition creates 3.2 times more employment opportunities per dollar invested "
            "than legacy fossil fuels. Therefore, public investment yields both ecological sustainability and economic prosperity."
        )
        res = self.client.post(
            "/api/v1/analysis/evaluate",
            json={"text": sound_speech, "topic": "Renewable Energy Transition", "position": "Affirmative"},
            headers=self.learner_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Zero fallacies
        self.assertEqual(len(data["fallacies"]), 0)
        self.assertGreaterEqual(data["overall_score"], 80.0)

        # Check all 5 evaluation criteria
        criteria = data["evaluation_criteria"]
        for key in ["clarity", "relevance", "evidence_strength", "logical_consistency", "persuasiveness"]:
            self.assertIn(key, criteria)
            self.assertGreater(criteria[key], 60.0)

        # Check weighted score breakdown (AQ 30%, EU 20%, LC 20%, RE 15%, CS 15%)
        ws = data["weighted_scores"]
        calculated_total = (
            (ws["argument_quality"] * 0.30)
            + (ws["evidence_usage"] * 0.20)
            + (ws["logical_consistency"] * 0.20)
            + (ws["rebuttal_effectiveness"] * 0.15)
            + (ws["communication_skills"] * 0.15)
        )
        self.assertAlmostEqual(ws["overall_score"], calculated_total, delta=0.5)

        # Verify feedback report fields
        self.assertTrue(len(data["executive_summary"]) > 20)
        self.assertTrue(len(data["key_strengths"]) >= 1)
        self.assertTrue(len(data["actionable_recommendations"]) >= 1)

    def test_07_session_transcript_analysis_integration(self):
        """Verify full end-to-end integration: analyzing session transcript updates DB session."""
        # 1. Create a session
        session_payload = {
            "topic": "Universal Healthcare is a Human Right",
            "format": "Oxford Debate",
            "position": "Proposition",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "notes": "Focus on WHO metrics and economic efficiency.",
            "transcript": (
                "Esteemed adjudicators, universal healthcare guarantees dignity and reduces systemic economic waste. "
                "According to 2024 WHO reports, preventative care reduces emergency interventions by 43%. "
                "Furthermore, comparative healthcare studies across OECD countries demonstrate lower administrative costs. "
                "Therefore, universal access is medically imperative and fiscally responsible."
            ),
        }
        res_create = self.client.post("/api/v1/sessions/", json=session_payload, headers=self.learner_headers)
        self.assertEqual(res_create.status_code, 201)
        session_id = res_create.json()["id"]

        # 2. Trigger AI analysis on session
        res_analysis = self.client.post(f"/api/v1/analysis/session/{session_id}", headers=self.learner_headers)
        self.assertEqual(res_analysis.status_code, 200)
        report = res_analysis.json()
        self.assertGreater(report["overall_score"], 75.0)

        # 3. Retrieve session and verify DB persistence
        res_session = self.client.get(f"/api/v1/sessions/{session_id}", headers=self.learner_headers)
        self.assertEqual(res_session.status_code, 200)
        session_data = res_session.json()

        self.assertEqual(session_data["status"], "completed")
        self.assertEqual(session_data["score"], report["overall_score"])
        self.assertIn("clarity", session_data["evaluation_criteria"])
        self.assertIn("argument_quality", session_data["evaluation_criteria"])

        # 4. Verify report retrieval endpoint
        res_rep = self.client.get(f"/api/v1/analysis/session/{session_id}/report", headers=self.learner_headers)
        self.assertEqual(res_rep.status_code, 200)
        self.assertEqual(res_rep.json()["overall_score"], report["overall_score"])

        # 5. Coach can also view the analysis report
        res_coach_view = self.client.get(f"/api/v1/analysis/session/{session_id}/report", headers=self.coach_headers)
        self.assertEqual(res_coach_view.status_code, 200)


if __name__ == "__main__":
    unittest.main()
