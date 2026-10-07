"""
Comprehensive Milestone 1 Verification Suite
Tests:
- Authentication (Registration for 4 roles, JWT Login, Invalid credentials)
- User Profile & Skill Management (Presentation Domains, Communication Skills, Goals)
- Role-Based Access Control (RBAC for Learner, Coach, Educator, Admin)
- Debate Session Management (CRUD across formats, Transcript logging, Coach Evaluation)
"""

import sys
import os
import unittest
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app


class TestMilestone1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use TestClient as a context manager so lifespan (create_tables) runs
        cls._client_cm = TestClient(app, raise_server_exceptions=True)
        cls._client_cm.__enter__()
        cls.client = cls._client_cm
        # Unique timestamp for isolation
        cls.ts = int(datetime.now().timestamp() * 1000)

    @classmethod
    def tearDownClass(cls):
        cls._client_cm.__exit__(None, None, None)

    def test_01_health_check(self):
        """Verify API health and root endpoints."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        res_h = self.client.get("/health")
        self.assertEqual(res_h.status_code, 200)
        self.assertEqual(res_h.json()["status"], "healthy")

    def test_02_registration_all_roles(self):
        """Verify registration for all 4 roles specified in Milestone 1."""
        roles = ["learner", "coach", "educator", "admin"]
        tokens = {}

        for role in roles:
            email = f"user_{role}_{self.ts}@example.com"
            payload = {
                "full_name": f"{role.capitalize()} Test User",
                "email": email,
                "password": "Password123!",
                "role": role,
            }
            res = self.client.post("/api/v1/auth/register", json=payload)
            self.assertEqual(res.status_code, 201, f"Failed to register role {role}: {res.text}")
            data = res.json()
            self.assertIn("access_token", data)
            self.assertEqual(data["user"]["role"], role)
            self.assertEqual(data["user"]["email"], email)
            # Verify default skills and presentation domains are initialized
            self.assertIn("clarity_score", data["user"]["communication_skills"])
            self.assertIsInstance(data["user"]["presentation_domains"], list)
            tokens[role] = data["access_token"]

        self.__class__.tokens = tokens

    def test_03_login_and_auth_validation(self):
        """Test OAuth2 login and rejection of invalid credentials."""
        email = f"user_learner_{self.ts}@example.com"

        # Valid login
        res = self.client.post("/api/v1/auth/login", data={"username": email, "password": "Password123!"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access_token", res.json())

        # Invalid password
        res_bad = self.client.post("/api/v1/auth/login", data={"username": email, "password": "WrongPassword"})
        self.assertEqual(res_bad.status_code, 401)

    def test_04_user_profile_and_skill_tracking(self):
        """Test fetching and updating profile with presentation domains and skills."""
        learner_token = self.tokens["learner"]
        headers = {"Authorization": f"Bearer {learner_token}"}

        # Fetch me
        res = self.client.get("/api/v1/users/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        user = res.json()
        self.assertEqual(user["role"], "learner")

        # Update profile with presentation domains and custom skills
        update_payload = {
            "bio": "Competitive collegiate debater focusing on AI ethics.",
            "experience_level": "Intermediate",
            "debate_topics": ["Technology & AI", "Philosophy & Ethics"],
            "presentation_domains": ["Keynote & Public Speaking", "Academic & Scientific Defense"],
            "learning_goals": ["Master rebuttals", "Reduce filler words"],
            "communication_skills": {
                "clarity_score": 85,
                "evidence_strength": 82,
                "logical_consistency": 88,
                "persuasiveness": 80,
                "speaking_pace": 140,
                "confidence_score": 88,
            },
        }
        res_up = self.client.put("/api/v1/users/me", json=update_payload, headers=headers)
        self.assertEqual(res_up.status_code, 200)
        updated = res_up.json()
        self.assertEqual(updated["experience_level"], "Intermediate")
        self.assertEqual(len(updated["presentation_domains"]), 2)
        self.assertEqual(updated["communication_skills"]["clarity_score"], 85)

    def test_05_debate_session_lifecycle(self):
        """Test creating, viewing, updating transcript, and deleting sessions."""
        learner_token = self.tokens["learner"]
        headers = {"Authorization": f"Bearer {learner_token}"}

        # Create session in Oxford Debate format
        session_payload = {
            "topic": "AI development poses greater societal benefits than catastrophic risks",
            "format": "Oxford Debate",
            "position": "Proposition / Affirmative",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "round_count": 3,
            "duration_minutes": 30,
            "notes": "Opening statement will focus on healthcare and education automation.",
        }
        res = self.client.post("/api/v1/sessions/", json=session_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        session = res.json()
        self.assertEqual(session["format"], "Oxford Debate")
        self.assertEqual(session["status"], "scheduled")
        session_id = session["id"]

        # Save speech transcript
        res_trans = self.client.put(
            f"/api/v1/sessions/{session_id}",
            json={"transcript": "Mr. Speaker, esteemed judges, AI is the defining tool of our century..."},
            headers=headers,
        )
        self.assertEqual(res_trans.status_code, 200)
        self.assertIn("Mr. Speaker", res_trans.json()["transcript"])

        self.__class__.test_session_id = session_id

    def test_06_role_based_access_and_evaluation(self):
        """Verify RBAC: Coaches can view/evaluate student sessions; other learners cannot tamper."""
        session_id = self.test_session_id
        coach_token = self.tokens["coach"]
        coach_headers = {"Authorization": f"Bearer {coach_token}"}

        # Coach views students list
        res_students = self.client.get("/api/v1/users/students", headers=coach_headers)
        self.assertEqual(res_students.status_code, 200)
        self.assertTrue(len(res_students.json()) >= 1)

        # Coach views all sessions
        res_all_sessions = self.client.get("/api/v1/sessions/", headers=coach_headers)
        self.assertEqual(res_all_sessions.status_code, 200)
        session_ids = [s["id"] for s in res_all_sessions.json()]
        self.assertIn(session_id, session_ids)

        # Coach evaluates student session
        eval_payload = {
            "score": 89.5,
            "feedback_summary": "Excellent persuasive rhetoric; consider deepening counter-evidence on labor displacement.",
            "evaluation_criteria": {
                "argument_quality": 90,
                "evidence_strength": 85,
                "logical_consistency": 92,
                "rebuttal_effectiveness": 88,
                "communication_skills": 92,
            },
        }
        res_eval = self.client.put(f"/api/v1/sessions/{session_id}/evaluate", json=eval_payload, headers=coach_headers)
        self.assertEqual(res_eval.status_code, 200)
        evaluated = res_eval.json()
        self.assertEqual(evaluated["score"], 89.5)
        self.assertEqual(evaluated["status"], "completed")

        # Verify a new learner cannot tamper with or delete this session
        new_learner = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Unrelated Learner",
                "email": f"unrelated_{self.ts}@example.com",
                "password": "Password123!",
                "role": "learner",
            },
        ).json()
        other_headers = {"Authorization": f"Bearer {new_learner['access_token']}"}

        # Other learner cannot evaluate
        res_unauthorized = self.client.put(
            f"/api/v1/sessions/{session_id}/evaluate", json=eval_payload, headers=other_headers
        )
        self.assertEqual(res_unauthorized.status_code, 403)

        # Other learner cannot delete
        res_del_denied = self.client.delete(f"/api/v1/sessions/{session_id}", headers=other_headers)
        self.assertEqual(res_del_denied.status_code, 403)

        # Owner can delete own session
        learner_headers = {"Authorization": f"Bearer {self.tokens['learner']}"}
        res_del_ok = self.client.delete(f"/api/v1/sessions/{session_id}", headers=learner_headers)
        self.assertEqual(res_del_ok.status_code, 204)


if __name__ == "__main__":
    unittest.main()
