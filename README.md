# 🧠 DebateCoach AI

An AI-powered debate coaching and presentation analysis platform. Built for students, educators, and coaches to train, evaluate, and improve debate skills using live Gemini AI reasoning with deterministic fallback.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 Async, SQLite (dev) |
| **Frontend** | React 19, Vite, React Router |
| **AI** | Google Gemini API (`gemini-3.5-flash-lite`) with heuristic fallback |
| **Auth** | JWT (Bearer), bcrypt, role-based route guards |
| **Exports** | ReportLab (PDF), openpyxl (Excel), CSV |

---

## 🎭 Roles & Permissions

| Role | Can Do |
|---|---|
| **Learner** | Join sessions, use AI tools, download personal report |
| **Coach** | Create & grade sessions, view assigned student reports |
| **Educator** | Create sessions, manage classes, view cohort reports, download personal report |
| **Admin** | Full platform management, individual personal report (not counted in aggregates) |

> **Registration Note:** Public signup supports **Learner**, **Coach**, and **Educator** roles. Platform **Admin** accounts are protected and cannot be registered via public signup.

---

## 🚀 Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend (FastAPI on port 8000)

```bash
cd backend

# Windows
venv\Scripts\activate

# Configure AI key (optional — platform works without it in fallback mode)
# Edit backend/.env and set:  GEMINI_API_KEY=your_key_here

# Start server
uvicorn main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### 2. Frontend (React + Vite on port 5173)

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

### 3. Run Tests

```bash
# From project root
backend\venv\Scripts\pytest backend\tests\ -v
```

---

## 🤖 AI Architecture

The platform uses a **hybrid agent** in `backend/app/services/ai_agent.py`:

- **Live mode**: Calls Gemini API with multi-model fallback chain (`gemini-3.5-flash-lite` → `gemini-3.5-flash` → `gemini-2.5-flash`).
- **Offline mode**: Deterministic heuristic engine — all features work, no API key needed.
- Status is shown in the **Navbar AI badge** and can be toggled via the AI Settings modal.

---

## 🗂️ Project Structure

```
debate/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database, security helpers
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # AI engine + analysis engines
│   ├── tests/              # Milestone test suites
│   ├── main.py             # App entry point, router registration
│   └── .env                # Environment config (API keys, DB URL)
└── frontend/
    └── src/
        ├── api/            # Axios client
        ├── components/     # Reusable UI pieces
        ├── context/        # Auth context (JWT state)
        ├── pages/          # Route-level views
        └── styles/         # Modular CSS (variables, base, components, layout, debate)
```

---

## 🔑 API Key Setup

Add to `backend/.env`:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Get a free key from [Google AI Studio](https://aistudio.google.com/).

Alternatively, paste the key directly into the **AI Settings modal** in the app navbar at any time.

---

## 🗄️ Database Access & Management

The platform uses **SQLite** locally at `backend/debate.db`.

### Open the database (read/inspect)

```bash
# Windows (from project root)
backend\venv\Scripts\python -c "
import sqlite3, json
con = sqlite3.connect('backend/debate.db')
cur = con.cursor()
# List all tables
cur.execute('SELECT name FROM sqlite_master WHERE type=table')
print('Tables:', [r[0] for r in cur.fetchall()])
# Show all users
cur.execute('SELECT email, role, is_active FROM users')
print('Users:', cur.fetchall())
con.close()
"
```

### Reset/clean all data (keep admin accounts)

```bash
python -c "import sqlite3, os; [([c.cursor().execute('DELETE FROM ' + t) for t in ['notifications', 'classrooms', 'debate_sessions']], c.cursor().execute('DELETE FROM users WHERE role != \'admin\''), c.cursor().execute('UPDATE users SET avg_score = 0, total_sessions = 0, win_streak = 0, communication_skills = NULL, presentation_history = \'[]\' WHERE role = \'admin\''), c.commit(), c.cursor().execute('VACUUM'), print('Cleaned', p, 'Users:', c.cursor().execute('SELECT email, role FROM users').fetchall()), c.close()) for p in ['backend/debate.db', 'debate.db'] if os.path.exists(p) for c in [sqlite3.connect(p)]]"
```

### Clean activity records while persisting all user accounts

```bash
python -c "import sqlite3, os; [([c.cursor().execute('DELETE FROM ' + t) for t in ['notifications', 'classrooms', 'debate_sessions']], c.cursor().execute('UPDATE users SET total_sessions = 0, presentation_history = \'[]\''), c.commit(), c.cursor().execute('VACUUM'), print('Cleaned [', p, '] - Persisted Users:', len(c.cursor().execute('SELECT email FROM users').fetchall())), c.close()) for p in ['backend/debate.db', 'debate.db'] if os.path.exists(p) for c in [sqlite3.connect(p)]]"
```

### Create a new user manually

```bash
backend\venv\Scripts\python -c "
import sqlite3, uuid, hashlib

email = 'newuser@debate.ai'
password = 'Password123!'   # change this
role = 'learner'            # learner / coach / educator / admin
full_name = 'New User'

# Simple bcrypt-compatible hash (requires passlib installed in venv)
import sys; sys.path.insert(0, 'backend')
from passlib.context import CryptContext
pwd = CryptContext(schemes=['bcrypt']).hash(password)

con = sqlite3.connect('backend/debate.db')
con.execute(
    'INSERT INTO users (id, email, full_name, hashed_password, role) VALUES (?,?,?,?,?)',
    (str(uuid.uuid4()), email, full_name, pwd, role)
)
con.commit(); con.close()
print(f'Created {role}: {email}')
"
```

### Open in DB Browser (GUI)

Download [DB Browser for SQLite](https://sqlitebrowser.org/) and open `backend/debate.db` directly for a visual interface.

---

## 📡 Key API Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/auth/login` | `POST` | Authenticate, receive JWT |
| `/api/v1/auth/register` | `POST` | Create new user account |
| `/api/v1/sessions/` | `GET`/`POST` | Debate session CRUD |
| `/api/v1/analysis/evaluate` | `POST` | Argument mining + 8-fallacy detection |
| `/api/v1/simulation/start` | `POST` | Start AI sparring session |
| `/api/v1/simulation/turn` | `POST` | Submit speech, get AI rebuttal |
| `/api/v1/coaching/recommendations` | `POST` | AI coaching based on skill scores |
| `/api/v1/coaching/learning-plan` | `POST` | Generate 4-week curriculum |
| `/api/v1/presentation/analyze` | `POST` | Speech pacing, filler words, confidence |
| `/api/v1/reports/export/pdf` | `GET` | Download PDF report |
| `/api/v1/reports/export/excel` | `GET` | Download Excel workbook |
| `/api/v1/classes/` | `GET`/`POST` | Class management (educator/admin) |
| `/api/v1/notifications/` | `GET` | User notifications |
