# ArgueWell - Debate Coaching & Presentation Analysis

ArgueWell is a runnable MVP for practicing debate and presentation skills. It combines authenticated learner profiles, transcript analysis, fallacy detection, counterargument rehearsal, scoring, delivery metrics, coaching recommendations, and a progress dashboard.

## Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic, JWT authentication
- **Frontend:** responsive static app (vanilla JavaScript and CSS) served by FastAPI
- **Storage:** SQLite by default; PostgreSQL-ready through `DATABASE_URL`
- **Analysis:** deterministic, explainable baseline analyzer designed to be replaceable with an LLM/audio pipeline

## Run locally

```powershell
cd "Agentic-AI-Debate-Coaching-and-Intelligent-Presentation-Analysis-Platform-Project"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Open http://localhost:8000. API documentation is available at http://localhost:8000/docs.

## Configuration

`.env.example` documents the supported settings. For PostgreSQL, install a driver such as `psycopg[binary]` and set a connection string such as `postgresql+psycopg://user:password@localhost/debate_coach`.

## API highlights

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `PATCH /api/profile`
- `POST /api/sessions` - analyze a transcript and persist a session
- `GET /api/sessions`, `GET /api/sessions/{id}`, `GET /api/sessions/{id}/report`
- `GET /api/dashboard`
- `GET /api/health`

All session, profile, dashboard, and report routes require a bearer token returned by the authentication endpoints.

## Test

```powershell
pytest -q
```

The MVP intentionally keeps analysis local and transparent. A production evolution can add audio upload/transcription, richer claim extraction, background jobs, and an LLM provider behind the `analyze_transcript` interface.
