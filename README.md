# 🧠 DebateCoach AI — Agentic AI Debate Coach & Presentation Analysis Platform

An AI-powered platform that helps users improve debating, public speaking, critical thinking, and presentation skills through agentic reasoning, logical fallacy detection, argument mining, speech intelligence, and multi-turn AI sparring.

---

## 🗂️ Project Structure

```
debate/
├── .gitignore                      # Git ignore rules protecting DB, secrets & node_modules
├── frontend/                       # React 19 + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx         # Landing page
│   │   │   ├── Login.jsx / Signup  # Authentication & OAuth2 SSO
│   │   │   ├── Dashboard.jsx       # 4-Tier Role-Adaptive Dashboard
│   │   │   ├── DebateSessions.jsx  # Session Manager & AI Transcript Evaluator
│   │   │   ├── ArgumentAnalysis.jsx# Milestone 2: Argument & Fallacy Lab
│   │   │   ├── DebateSimulation.jsx# Milestone 3: 8-Persona AI Sparring Arena
│   │   │   ├── Coaching.jsx        # Milestone 3: 4-Week Study Plans & Drills
│   │   │   ├── PresentationAnalysis.jsx # Milestone 4: Speech & Audio Intelligence
│   │   │   ├── Reports.jsx         # Milestone 4: PDF, Excel & CSV Export System
│   │   │   └── Profile.jsx         # User Skill Tracker & Radar
│   │   ├── components/             # Reusable UI components (Navbar with Notifications)
│   │   └── api/client.js           # Axios client with JWT interceptor
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── core/                   # Config, DB connection, JWT security
│   │   ├── models/                 # SQLAlchemy 2.0 ORM models (User, DebateSession, Notification)
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── services/               # Argument Mining, Debate Simulation, Coaching, Presentation
│   │   └── routers/                # Auth, Users, Sessions, Analysis, Simulation, Coaching, Presentation, Reports, Notifications
│   ├── tests/
│   │   ├── test_milestone1.py      # Milestone 1 automated tests (6/6 passing)
│   │   ├── test_milestone2.py      # Milestone 2 automated tests (7/7 passing)
│   │   ├── test_milestone3.py      # Milestone 3 automated tests (7/7 passing)
│   │   └── test_milestone4.py      # Milestone 4 automated tests (7/7 passing)
│   ├── requirements.txt            # Python dependencies (ReportLab, openpyxl, etc.)
│   ├── .env.example                # Environment variable template
│   ├── Dockerfile
│   └── main.py                     # FastAPI application entry point
├── docs/
│   └── PROJECT_COMPLETION_REPORT.md# Unified milestone architecture & completion report (M1–M4)
├── docker-compose.yml              # PostgreSQL + Backend + Frontend container orchestration
└── README.md
```

---

## 🛣️ Milestones Status (100% Complete)

- [x] **Milestone 1 (Week 1 & 2)**: Project Initialization, System Architecture, JWT Auth, OAuth2 SSO, RBAC (4 roles), User Profiles & Skill Tracking, Debate Session Management across 6 formats.
- [x] **Milestone 2 (Week 3 & 4)**: Argument Analysis Engine, 8-Fallacy Detection Engine, 5-Criteria Evaluation Model, 5-Factor Weighted Scoring Model (30/20/20/15/15), Debate Feedback Reports & Interactive Lab.
- [x] **Milestone 3 (Week 5 & 6)**: AI Debate Simulation Engine (8 Opponent Personas), Multi-turn Sparring Opponent, Typed Counterargument Generation (5 Types), 4-Week Study Plans & Drill Library.
- [x] **Milestone 4 (Week 7 & 8)**: Speech & Presentation Analytics (WPM, Fillers, Confidence, Audio Upload), Multi-Format Export System (Executive PDF & Excel .xlsx), Notification & Engagement System, Role-Adaptive Dashboards & Full Docker Containerization.

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

# Configure environment (defaults to local SQLite fallback if Postgres is unavailable)
copy .env.example .env

# Run automated test suite (All 4 Milestones: 27/27 Passing)
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

### 3. Docker Container Deployment

```bash
# Build and run PostgreSQL, FastAPI backend, and Nginx React frontend
docker-compose up --build
```

---

## 📡 API Endpoints Summary

### Milestone 1: Authentication, Users & Sessions
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user (4 roles) | Public |
| POST | `/api/v1/auth/login` | Login and receive JWT access token | Public |
| POST | `/api/v1/auth/oauth2/login` | OAuth2 SSO Login (Google, GitHub, SAML) | Public |
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

### Milestone 3: AI Debate Simulation & Coaching
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/v1/simulation/personas` | Catalog of 8 AI opponent personas with styles | Authenticated |
| POST | `/api/v1/simulation/start` | Launch debate arena against chosen persona | Authenticated |
| POST | `/api/v1/simulation/turn` | Submit speech and receive counter-speech & challenge | Authenticated |
| POST | `/api/v1/simulation/counterarguments` | Generate typed counterarguments (5 types) | Authenticated |
| POST | `/api/v1/coaching/recommendations` | Personalized coaching recommendations | Authenticated |
| POST | `/api/v1/coaching/learning-plan` | Generate personalized 4-week learning path | Authenticated |
| POST | `/api/v1/coaching/skill-gap` | Analyze skill gaps against 80-point benchmark | Authenticated |
| GET | `/api/v1/coaching/drills` | Browse and filter debate drill library | Authenticated |

### Milestone 4: Presentation Analytics, Reports & Notifications
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/presentation/analyze` | Evaluate speech delivery, WPM, fillers, confidence | Authenticated |
| POST | `/api/v1/presentation/upload-audio` | Speech extraction & acoustic analysis on audio file | Authenticated |
| GET | `/api/v1/presentation/history` | Retrieve user's historical presentation analyses | Authenticated |
| GET | `/api/v1/presentation/tips` | Curated delivery and structure tips by category | Authenticated |
| GET | `/api/v1/reports/performance` | Aggregated user performance analytics report | Authenticated |
| GET | `/api/v1/reports/debate` | Debate metrics by format and win streak | Authenticated |
| GET | `/api/v1/reports/presentation` | Speech delivery history & filler word rates | Authenticated |
| GET | `/api/v1/reports/coaching` | Growth priorities and drill progress report | Authenticated |
| GET | `/api/v1/reports/learning-progress` | Weekly goals and milestones tracking | Authenticated |
| GET | `/api/v1/reports/export/pdf` | Generate executive PDF report download (ReportLab) | Authenticated |
| GET | `/api/v1/reports/export/excel` | Generate multi-sheet Excel .xlsx workbook (openpyxl) | Authenticated |
| GET | `/api/v1/reports/export/csv` | Tabular CSV sessions export download | Authenticated |
| GET | `/api/v1/reports/admin/overview` | Platform-wide analytics overview | Admin / Coach / Educator |
| GET | `/api/v1/notifications/` | List notifications & engagement alerts with unread count | Authenticated |
| PUT | `/api/v1/notifications/{id}/read`| Mark specific notification as read | Authenticated |
| PUT | `/api/v1/notifications/read-all`| Mark all notifications as read | Authenticated |
| POST | `/api/v1/notifications/create` | Create personal reminder or targeted alert | Authenticated |
| POST | `/api/v1/notifications/announcement` | Broadcast platform announcement | Admin / Coach / Educator |

---

## 🧠 8 Supported Logical Fallacies

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

## 🔒 Safe Git Configuration

```bash
git add .
git commit -m "Complete Milestones 1 to 4: Auth, Argument Mining, AI Simulation, Presentation Prosody, PDF/Excel Exports & Notifications"
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```