# DebateAI — Agentic AI Debate Coach & Presentation Analysis Platform

[![CI/CD Pipeline](https://github.com/debateai/debateai/actions/workflows/ci.yml/badge.svg)](https://github.com/debateai/debateai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18.x-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)

DebateAI is a full-stack, production-ready web application designed to accelerate human cognitive reasoning, debate prowess, and public speaking confidence. Rather than acting as a simple generic conversational chatbot, DebateAI orchestrates **7 specialized AI agents** in real time to deconstruct arguments, flag logical fallacies, simulate multi-round debates, evaluate speech pacing and filler words, and generate professional PDF & Excel performance scorecards.

---

## Key Platform Capabilities

### 1. Multi-Agent AI Debate Engine
* **1. Topic Agent**: Parses debate motions, underlying frameworks (ethical, empirical, policy), and stakeholder impacts.
* **2. Argument Mining Agent**: Extracts Claims, Evidence, Inferences, and Assumptions. Evaluates 5 criteria (0–100): Clarity, Relevance, Evidence Strength, Logical Consistency, and Persuasiveness.
* **3. Logical Fallacy Detection Agent**: Detects 8+ fallacies: *Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, and Red Herring*. Provides why problematic, correct reasoning, and corrected arguments.
* **4. 5-Tier Counterargument Agent**: Generates structured Logical, Evidence-based, Ethical, Practical, and Policy rebuttals with Socratic challenge questions.
* **5. Real-Time Challenge Agent**: Generates dynamic pressure tests, "What if?" edge-case scenarios, and contradiction challenges.
* **6. Coaching Assistant Agent**: Delivers actionable advice: what was done well, target improvement area, weakest contention, and next drill.
* **7. Weighted Performance Scoring Agent**: Strictly implements the exact 100% weighted formula:
  * **Argument Quality**: 30%
  * **Evidence Usage**: 20%
  * **Logical Consistency**: 20%
  * **Rebuttal Effectiveness**: 15%
  * **Communication Skills**: 15%

### 2. Speech & Presentation Analytics
* **Speech-to-Text Transcription**: Real-time microphone dictation and audio/video upload support.
* **Speaking Pace (WPM)**: Words-per-minute tracking classified into *Very slow, Slow, Balanced (130-165 WPM), Fast, and Very fast* with timeline graphs.
* **Filler Word Detector**: Quantifies and classifies occurrences of: `um`, `uh`, `like`, `basically`, `actually`, `you know`, and `so`.
* **Vocal Confidence Estimation**: 0–100 confidence score based on hesitation pauses, pace consistency, and filler density.
* **Clarity & Engagement Evaluation**: Analyzes structural signposting and rhetorical engagement.

### 3. Role-Based Access Control (4 Portals)
* **Learner**: Interactive debate room, presentation lab, 11-competency skill radar, adaptive 6-week learning path, and interactive practice exercises.
* **Debate Coach**: Student directory, cohort skill gap analysis, student debate evaluations, and coaching note assignments.
* **Educator**: Class-wide analytics, student rankings, score distributions, and cohort summary report exports.
* **Administrator**: User management, account activation/role changes, and real-time AI inference telemetry.

### 4. Professional Export Engine
* **PDF Performance Report**: Comprehensive, publication-grade layout detailing round transcripts, weighted scores, and coaching action plans.
* **Excel (.xlsx) Report**: Multi-tab workbook with dedicated sheets for *Scores, Debate History, Fallacies, Presentation Analytics, and Recommendations*.

---

## Demo Credentials (Pre-seeded)

The platform comes pre-seeded with realistic debate histories, presentations, and analytics:

| Role | Email | Password |
|---|---|---|
| **Learner (Student)** | `learner@debateai.com` | `Password123!` |
| **Debate Coach** | `coach@debateai.com` | `Password123!` |
| **Educator** | `educator@debateai.com` | `Password123!` |
| **Administrator** | `admin@debateai.com` | `Password123!` |

*(You can also use the 1-click role switcher pill in the navigation header at any time to switch roles instantly!)*

---

## Tech Stack

* **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, Uvicorn, Passlib (bcrypt), python-jose, OpenPyXL, ReportLab, pytest.
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios, React Router v7.
* **Database**: SQLite (default for zero-config immediate run) / PostgreSQL ready.
* **DevOps**: Docker, Docker Compose, GitHub Actions CI/CD.

---

## Quickstart: Running Locally

### Prerequisites
* Python 3.10+ (Python 3.13 recommended)
* Node.js 18+ and npm

### 1. Backend Setup
```bash
# In project root
python -m venv backend/.venv

# Activate venv:
# Windows (PowerShell):
.\backend\.venv\Scripts\Activate.ps1
# macOS/Linux:
source backend/.venv/bin/activate

# Install dependencies:
pip install -r backend/requirements.txt
pip install pytest-asyncio email-validator

# Initialize database with pre-seeded demo accounts:
python -m backend.app.database.seed_data

# Start FastAPI backend server:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be running at: `http://127.0.0.1:8000`
Interactive Swagger Docs at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend Web Application will be running at: `http://localhost:5173`

---

## Running with Docker Compose

To start the entire multi-container production stack with one command:
```bash
docker compose up --build
```
* **Frontend**: `http://localhost` (Port 80)
* **Backend API**: `http://localhost:8000`
* **Health Check**: `http://localhost:8000/health`

---

## Running Automated Tests

Run the complete test suite verifying authentication, agent analysis, exact 30/20/20/15/15 weighted scoring, and PDF/Excel generation:
```bash
# In project root
$env:PYTHONPATH="."
.\backend\.venv\Scripts\python -m pytest backend/tests -v
```

---

## Environment Variables (.env)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./debateai.db` |
| `JWT_SECRET` | Secret key for JWT token signing | Pre-configured secure key |
| `OPENAI_API_KEY` | Optional live LLM API key | (Dual-mode local rule engine runs if blank) |
| `UPLOAD_DIR` | Directory for audio/video recordings | `./uploads` |
| `EXPORT_DIR` | Directory for PDF/Excel exports | `./exports` |
