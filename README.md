# JustiTalk: Agentic AI Debate Coach & Presentation Analysis Platform

JustiTalk is a full-stack, enterprise-grade dialectic training and presentation intelligence platform. It combines Large Language Models (LLMs), speech recognition, formal argument mining, and cognitive rhetoric evaluation to coach users into championship-level debaters, public speakers, and critical thinkers.

![JustiTalk Platform](frontend/dist/vite.svg)

---

## 1. System Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Recharts, Lucide React, Axios.
  - Faithful recreation of the JustiTalk design system: warm cream background (`#FAF8F3`), signature warm golden yellow accent (`#D49B19`), dark navy/charcoal typography (`#1E242B`), rounded content cards (`rounded-2xl`), and soft shadows.
- **Backend**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, JWT Authentication (`python-jose`, `bcrypt`).
- **Database**: PostgreSQL (production / Docker Compose) with automated SQLite zero-config local development fallback.
- **AI & Speech**:
  - LLM Reasoning & Agentic Workflows: OpenAI GPT-4o with structured JSON schema outputs.
  - Speech & Audio: OpenAI Whisper speech-to-text, audio duration estimation, WPM calculation, filler word frequency breakdown.
  - Fallacy Detection: Deep structural auditing across 8 classical fallacies.
  - Reporting: ReportLab PDF dossier generation & OpenPyXL Excel reporting.

---

## 2. Key Modules & Capabilities

### 1. Multi-Role Authentication & Access Control (RBAC)
- **Learner**: Practice against AI, submit arguments, track skill development, receive personalized coaching plans.
- **Debate Coach**: Monitor debater trajectories, inspect argument strengths/weaknesses, calibrate adjudications.
- **Educator**: Institutional performance tracking, student rankings, cohort analytics.
- **Administrator**: Full user governance, role elevation, system telemetry, and AI inference monitoring.
- *Includes a one-click Role Switcher in the top navigation for immediate multi-role evaluation.*

### 2. Interactive AI Debate Simulation Arena
- Motion selection (presets or custom resolutions).
- Position assignment (**For** or **Against**).
- 4 AI difficulty tiers: **Novice**, **Intermediate**, **Advanced**, and **Master**.
- Multi-round debate turns with context-retaining dialogue memory.
- Real-time round feedback pill with turn scores, fallacy warnings, and coaching tips.
- Official match adjudication modal calculating performance using the **strict weighted formula**:
  - **Argument Quality**: 30%
  - **Evidence Usage**: 20%
  - **Logical Consistency**: 20%
  - **Rebuttal Effectiveness**: 15%
  - **Communication Skills**: 15%
- One-click official PDF Adjudication Dossier export.

### 3. AI Argument Analysis Engine
- Main claim extraction and premise mapping.
- Evidence quality assessment and identification of missing proof.
- Strengths and vulnerabilities breakdown.
- Multi-dimensional scoring: Clarity, Relevance, Evidence Strength, Logical Consistency, and Persuasiveness.

### 4. Logical Fallacy Detection Engine
Audits texts against 8 informal and formal logical fallacies:
1. **Ad Hominem**
2. **Straw Man**
3. **False Dilemma**
4. **Slippery Slope**
5. **Appeal to Authority**
6. **Circular Reasoning**
7. **Hasty Generalization**
8. **Red Herring**
- Pinpoints the exact problematic sentence segment.
- Explains the mechanical reasoning breakdown.
- Provides an adjudicated clean rewritten alternative that preserves valid debate intent.
- Zero false positives on clean logical arguments.

### 5. Multi-Perspective Counterargument Generator
Dissects an opponent's argument across 5 analytical dimensions:
- Logical Rebuttals (reasoning gaps and non-sequiturs).
- Evidence-Based Rebuttals (conflicting empirical studies).
- Ethical Counterarguments (distributive justice and moral hazards).
- Practical Counterarguments (fiscal and implementation bottlenecks).
- Policy Counterarguments (statutory barriers and enforceability).
- Cross-examination trap questions and high-level debate strategy frames.

### 6. Presentation & Speech Analytics Engine
- Audio file upload (WAV, MP3, M4A, WEBM) or live browser microphone recording.
- Automatic Whisper transcription.
- Cadence evaluation (Words Per Minute / WPM) categorized as Deliberate, Optimal (110-155 WPM), or Rushed.
- Filler word frequency counter (`um`, `uh`, `like`, `you know`, `basically`, etc.).
- Transparently designated inferred metrics: Confidence Score, Clarity Score, Audience Engagement Score.

### 7. AI Coaching & Recommendation Engine
- Analyzes user's historical scores and identifies lowest-performing dimensions.
- Generates tailored practice drills (e.g. *The 3-Stat Scaffold Drill*, *Vocal Cadence Metronome*, *Turn-the-Table Refutation*).
- Customized weekly learning pathways and communication tips.

---

## 3. Quick Start Guide

### Option A: Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -c "from app.core.database import engine, Base, SessionLocal; from app.services.seed_data import seed_database; Base.metadata.create_all(bind=engine); db = SessionLocal(); seed_database(db); db.close()"
uvicorn app.main:app --reload --port 8000
```
*The backend starts at `http://localhost:8000`. Database tables and initial seed data are created automatically on launch.*

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The frontend development server starts at `http://localhost:3000` with automatic API proxying to `http://localhost:8000`.*

---

### Option B: Docker Compose Deployment

To spin up PostgreSQL, the FastAPI backend, and the Nginx-served frontend in isolated containers:

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API & Swagger Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

---

## 4. Default Seed Accounts

All accounts use the password: `password123`

| Role | Email | Features |
|---|---|---|
| **Administrator** | `admin@justitalk.com` | User governance, system telemetry, full platform access |
| **Learner** | `learner@justitalk.com` | Multi-turn debate sparring, presentations, skill radar |
| **Debate Coach** | `coach@justitalk.com` | Debater monitoring, rubric calibrations, coaching feedback |
| **Educator** | `educator@justitalk.com` | Class cohort analytics, rankings, assessment dossiers |

---

## 5. API Reference Summary

- `POST /api/auth/login`: Issue JWT token
- `GET /api/auth/me`: Current user session
- `GET /api/analytics/dashboard`: Metric cards and Recharts analytics data matching the JustiTalk UI
- `POST /api/debates/`: Create debate session
- `POST /api/debates/{id}/turn`: Submit turn and receive AI opponent counterargument + instant feedback
- `POST /api/debates/{id}/evaluate`: Finalize debate and compute weighted score formula
- `GET /api/debates/{id}/export/pdf`: Download ReportLab PDF dossier
- `POST /api/arguments/analyze`: Extract claims, evidence, and 0-100 scores
- `POST /api/fallacies/detect`: Audit text against the 8 core fallacies
- `POST /api/counterarguments/generate`: Generate 5-lens rebuttals and traps
- `POST /api/presentation/analyze-audio`: Upload speech recording for Whisper transcription and WPM/filler analysis
- `GET /api/coaching/recommendations`: Retrieve personalized learning drills
- `GET /api/admin/users`: List users and toggle account access
- `GET /api/admin/system-metrics`: Service telemetry and AI model status
