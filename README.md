# Agentic AI Debate Coach & Presentation Analysis Platform (DebateIQ)

An enterprise-grade, college-level full-stack AI platform built to train users in competitive debating, public speaking, argument construction, logical reasoning, and presentation slide design.

---

## Key Features

1. **Pluggable AI Service Layer**: Abstract provider design (`BaseAIService`) supporting **Gemini API** with rigid Pydantic structured output validation, alongside deterministic **MockAIService** for offline testing.
2. **Toulmin Argument Decomposition**: Dissects arguments into Claim, Grounds, Warrant, and Qualifiers with formal rubric scoring (Logic, Evidence, Persuasiveness, Clarity).
3. **Argument Analysis & Fallacy Review**: Evaluates claim structure, evidence, clarity, relevance, logical consistency, and persuasiveness. Checks for eight specified fallacy types and provides excerpts and suggested corrections. Uses Gemini when configured, otherwise a transparent rule-based baseline.
4. **Interactive AI Debate Opponent Arena**: Saved, multi-turn debate sessions with configurable side and difficulty, turn-by-turn rebuttal coaching, retry-safe submissions, and evidence-based completion reports.
5. **Personalized Learning Plan**: Performance-based recommendations and persisted practice activities derived from a learner's recent completed debates.
6. **User-specific Progress Dashboard**: Debate history, score trends, fallacy frequencies, and learning activity completion calculated from the signed-in user's saved data.
7. **Speech & Verbal Cadence Studio**: Analyzes speaking pace (Words Per Minute), detects filler words ("um", "like", "basically"), and critiques verbal articulation.
8. **Presentation Slide Deck Analyzer**: Upload PDF slide decks to evaluate text density, visual hierarchy, bullet-point overload, and clarity.
9. **Longitudinal Skill Tracking & Analytics**: Interactive Recharts visualizations based on saved user performance.
10. **Role-Based Access Control (RBAC)**: Custom workflows for **Learners**, **Debate Coaches**, **Educators**, and **Administrators**.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Axios, Recharts, Lucide Icons.
- **Backend**: Python 3.14, Django 6, Django REST Framework, SimpleJWT, Pydantic, PyPDF, django-cors-headers.
- **AI**: Google Gemini API (`google-genai` SDK) with structured JSON schemas.

---

## Quickstart Guide

### 1. Backend Setup

```bash
cd backend

# Virtual environment is already created at ../venv
# Activate virtual environment (Windows PowerShell)
..\venv\Scripts\Activate.ps1

# Run migrations (already initialized)
python manage.py migrate

# Seed sample users and collegiate debate topics
python seed_data.py

# Run backend development server
python manage.py runserver 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173` and communicate with `http://localhost:8000/api/v1`.

### Argument analysis configuration

Argument analysis uses the Gemini provider when `AI_PROVIDER=gemini` and a valid `GEMINI_API_KEY` is configured. Otherwise, `AI_PROVIDER=mock` uses deterministic text heuristics. The baseline does not verify facts and may miss context or fallacy patterns; its scores are coaching estimates, not objective measurements.

`ARGUMENT_SCORE_WEIGHTS` optionally sets the normalized overall score weights as a JSON object. The dimensions must be `clarity`, `relevance`, `evidence`, `logic`, and `persuasiveness`; values must be non-negative and at least one must be positive. The default is 15%, 15%, 25%, 30%, and 15%, respectively.

### Debate practice and personalized coaching

Milestone 3 adds persisted debate sessions, turn analyses, and final evaluations. Select a resolution, stance, and difficulty in the Debate Arena. Each submitted turn includes a client-generated idempotency key so retrying a timed-out request does not create duplicate saved turns. Final evaluations summarize saved turn scores and report when there is not enough data to score.

Learning-plan recommendations are calculated from the learner's recent completed debate evaluations. Activities can be marked complete and are stored per user. Analytics and coaching endpoints require authentication and return only the signed-in user's data.

Authenticated argument analyses are saved to the existing SQLite database and can be listed or retrieved by their owner. Run `python manage.py migrate` from `backend` to apply the additive argument-report migration; it preserves existing records.

The argument API endpoints are:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/arguments/analyze/` | Analyze an argument; saves a report for authenticated users |
| `POST` | `/api/v1/arguments/fallacies/` | Return possible supported fallacies and an uncertain/no-match status |
| `GET` | `/api/v1/arguments/history/` | List the authenticated user's saved reports |
| `GET` | `/api/v1/arguments/<uuid>/` | Retrieve one of the authenticated user's reports |

Analysis requests accept `argument_text` (required, up to 10,000 characters), optional `context` (up to 2,000 characters), and an optional `debate_session_id` belonging to the authenticated user.

Milestone 3 endpoints include:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET/POST` | `/api/v1/debates/sessions/` | List the user's sessions or start a debate |
| `GET` | `/api/v1/debates/sessions/<uuid>/` | Retrieve the user's saved turns and evaluation |
| `POST` | `/api/v1/debates/sessions/<uuid>/submit-turn/` | Submit a turn with `argument_text` and optional UUID `client_turn_id` |
| `POST` | `/api/v1/debates/sessions/<uuid>/conclude/` | Save the final data-based evaluation |
| `GET` | `/api/v1/coaching/recommendations/` | Get recommendations from recent performance |
| `GET/POST` | `/api/v1/coaching/learning-plan/` | Retrieve or refresh the user's learning plan |
| `PATCH` | `/api/v1/coaching/learning-plan/activities/<id>/` | Update an activity's `completed` state |
| `GET` | `/api/v1/analytics/overview/` | Get user-specific metrics and recent activity |
| `GET` | `/api/v1/analytics/skills-radar/` | Get computed skill averages where scores exist |

Run `python manage.py migrate` from `backend` to apply the additive debate and coaching migrations. Existing SQLite data is preserved.

---

## Pre-Seeded Demonstration Accounts

All accounts share the password: `password123` (Admin: `adminpassword123`):

| Role | Username | Password |
| :--- | :--- | :--- |
| **Learner** | `alex_debater` | `password123` |
| **Debate Coach** | `sarah_coach` | `password123` |
| **Educator** | `prof_harrison` | `password123` |
| **Administrator** | `admin` | `adminpassword123` |

---

## Testing

Run the automated backend test suite:

```bash
cd backend
..\venv\Scripts\python.exe manage.py test
```
