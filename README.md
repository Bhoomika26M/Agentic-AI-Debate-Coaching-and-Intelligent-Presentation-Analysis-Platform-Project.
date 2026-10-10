# The Arena — Agentic AI Debate Coach & Presentation Analysis Platform

A modern, production-grade monorepo for intelligent debate coaching, argumentation forensics, and speech presentation mastery.

---

## 🏛️ Architecture Overview

The repository is organized as a clean, decoupled monorepo:

```
├── /frontend           # React 18 + Vite, Tailwind CSS ("The Arena" design system), Framer Motion, TanStack Query
├── /backend            # Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2
├── docker-compose.yml  # PostgreSQL 16, FastAPI backend, Vite frontend
├── .env.example        # Environment variable definitions
└── README.md           # Getting started guide & API docs
```

---

## 🚀 Quickstart with Docker Compose

1. **Clone the repository and prepare environment files:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services (PostgreSQL, Backend, Frontend):**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - **Frontend UI:** [http://localhost:5173](http://localhost:5173)
   - **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Alternative API Docs (ReDoc):** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 👥 Seed Credentials (Pre-loaded)

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@arena.ai` | `Password123!` | System settings, user management, audit |
| **Debate Coach** | `coach@arena.ai` | `Password123!` | Topic authoring, session scheduling, coaching |
| **Educator** | `educator@arena.ai` | `Password123!` | Cohort management, curriculum, debate topics |
| **Learner 1** | `learner1@arena.ai` | `Password123!` | Alexander Hayes (Intermediate) |
| **Learner 2** | `learner2@arena.ai` | `Password123!` | Maya Patel (Beginner) |
| **Learner 3** | `learner3@arena.ai` | `Password123!` | Julian Sterling (Intermediate) |

---

## 🛠️ Local Development (Without Docker)

### Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python app/db/seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing

Run backend test suite:
```bash
cd backend
pytest -v
```
