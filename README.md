# Agentic AI Debate Coach & Presentation Analysis Platform (DebateIQ)

An enterprise-grade, college-level full-stack AI platform built to train users in competitive debating, public speaking, argument construction, logical reasoning, and presentation slide design.

---

## Key Features

1. **Pluggable AI Service Layer**: Abstract provider design (`BaseAIService`) supporting **Gemini API** with rigid Pydantic structured output validation, alongside deterministic **MockAIService** for offline testing.
2. **Toulmin Argument Decomposition**: Dissects arguments into Claim, Grounds, Warrant, and Qualifiers with rubric scores for clarity, relevance, evidence, logic, and persuasiveness.
3. **Argument Analysis and Fallacy Detection**: Produces an evidence-aware report with cited excerpts, confidence, reasoning weaknesses, recommendations, and an improved argument. The eight supported fallacies are Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, and Red Herring.
4. **AI Debate Simulation and Coaching**: Create a topic-specific, multi-turn debate, select a FOR/AGAINST position and difficulty, review opponent counterarguments, and finish with a saved evaluation. Gemini is used when configured; otherwise, responses identify their rule-based baseline.
5. **Speech & Verbal Cadence Studio**: Analyzes speaking pace (Words Per Minute), detects filler words ("um", "like", "basically"), and critiques verbal articulation.
6. **Presentation Slide Deck Analyzer**: Upload PDF slide decks to evaluate text density, visual hierarchy, bullet-point overload, and clarity.
7. **Longitudinal Skill Tracking & Analytics**: Interactive Recharts Radar charts, progress trajectory lines, and fallacy frequency breakdowns.
8. **Role-Based Access Control (RBAC)**: Custom workflows for **Learners**, **Debate Coaches**, **Educators**, and **Administrators**.

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

# Use the repository virtual environment in Windows PowerShell
..\venv\Scripts\Activate.ps1

# Copy .env.example to .env in backend/ and set a Django secret key.
# GEMINI_API_KEY is optional; without it, the rule-based baseline is used.

# Apply additive schema migrations (existing SQLite data is preserved)
python manage.py migrate

# Optional: seed sample users and collegiate debate topics
python seed_data.py

# Run backend development server
python manage.py runserver 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install the dependencies described in package.json when needed
npm install

# Start Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173` and communicate with `http://localhost:8000/api/v1`.
Set `VITE_API_BASE_URL` in `frontend/.env` only when the backend API uses a different address.

### Argument analysis

- `POST /api/v1/arguments/analyze/` accepts `argument_text`, optional `context`, and an optional authenticated user's `debate_session_id`. Anonymous analysis is allowed but not persisted. Authenticated reports are saved against the user.
- `POST /api/v1/arguments/fallacies/` returns possible fallacies and an explicit uncertain/no-clear-fallacy response when none is supported.
- `GET /api/v1/arguments/history/` and `GET /api/v1/arguments/<report-uuid>/` require JWT authentication and are restricted to the requesting user.
- The configured Gemini provider is used when `AI_PROVIDER=gemini` and `GEMINI_API_KEY` is set. Otherwise, the interface reports that it used the transparent rule-based baseline. The baseline uses conservative text patterns and is not a substitute for contextual human review.
- Overall quality is the weighted mean of clarity (15%), relevance (15%), evidence (25%), logical consistency (30%), and persuasiveness (15%). Override these defaults with `ARGUMENT_SCORE_WEIGHTS` as a JSON object containing all five dimensions; weights are normalized before averaging.

### Debate simulation, coaching, and progress

- Sign in and open **Debates** to enter a topic, choose FOR or AGAINST, set difficulty, and start a saved session.
- `POST /api/v1/debates/sessions/` creates an authenticated debate. AI stance is assigned opposite to the user's stance.
- `GET /api/v1/debates/sessions/` lists only the signed-in user's sessions; `GET /api/v1/debates/sessions/<session-uuid>/` retrieves one owned session and its ordered turns.
- `POST /api/v1/debates/sessions/<session-uuid>/submit-turn/` submits an argument and returns an AI response with counterargument, rebuttal, alternative perspective, evidence guidance, question, and response suggestions. Include a unique `client_turn_id` UUID to make retries idempotent.
- `POST /api/v1/debates/sessions/<session-uuid>/conclude/` completes the debate and saves an evaluation based on recorded argument analysis.
- `GET /api/v1/coaching/recommendations/` and `GET /api/v1/coaching/learning-plan/` return recommendations and activities based on available saved scores. `POST /api/v1/coaching/learning-plan/` refreshes the plan; `PATCH /api/v1/coaching/learning-plan/activities/<activity-id>/` updates completion.
- `GET /api/v1/analytics/overview/` returns only the signed-in user's saved debate and argument metrics. With no completed sessions, scores remain empty rather than showing demonstration values.
- The rule-based opponent and learning plan do not claim verified external facts. The rule-based rebuttal-responsiveness score is based on word overlap and is not a semantic evaluation. Gemini prompts request grounded responses but generated content should still be checked.

### Environment variables

Backend variables are documented in `backend/.env.example`: `DJANGO_SECRET_KEY`, `DEBUG`, `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `ARGUMENT_SCORE_WEIGHTS`. Keep API keys in the backend environment only; do not add them to frontend variables.

Frontend's optional `VITE_API_BASE_URL` is documented in `frontend/.env.example`.

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
..\venv\Scripts\python.exe manage.py test apps.debates.tests apps.coaching.tests apps.analytics.tests apps.arguments.tests core.tests
```

Check migration consistency and run frontend build/lint checks:

```bash
cd backend
..\venv\Scripts\python.exe manage.py makemigrations --check --dry-run
cd ..\frontend
npm run build
npm run lint
```
