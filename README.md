# Agentic AI Debate Coach & Presentation Analysis Platform

## Milestone 2: deterministic debate analysis

This repository currently contains the Week 1-2 foundation only:

- Modular FastAPI backend structure
- Environment-based application configuration
- Local MongoDB database dependency using PyMongo
- CORS configuration for the local React development server
- JWT authentication with Argon2 password hashing
- Role-based authorization for learners, staff, and administrators
- User, profile, skill, debate, and participant APIs
- MongoDB collections with application-managed indexes
- Isolated backend API tests

Milestone 2 adds MongoDB-backed, deterministic debate analysis. It extracts arguments, scores claim/evidence/reasoning quality, detects supported logical fallacies, suggests counterarguments, and returns actionable feedback without an external LLM dependency.

Architecture, schema, and frontend workflow details are documented in `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/FRONTEND_WORKFLOW.md`.

## Backend Setup

```powershell
cd backend
Copy-Item .env.example .env
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Check the running API at `http://127.0.0.1:8000/health` and its OpenAPI documentation at `http://127.0.0.1:8000/docs`.

## Frontend Setup

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The React application runs at `http://localhost:5173`. Set `VITE_API_URL` in `frontend/.env` to the backend API base URL. The current default is `http://127.0.0.1:8000/api`.

Available frontend routes include `/login`, `/register`, `/dashboard`, `/profile`, `/skills`, `/debates`, `/debates/create`, and `/debates/:id`.

## Database

The backend uses MongoDB. Configure the local database in `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
MONGO_DATABASE=ai_debate_coach
```

Collections and unique indexes are created automatically when the API starts.

## Implemented API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|PUT /api/users/me`
- `GET /api/users` (administrator only)
- `GET|PUT /api/profiles/me`
- `GET|PUT /api/skills/me`
- `POST|GET /api/debates`
- `GET|PUT|DELETE /api/debates/{debate_id}`
- `POST /api/debates/{debate_id}/join`
- `GET /api/debates/{debate_id}/participants`
- `POST /api/debates/{debate_id}/analysis`
- `GET /api/debates/{debate_id}/analysis`

Analysis requests contain a `transcript` string. The report is persisted as one latest report per debate in `analysis_reports`; only the creator, participants, and administrators can create or view it. Scores use transparent weighted heuristics (claim 30%, evidence 25%, reasoning 30%, fallacy control 15%). Invalid or missing debate IDs return `404`, and request validation returns `422`.

Swagger/OpenAPI: `http://127.0.0.1:8000/docs`

## Tests

Tests use an isolated in-memory MongoDB-compatible database and never depend on production data:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

## MongoDB

The application uses a local MongoDB server. Start the MongoDB Windows service
before starting the backend:

```powershell
Get-Service *Mongo*
Start-Service MongoDB
```

The default local connection is configured in `backend/.env.example`.
