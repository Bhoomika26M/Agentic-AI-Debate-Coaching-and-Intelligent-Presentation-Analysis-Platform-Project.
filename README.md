# 🧠 DebateCoach AI — Agentic AI Debate Coach & Presentation Analysis Platform

An AI-powered platform that helps users improve debating, public speaking, critical thinking, and presentation skills through agentic reasoning, logical fallacy detection, argument mining, and speech intelligence.

---

## 🗂️ Project Structure

```
debate/
├── .gitignore                      # Git ignore rules protecting DB, secrets & node_modules
├── frontend/                       # React 19 + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx         # Landing page
│   │   │   ├── Login.jsx / Signup  # Authentication
│   │   │   ├── Dashboard.jsx       # Role-adaptive Dashboard
│   │   │   ├── DebateSessions.jsx  # Session Manager & AI Transcript Evaluator
│   │   │   ├── ArgumentAnalysis.jsx# Milestone 2: Argument & Fallacy Lab
│   │   │   └── Profile.jsx         # User Skill Tracker & Radar
│   │   ├── components/             # Reusable UI components
│   │   └── api/client.js           # Axios client with JWT interceptor
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── core/                   # Config, DB connection, JWT security
│   │   ├── models/                 # SQLAlchemy 2.0 ORM models (User, DebateSession)
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── services/               # Milestone 2: Argument Analysis & Fallacy Engine
│   │   └── routers/                # Auth, Users, Sessions, Analysis endpoints
│   ├── tests/
│   │   ├── test_milestone1.py      # Milestone 1 automated tests (6/6 passing)
│   │   └── test_milestone2.py      # Milestone 2 automated tests (7/7 passing)
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile
│   └── main.py                     # FastAPI application entry point
├── docs/                           # Architecture, Google Meet Presentation Guide & Reports
├── docker-compose.yml              # PostgreSQL + backend container orchestration
└── README.md
```

---

## 🛣️ Milestones Status

- [x] **Milestone 1 (Week 1 & 2)**: Project Initialization, System Architecture, JWT Auth, RBAC (4 roles), User Profiles & Skill Tracking, Debate Session Management across 6 formats.
- [x] **Milestone 2 (Week 3 & 4)**: Argument Analysis Engine, 8-Fallacy Detection Engine, 5-Criteria Evaluation Model, 5-Factor Weighted Scoring Model (30/20/20/15/15), Debate Feedback Reports & Interactive Lab.
- [ ] **Milestone 3 (Week 5 & 6)**: AI Debate Simulation Engine, Multi-turn Sparring Opponent, Counterargument Generation & Coaching Plans.
- [ ] **Milestone 4 (Week 7 & 8)**: Speech & Presentation Analytics (Whisper, Pitch, Filler Word Mining), Final Docker/Cloud Deployment.

---

## 🚀 Quick Start

### 1. Backend (FastAPI)

```bash
cd backend

# Create virtual environment (optional)
python -m venv venv
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment (defaults to local SQLite if Postgres is unavailable)
copy .env.example .env

# Run automated test suite (Milestones 1 & 2)
pytest -v

# Start FastAPI server
uvicorn main:app --reload --port 8000
# → Swagger UI: http://localhost:8000/docs
```

### 2. Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
# → http://localhost:5173
```

---

## 📡 API Endpoints Summary

### Milestone 1: Authentication, Users & Sessions
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user (4 roles) | Public |
| POST | `/api/v1/auth/login` | Login and receive JWT access token | Public |
| GET | `/api/v1/users/me` | Fetch authenticated user profile & skills | Authenticated |
| PUT | `/api/v1/users/me` | Update bio, goals, and communication skills | Authenticated |
| GET | `/api/v1/users/students` | List student roster | Coach / Educator / Admin |
| GET | `/api/v1/sessions/` | List debate sessions (RBAC filtered) | Authenticated |
| POST | `/api/v1/sessions/` | Create debate session (6 formats) | Authenticated |
| GET | `/api/v1/sessions/{id}` | Get session details | Owner / Coach / Admin |
| PUT | `/api/v1/sessions/{id}` | Update session metadata & speech transcript | Owner / Coach / Admin |
| PUT | `/api/v1/sessions/{id}/evaluate` | Coach evaluation with rubric and score | Coach / Educator / Admin |
| DELETE | `/api/v1/sessions/{id}` | Delete session | Owner / Admin |

### Milestone 2: Argument Mining & Fallacy Detection
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/v1/analysis/fallacies` | Catalog of 8 supported fallacies with definitions and fixes | Public |
| POST | `/api/v1/analysis/evaluate` | Instant AI analysis of arbitrary speech transcript | Authenticated |
| POST | `/api/v1/analysis/session/{id}` | Run AI analysis on session transcript & save rubric score | Owner / Coach / Admin |
| GET | `/api/v1/analysis/session/{id}/report`| Retrieve detailed argument analysis report | Owner / Coach / Admin |

---

## 🧠 8 Supported Logical Fallacies

The platform's analytical engine detects and explains the following 8 formal & informal fallacies:

1. **Ad Hominem**: Attacking speaker character instead of argument substance.
2. **Straw Man**: Distorting or exaggerating the opposing view to easily refute it.
3. **False Dilemma**: Artificial binary framing ignoring viable middle alternatives.
4. **Slippery Slope**: Unsubstantiated claims of catastrophic chain reactions.
5. **Appeal to Authority**: Citing celebrity or irrelevant authority without empirical data.
6. **Circular Reasoning**: Presupposing the conclusion in the premise.
7. **Hasty Generalization**: Drawing universal conclusions from isolated anecdotes.
8. **Red Herring**: Introducing distracting tangents to evade the central resolution.

---

## ⚖️ Weighted Scoring Model

```
Debate Performance Score =
  (Argument Quality * 30%)
+ (Evidence Usage * 20%)
+ (Logical Consistency * 20%)
+ (Rebuttal Effectiveness * 15%)
+ (Communication Skills * 15%)
```

---

## 🔒 Pushing to GitHub (Safe Git Configuration)

The repository includes a strict `.gitignore` preventing accidental leaks:
- Secrets & `.env` files are ignored.
- Local databases (`debate.db`, `*.sqlite`) are ignored.
- `node_modules/` and build artifacts (`dist/`) are ignored.
- Bytecode (`__pycache__/`, `*.pyc`) and test caches (`.pytest_cache`) are ignored.

```bash
git add .
git commit -m "Complete Milestone 1 & Milestone 2: Auth, Session Management, Argument Analysis & Fallacy Engine"
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```