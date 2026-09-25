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
uvicorn backend.app.main:app --reload
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
- `POST /api/sessions/{id}/counterarguments`, `GET /api/coaching/plan`
- `POST /api/presentations/analyze` and `POST /api/presentation-analysis`
- `GET /api/sessions/{id}/export?format=json|csv`
- `GET /api/health`

All session, profile, dashboard, and report routes require a bearer token returned by the authentication endpoints.

## Docker deployment

```powershell
Copy-Item .env.example .env
# Set a long random SECRET_KEY in .env before deployment
docker compose up --build
```

The container serves the API and static frontend on port 8000. Back up the
`debate_data` volume, and use PostgreSQL via `DATABASE_URL` for multi-instance production.

## Test

```powershell
pytest -q
```

The backend source lives in `backend/app/`, the frontend source lives in `frontend/`, and tests live in `tests/`.

The MVP intentionally keeps analysis local and transparent. A production evolution can add audio upload/transcription, richer claim extraction, background jobs, and an LLM provider behind the `analyze_transcript` interface.
