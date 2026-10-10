# Agentic AI Debate Coach & Presentation Analysis Platform

An AI-powered debate coaching and presentation intelligence platform engineered to evaluate arguments, detect logical fallacies, assess speech effectiveness, simulate high-stakes debate opponents, and deliver personalized coaching pathways.

---

## 🚀 Milestone 1: Week 1 & 2 Completed Deliverables

| Requirement | Implementation Status | Verification |
|---|---|---|
| **Define Project Objectives & Coaching Workflows** | ✅ Fully Documented & Structured | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/WORKFLOWS_AND_WIREFRAMES.md`](docs/WORKFLOWS_AND_WIREFRAMES.md) |
| **System Architecture & Database Schema** | ✅ Designed with Relational ERD & Indexes | [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) |
| **UI Wireframes & Workflow Planning** | ✅ Complete UX flow & Screen Blueprints | [`docs/WORKFLOWS_AND_WIREFRAMES.md`](docs/WORKFLOWS_AND_WIREFRAMES.md) |
| **Backend & Frontend Environments Setup** | ✅ FastAPI + SQLAlchemy + React + Vite | Production-ready structure with tests & Docker |
| **Authentication & RBAC System** | ✅ JWT + bcrypt with 4 User Roles | `Learner`, `Debate Coach`, `Educator`, `Administrator` |
| **User Profile & Skill Tracking Engine** | ✅ 5-Pillar Weighted Performance Scoring | Argument Quality (30%), Evidence (20%), Logic (20%), Rebuttal (15%), Communication (15%) |
| **Debate Session Management** | ✅ 6 Canonical Debate Formats | One-on-One, Parliamentary, Oxford, Policy, Public Forum, AI Simulation |
| **Automated Test Suite** | ✅ 12/12 Passing Pytest Unit & Integration Tests | Auth, RBAC, Profiles, Weighted Scoring, Topic/Session Lifecycles |

---

## 🏛️ Supported Debate Formats
1. **One-on-One Debate:** Direct proposition vs. opposition duel with alternating speaking rounds.
2. **Parliamentary Debate:** British Parliamentary format (Government vs. Opposition, Points of Information).
3. **Oxford Debate:** Formal resolution with pre- and post-debate audience voting swings.
4. **Policy Debate:** Heavy evidence focus, plan vs. counterplan frameworks.
5. **Public Forum Debate:** Rapid crossfire questioning rounds accessible to citizen audiences.
6. **AI Debate Simulation:** Autonomous agent sparring partner calibrated to user skill level.

---

## 📊 Weighted Performance Scoring Model
The platform computes overall debate performance strictly according to the formula:
$$\text{Debate Performance Score} = 0.30 \times \text{Argument Quality} + 0.20 \times \text{Evidence Usage} + 0.20 \times \text{Logical Consistency} + 0.15 \times \text{Rebuttal Effectiveness} + 0.15 \times \text{Communication Skills}$$

Additionally tracks:
- **Speech Pace:** Target 130–160 Words Per Minute (WPM)
- **Confidence Rating:** 0–100%
- **Debates Completed:** Progress accumulator

---

## 🔑 Pre-Seeded Demo Personas (Password: `password123`)

| Role | Email | Name | Focus Area |
|---|---|---|---|
| **Learner** | `learner@debatecoach.ai` | Alex Rivera | Collegiate Debater (AI Ethics & Tech) |
| **Debate Coach** | `coach@debatecoach.ai` | Dr. Marcus Vance | WUDC Finalist & Master Rhetoric Coach |
| **Educator** | `educator@debatecoach.ai` | Prof. Elena Rostova | University Forensics & Class Cohorts |
| **Administrator** | `admin@debatecoach.ai` | System Administrator | Platform & Model Gateway Management |

---

## 🛠️ Quickstart Guide

### 1. Run the Backend (FastAPI)
```bash
cd debate_coach_platform/backend
# Activate virtual environment
..\venv\Scripts\activate   # On Windows
# or: source ../venv/bin/activate # On Unix

# Run server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`
- Redoc API Documentation: `http://127.0.0.1:8000/redoc`

### 2. Run the Frontend (React + Vite)
```bash
cd debate_coach_platform/frontend
npm install
npm run dev
```
- Open your browser at: `http://localhost:5173`

### 3. Run Automated Tests
```bash
$env:PYTHONPATH="debate_coach_platform/backend"
pytest debate_coach_platform/backend/tests -v
```

### 4. Run with Docker Compose
```bash
cd debate_coach_platform
docker-compose up --build
```
Spins up:
- Backend at `http://localhost:8000`
- Frontend at `http://localhost:3000`
- PostgreSQL at `localhost:5432`

---

## 📁 Project Directory Structure
```
debate_coach_platform/
├── backend/
│   ├── app/
│   │   ├── config.py              # Environment & App Settings
│   │   ├── database.py            # SQLAlchemy Engine & Session
│   │   ├── main.py                # FastAPI Application & Lifespan
│   │   ├── seed.py                # Database Seeder (Users, Topics, Sessions)
│   │   ├── models/                # Database Models
│   │   │   ├── user.py            # User & UserRole
│   │   │   ├── profile.py         # Profile & UserSkill
│   │   │   └── debate.py          # DebateTopic, DebateSession, SessionParticipant
│   │   ├── schemas/               # Pydantic v2 Validation Schemas
│   │   ├── security/              # Auth & RBAC Security Layer
│   │   │   ├── hashing.py         # Bcrypt direct hashing
│   │   │   ├── jwt.py             # JWT token issuance
│   │   │   └── rbac.py            # Role enforcement dependencies
│   │   └── routers/               # Modular API Endpoints
│   │       ├── auth.py            # Registration, Login, Current User
│   │       ├── profiles.py        # User Profile Management
│   │       ├── skills.py          # Skill Tracking & Scoring Engine
│   │       ├── debates.py         # Topics, Sessions, Formats & Positions
│   │       └── users.py           # User Administration
│   ├── tests/                     # 12 Pytest Unit & Integration Tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Full interactive UI with tabs & modals
│   │   └── main.jsx               # React entry point
│   ├── index.html                 # Tailwind CSS & Typography
│   ├── vite.config.js             # Vite Dev Server & API Proxy
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md            # High-level architecture & diagrams
│   ├── DATABASE_SCHEMA.md         # Database ERD & table specs
│   └── WORKFLOWS_AND_WIREFRAMES.md# User journeys & UI wireframes
├── docker-compose.yml
└── README.md
```
