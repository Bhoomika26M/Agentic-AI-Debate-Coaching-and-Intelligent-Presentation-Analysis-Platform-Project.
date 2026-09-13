# Agentic AI Debate Coach & Presentation Analysis Platform

Milestone 1 establishes a clean full-stack foundation for a future debate coaching product. This milestone includes project scaffolding, PostgreSQL persistence, authentication architecture, basic user/profile/skill/debate contracts, and a responsive React shell. AI argument analysis, fallacy detection, counterargument generation, AI debate opponents, speech analysis, and presentation analytics are intentionally deferred.

## Technology Stack

- Frontend: React, Vite, JavaScript, React Router, Axios
- Backend: FastAPI, Uvicorn, SQLAlchemy, Pydantic, PostgreSQL
- Security: JWT foundation, Passlib bcrypt hashing
- Migrations: Alembic
- Development: Git, Docker Compose, VS Code

## Project Structure

```text
debate-coach-platform/
├── frontend/                  # Vite React application
├── backend/                   # FastAPI application and Alembic
├── docs/                      # Architecture, database, API, and wireframes
├── docker-compose.yml         # PostgreSQL only
├── .gitignore
└── README.md
```

## Prerequisites

Install Node.js 20+, Python 3.11+, Git, and Docker Desktop. PostgreSQL can be supplied by Docker Compose or a local PostgreSQL installation.

## PostgreSQL Setup

From the project root:

```powershell
docker compose up -d postgres
```

The default development connection is `postgresql://postgres:password@localhost:5432/debate_coach`. Change `POSTGRES_PASSWORD` and `DATABASE_URL` for a different credential.

## Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

The backend runs at http://localhost:8000.

## Frontend Setup

In a second terminal:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend runs at http://localhost:5173.

## Environment Variables

Backend `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/debate_coach
SECRET_KEY=change_this_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Only the example files are committed. Never commit real credentials or `.env` files.

## Database Migrations

The initial migration is included. Apply it with:

```powershell
cd backend
alembic upgrade head
```

After changing SQLAlchemy models, generate a migration and apply it:

```powershell
alembic revision --autogenerate -m "describe schema change"
alembic upgrade head
```

## API Documentation

Once the backend is running, FastAPI provides Swagger UI at http://localhost:8000/docs and ReDoc at http://localhost:8000/redoc. Health checks are available at `/` and `/health`.

## Milestone 1 Scope

Included: modular backend and frontend structure, PostgreSQL database foundation, initial schema and migration, JWT/password security utilities, role dependency foundation, auth endpoints, basic profile and skill endpoints, debate CRUD and participant endpoints, Axios configuration, and placeholder UI routes.

Not included: AI argument analysis, fallacy detection, counterargument generation, AI debate opponent, speech analysis, presentation analytics, or advanced coaching workflows.

## Future Milestones

Later milestones can add domain services and UI on top of these stable contracts without changing the initial project layout.
