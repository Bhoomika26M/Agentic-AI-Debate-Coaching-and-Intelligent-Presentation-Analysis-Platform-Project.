"""
Comprehensive Milestone 4 Verification Suite — Presentation Analytics, Reports & Exports, Notifications
Tests:
- Presentation Analysis Engine (WPM, filler word count/rate, confidence score, clarity, engagement)
- Presentation History Tracking & Persistence
- Audio Speech Extraction & Analysis Endpoint
- Debate Reports, Presentation Assessment Reports, Coaching Reports & Learning Progress Reports
- Multi-format Export System: CSV, Excel (.xlsx), and PDF (.pdf) downloads
- Admin Analytics Platform Overview
- Notification & Engagement System (Debate reminders, coaching alerts, milestones, announcements, mark as read)
- OAuth2 SSO Authentication Integration
"""

import sys
import os
import io
import unittest
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app


class TestMilestone4(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._client_cm = TestClient(app, raise_server_exceptions=True)
        cls._client_cm.__enter__()
        cls.client = cls._client_cm
        cls.ts = int(datetime.now().timestamp() * 1000)

        # Register learner
        res_user = cls.client.post("/api/v1/auth/register", json={
            "full_name": "Milestone4 Debater",
            "email": f"m4_debater_{cls.ts}@example.com",
            "password": "Password123!",
            "role": "learner",
        })
        cls.token = res_user.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

        # Register admin
        res_admin = cls.client.post("/api/v1/auth/register", json={
            "full_name": "Milestone4 Admin",
            "email": f"m4_admin_{cls.ts}@example.com",
            "password": "Password123!",
            "role": "admin",
        })
        cls.admin_token = res_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    @classmethod
    def tearDownClass(cls):
        cls._client_cm.__exit__(None, None, None)

    def test_01_presentation_analysis_and_history(self):
        """Verify presentation analysis metrics, scores, and persistent history tracking."""
        speech = (
            "Good morning distinguished adjudicators. Today, um, I want to talk about how artificial "
            "intelligence transforms education. First, adaptive learning allows every student to learn "
            "at their own pace. Second, you know, educators can automate routine grading and focus "
            "deeply on mentorship. Clearly, empirical studies establish that equitable access is essential. "
            "In conclusion, responsible innovation will elevate human potential worldwide."
        )
        payload = {
            "transcript": speech,
            "duration_seconds": 45,
            "title": "AI in Education Keynote",
        }
        res = self.client.post("/api/v1/presentation/analyze", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        report = res.json()

        self.assertIn("overall_presentation_score", report)
        self.assertGreaterEqual(report["overall_presentation_score"], 50)
        self.assertIn("pacing", report)
        self.assertGreater(report["pacing"]["words_per_minute"], 50)
        self.assertIn("filler_analysis", report)
        self.assertGreaterEqual(report["filler_analysis"]["total_fillers"], 1)
        self.assertIn("confidence_analysis", report)
        self.assertIn("clarity_analysis", report)
        self.assertIn("engagement_analysis", report)
        self.assertIn("improvement_recommendations", report)

        # Check history endpoint
        res_history = self.client.get("/api/v1/presentation/history", headers=self.headers)
        self.assertEqual(res_history.status_code, 200)
        hist = res_history.json()
        self.assertGreaterEqual(hist["count"], 1)
        self.assertEqual(hist["history"][0]["title"], "AI in Education Keynote")

    def test_02_audio_presentation_upload(self):
        """Verify audio file upload endpoint for speech intelligence analysis."""
        fake_audio_bytes = b"RIFF....WAVEfmt ...." + (b"\x00" * 64000)
        files = {
            "audio_file": ("test_speech.wav", io.BytesIO(fake_audio_bytes), "audio/wav")
        }
        data = {"title": "Recorded Audio Rebuttal"}
        res = self.client.post(
            "/api/v1/presentation/upload-audio",
            files=files,
            data=data,
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        report = res.json()
        self.assertIn("audio_meta", report)
        self.assertEqual(report["audio_meta"]["filename"], "test_speech.wav")
        self.assertIn("overall_presentation_score", report)

    def test_03_reports_endpoints(self):
        """Verify dedicated reports: performance, debate, presentation, coaching, learning-progress."""
        # Performance Report
        res_perf = self.client.get("/api/v1/reports/performance", headers=self.headers)
        self.assertEqual(res_perf.status_code, 200)
        self.assertIn("session_statistics", res_perf.json())
        self.assertIn("score_statistics", res_perf.json())

        # Debate Report
        res_deb = self.client.get("/api/v1/reports/debate", headers=self.headers)
        self.assertEqual(res_deb.status_code, 200)
        self.assertIn("format_breakdown", res_deb.json())

        # Presentation Report
        res_pres = self.client.get("/api/v1/reports/presentation", headers=self.headers)
        self.assertEqual(res_pres.status_code, 200)
        self.assertIn("metrics_summary", res_pres.json())

        # Coaching Report
        res_coach = self.client.get("/api/v1/reports/coaching", headers=self.headers)
        self.assertEqual(res_coach.status_code, 200)
        self.assertIn("growth_priorities", res_coach.json())

        # Learning Progress Report
        res_learn = self.client.get("/api/v1/reports/learning-progress", headers=self.headers)
        self.assertEqual(res_learn.status_code, 200)
        self.assertIn("skill_growth_trajectory", res_learn.json())

    def test_04_export_system_csv_excel_pdf(self):
        """Verify multi-format export downloads for CSV, Excel (.xlsx), and PDF (.pdf)."""
        # CSV Export
        res_csv = self.client.get("/api/v1/reports/export/csv", headers=self.headers)
        self.assertEqual(res_csv.status_code, 200)
        self.assertEqual(res_csv.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("ID,Topic,Format", res_csv.text)

        # Excel Export
        res_excel = self.client.get("/api/v1/reports/export/excel", headers=self.headers)
        self.assertEqual(res_excel.status_code, 200)
        self.assertIn("spreadsheetml", res_excel.headers["content-type"])
        self.assertGreater(len(res_excel.content), 2000)

        # PDF Export
        res_pdf = self.client.get("/api/v1/reports/export/pdf", headers=self.headers)
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.headers["content-type"], "application/pdf")
        self.assertTrue(res_pdf.content.startswith(b"%PDF"))
        self.assertGreater(len(res_pdf.content), 1000)

    def test_05_admin_overview_rbac(self):
        """Verify admin overview access control and analytics breakdown."""
        # Non-admin forbidden
        res_forbidden = self.client.get("/api/v1/reports/admin/overview", headers=self.headers)
        self.assertEqual(res_forbidden.status_code, 403)

        # Admin allowed
        res_allowed = self.client.get("/api/v1/reports/admin/overview", headers=self.admin_headers)
        self.assertEqual(res_allowed.status_code, 200)
        data = res_allowed.json()
        self.assertIn("platform_statistics", data)
        self.assertIn("user_role_distribution", data)

    def test_06_notifications_and_engagement_system(self):
        """Verify notification generation, listing, unread counts, marking read, and announcements."""
        # 1. List notifications (auto-seeds defaults)
        res_list = self.client.get("/api/v1/notifications/", headers=self.headers)
        self.assertEqual(res_list.status_code, 200)
        notifs = res_list.json()
        self.assertGreaterEqual(notifs["total_count"], 3)
        self.assertGreaterEqual(notifs["unread_count"], 1)

        first_id = notifs["notifications"][0]["id"]

        # 2. Mark specific notification as read
        res_read = self.client.put(f"/api/v1/notifications/{first_id}/read", headers=self.headers)
        self.assertEqual(res_read.status_code, 200)
        self.assertTrue(res_read.json()["is_read"])

        # 3. Mark all as read
        res_all_read = self.client.put("/api/v1/notifications/read-all", headers=self.headers)
        self.assertEqual(res_all_read.status_code, 200)

        # 4. Create custom notification
        res_create = self.client.post("/api/v1/notifications/create", json={
            "title": "Practice Test Alarm",
            "message": "Time for your 5-minute Oxford rebuttal practice session.",
            "type": "practice_reminder",
            "link": "/simulation",
        }, headers=self.headers)
        self.assertEqual(res_create.status_code, 201)

        # 5. Admin announcement
        res_ann = self.client.post("/api/v1/notifications/announcement?title=Collegiate+Tournament&message=National+Debate+Championship+Registration+Open", headers=self.admin_headers)
        self.assertEqual(res_ann.status_code, 201)

    def test_07_oauth2_sso_login(self):
        """Verify OAuth2 SSO authentication flow and JWT issuance."""
        payload = {
            "provider": "google",
            "token": "oauth2_mock_google_id_token_12345",
            "email": f"google_sso_{self.ts}@example.com",
            "full_name": "Google SSO Debater",
            "role": "learner",
        }
        res = self.client.post("/api/v1/auth/oauth2/login", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], payload["email"])
        self.assertEqual(data["user"]["full_name"], payload["full_name"])
