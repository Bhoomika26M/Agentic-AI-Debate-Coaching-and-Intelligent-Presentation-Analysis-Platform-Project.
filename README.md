# ArgueWell - Debate Coaching & Presentation Analysis

ArgueWell is a runnable MVP for practicing debate and presentation skills. It combines authenticated learner profiles, transcript analysis, fallacy detection, counterargument rehearsal, scoring, delivery metrics, coaching recommendations, and a progress dashboard.

## Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic, JWT authentication
- **Frontend:** React 18 + Vite dashboard (FastAPI serves `frontend/dist` in production)
- **Storage:** SQLite by default; PostgreSQL-ready through `DATABASE_URL`
- **Analysis:** OpenRouter provider (opt-in via local environment) with deterministic fallback, plus a LangGraph-compatible simulation

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
For frontend development, run `cd frontend; npm install; npm run dev`; Vite proxies
`/api` to `http://localhost:8000`.

## Configuration

`.env.example` documents the supported settings. For PostgreSQL, install a driver such as `psycopg[binary]` and set a connection string such as `postgresql+psycopg://user:password@localhost/debate_coach`.

## API highlights

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/PATCH /api/profile` - profile, experience, topics, domains, goals, preferences, and tracked skills
- `POST /api/sessions` - analyze a transcript and persist a session
- `GET /api/sessions`, `GET /api/sessions/{id}`, `GET /api/sessions/{id}/report`
- `GET /api/dashboard`
- `POST /api/sessions/{id}/counterarguments`, `GET /api/coaching/plan`
- `POST /api/presentations/analyze` and `POST /api/presentation-analysis`
- `GET /api/sessions/{id}/export?format=json|csv|pdf|xlsx`
- `GET /api/health`
- `POST /api/debate/turn` - persistent multi-turn opening/challenge/rebuttal/final evaluation
- `POST /api/media/upload`, `GET /api/media` - validated audio/video uploads and transcript analysis
- `GET /api/role-dashboard` - role-aware capability and progress view
- `PATCH /api/admin/users/{id}/role`, `GET /api/admin/users` - administrator-only role management
- `GET /api/notifications` - reminders, feedback alerts, milestones, and announcements
- `PATCH /api/notifications/{id}/read`, `POST /api/notifications/read-all` - notification state
- `POST /api/admin/notifications` - administrator announcements
- `GET /api/analytics/metrics` - completion, score growth, fallacy, pace, and filler metrics

All session, profile, dashboard, and report routes require a bearer token returned by the authentication endpoints.

Roles are `learner`, `debate_coach`, `educator`, and `administrator`. New accounts are
learners; only administrators can change roles. All AI workflows use OpenRouter when
`OPENROUTER_API_KEY` is set, otherwise the deterministic local fallback is persisted.

New educator and debate-coach registrations require administrator approval. They are
created as pending accounts and cannot sign in until an administrator approves them
from the administrator **Role workspace**. Learner registrations and all existing
accounts remain active; this approval rule applies only to new educator and coach
registrations.

### Coach and educator workflows

The debate coach is the individual-practice specialist: coaches browse learner
profiles, assign targeted debate/presentation exercises, and evaluate the
submissions they receive. The educator manages cohort learning: educators create
classes, enroll learners, maintain curriculum modules, turn a curriculum module
into class work, and review/evaluate every submission from that class.

Learners can open **My classes** to see their educator-led cohorts. Class work is
created for every enrolled learner, appears in **Assignments**, and creates a
notification for the learner. When a learner submits work, the educator receives
an **Assignment submission received** notification and the work appears in the
educator's **Submission review** page. Evaluation sends the learner a feedback
notification. Curriculum is optional for each assignment; selecting a module
uses its title, module type, and description as the class assignment.

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

### AI and media behavior

Set `OPENROUTER_API_KEY` only in the local environment or deployment secret store; it is
never committed or returned by the API. Set `OPENROUTER_MODEL` to the model identifier
you want to use. OpenRouter is used for every hosted AI workflow. The provider falls
back to the explainable local analyzer only if OpenRouter is unavailable or rejects a
request.
Uploads accept supported audio/video MIME types up to `MAX_UPLOAD_SIZE_MB` and
store metadata locally. A supplied transcript is analyzed immediately. If the
optional `openai-whisper` package is installed and `WHISPER_MODEL` is configured,
local transcription runs safely without sending media anywhere; otherwise the
response uses the explicit `deterministic_no_transcript` fallback and persists
that status. Whisper is intentionally optional because it requires a compatible
Python/Torch installation. On a supported Python environment, install it
separately with `python -m pip install openai-whisper`, then restart the backend.
Reports can be downloaded as PDF or Excel workbooks.
Install `langgraph` separately when desired—the debate endpoint remains usable
without it.

Scheduled debates and assignments automatically create reminder notifications
within 24 hours. Coaches create feedback notifications when evaluating
assignments, and administrators can publish announcements to individual users.
The metrics endpoint labels scores as coaching estimates rather than validated
scientific accuracy benchmarks.

Render deployment can use the included `render.yaml`. For production media,
configure object storage and PostgreSQL by setting `DATABASE_URL`; local SQLite
and filesystem storage remain the default for development.


### Specialist-agent routing

AI-backed requests are routed to focused specialists for argument analysis,
fallacy detection, counterargument generation, live debate turns, presentation
delivery coaching, and personalized learning plans. Each structured response is
validated before it is returned or persisted. Session reports keep specialist
recommendations and only accept AI fallacy excerpts that occur in the submitted
transcript. Set `OPENROUTER_API_KEY` in the server environment to enable hosted agent responses;
never put provider keys in frontend code.
When no provider is configured or a request/response fails validation, the API
continues with its deterministic local analysis and coaching fallbacks.
Administrators can inspect the registered agents, provider configuration, and
per-task request/failure logs at `GET /api/admin/ai-monitoring`.
