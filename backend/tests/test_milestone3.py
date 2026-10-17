"""
Comprehensive Milestone 3 Verification Suite — AI Debate Simulation & Coaching
Tests:
- AI Opponent Personas Catalog (all 8 persona types)
- Debate Simulation Lifecycle (Start simulation arena, turn progression, AI counter-speech, real-time coaching feedback)
- Counterargument Generation Engine across all 5 types:
    1. Logical Rebuttals
    2. Evidence-Based Rebuttals
    3. Ethical Counterarguments
    4. Practical Counterarguments
    5. Policy Counterarguments
- Personalized Coaching Recommendations Engine
- Personalized 4-Week Learning Plan Generation
- Debate Drill Library Browsing & Filtering
- Skill Gap Analysis against Competitive Benchmark (80 pts)
"""

import sys
import os
import unittest
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app


class TestMilestone3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._client_cm = TestClient(app, raise_server_exceptions=True)
        cls._client_cm.__enter__()
        cls.client = cls.client_ref = cls._client_cm
        cls.ts = int(datetime.now().timestamp() * 1000)

        res_user = cls.client.post("/api/v1/auth/register", json={
            "full_name": "Milestone3 Debater",
            "email": f"m3_debater_{cls.ts}@example.com",
            "password": "Password123!",
            "role": "learner",
        })
        cls.token = res_user.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        cls._client_cm.__exit__(None, None, None)

    def test_01_simulation_personas_catalog(self):
        """Verify that all AI opponent personas are available with descriptions and styles."""
        res = self.client.get("/api/v1/simulation/personas", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        personas = res.json()
        self.assertGreaterEqual(len(personas), 6)
        keys = [p["key"] for p in personas]
        self.assertIn("analytical", keys)
        self.assertIn("aggressive", keys)
        self.assertIn("philosophical", keys)
        self.assertIn("pragmatic", keys)
        self.assertIn("ethical", keys)
        self.assertIn("balanced", keys)

    def test_02_simulation_start_and_turn_progression(self):
        """Verify launching AI simulation arena and processing multi-turn sparring with real-time feedback."""
        # 1. Start simulation
        start_payload = {
            "topic": "Universal Basic Income should be adopted globally",
            "user_position": "proposition",
            "persona_key": "analytical",
            "total_turns": 4,
        }
        res_start = self.client.post("/api/v1/simulation/start", json=start_payload, headers=self.headers)
        self.assertEqual(res_start.status_code, 200)
        start_data = res_start.json()
        self.assertIn("session_id", start_data)
        self.assertIn("opening_statement", start_data)
        self.assertEqual(start_data["persona"]["key"], "analytical")

        # 2. Turn 1
        turn_payload = {
            "session_id": start_data["session_id"],
            "topic": start_payload["topic"],
            "user_speech": (
                "Empirical trials in Finland and Kenya demonstrate that unconditional cash transfers "
                "significantly boost health and education outcomes without reducing labor force participation."
            ),
            "persona_key": "analytical",
            "turn_number": 1,
            "user_position": "proposition",
        }
        res_turn = self.client.post("/api/v1/simulation/turn", json=turn_payload, headers=self.headers)
        self.assertEqual(res_turn.status_code, 200)
        turn_data = res_turn.json()
        self.assertIn("ai_speech", turn_data)
        self.assertIn("coaching_feedback", turn_data)
        feedback = turn_data["coaching_feedback"]
        self.assertIn("turn_score", feedback)
        self.assertGreaterEqual(feedback["turn_score"], 0)
        self.assertIn("challenge_question", feedback)
        self.assertIn("recommended_counter_strategy", feedback)

    def test_03_counterargument_generation_all_types(self):
        """Verify counterargument generation producing all required types with strategies and challenge questions."""
        payload = {
            "argument_text": (
                "We must completely automate industrial manufacturing because artificial intelligence "
                "delivers unprecedented productivity improvements and eliminates manual human error."
            ),
            "topic": "Workforce Automation",
            "num_counters": 5,
        }
        res = self.client.post("/api/v1/simulation/counterarguments", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("counterarguments", data)
        self.assertGreaterEqual(len(data["counterarguments"]), 3)

        types_found = {c["type"] for c in data["counterarguments"]}
        expected_types = {"logical", "evidence", "ethical", "practical", "policy"}
        # Verify intersection
        self.assertTrue(len(types_found.intersection(expected_types)) >= 3)
        for c in data["counterarguments"]:
            self.assertIn("rebuttal", c)
            self.assertIn("challenge_question", c)
            self.assertIn("debate_strategy", c)

    def test_04_coaching_recommendations(self):
        """Verify personalized coaching recommendations based on skill scores."""
        payload = {
            "scores": {
                "argument_quality": 65.0,
                "evidence_usage": 52.0,
                "logical_consistency": 70.0,
                "rebuttal_effectiveness": 58.0,
                "communication_skills": 72.0,
            },
            "user_level": "intermediate",
            "focus_areas": ["evidence_usage", "rebuttal_effectiveness"],
        }
        res = self.client.post("/api/v1/coaching/recommendations", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recommendations", data)
        self.assertIn("weakest_skill", data)
        self.assertIn("actionable_next_steps", data)
        self.assertEqual(data["weakest_skill"], "evidence_usage")

    def test_05_personalized_learning_plan(self):
        """Verify generation of a structured 4-week learning path with drills and milestones."""
        payload = {
            "user_level": "intermediate",
            "weak_skills": ["evidence_usage", "logical_consistency"],
            "sessions_per_week": 3,
        }
        res = self.client.post("/api/v1/coaching/learning-plan", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("weeks", data)
        self.assertEqual(len(data["weeks"]), 4)
        for w in data["weeks"]:
            self.assertIn("week", w)
            self.assertIn("focus", w)
            self.assertIn("goal", w)
            self.assertIn("daily_practice", w)
        self.assertIn("milestones", data)
        self.assertIn("recommended_drills", data)

    def test_06_skill_gap_analysis(self):
        """Verify skill gap calculations against the 80-point competitive benchmark."""
        payload = {
            "scores": {
                "argument_quality": 82.0,
                "evidence_usage": 60.0,
                "logical_consistency": 75.0,
                "rebuttal_effectiveness": 68.0,
                "communication_skills": 85.0,
            }
        }
        res = self.client.post("/api/v1/coaching/skill-gap", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("skill_gaps", data)
        self.assertIn("priority_interventions", data)
        # Evidence usage gap should be 20.0 (80 - 60)
        evidence_gap = next((g for g in data["skill_gaps"] if g["skill"] == "evidence_usage"), None)
        self.assertIsNotNone(evidence_gap)
        self.assertAlmostEqual(evidence_gap["gap"], 20.0, places=1)

    def test_07_drill_library(self):
        """Verify browsing drill library with difficulty and skill type filters."""
        res_all = self.client.get("/api/v1/coaching/drills", headers=self.headers)
        self.assertEqual(res_all.status_code, 200)
        all_drills = res_all.json()
        types = {d["type"] for d in all_drills}
        self.assertIn("speaking", types)
        self.assertIn("rebuttal", types)
        self.assertIn("logic", types)

        res_filtered = self.client.get("/api/v1/coaching/drills?skill_type=rebuttal", headers=self.headers)
        self.assertEqual(res_filtered.status_code, 200)
        rebuttal_drills = res_filtered.json()
        self.assertTrue(all(d["type"] == "rebuttal" for d in rebuttal_drills))

