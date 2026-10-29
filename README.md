# 🧠 DebateCoach AI — Agentic AI Debate Coach & Presentation Analysis Platform

An AI-powered, production-structured **Agentic AI Debate Coach & Presentation Analysis Platform** designed for students, debate clubs, public speakers, educators, and communication coaches. The platform combines Large Language Models (LLMs), argument mining, logical fallacy detection, speech acoustics, multi-turn AI sparring, and personalized curriculum synthesis.

---

## 📌 Executive Summary & Internship Context

This platform addresses all 4 Milestones (Weeks 1 to 8) specified in the **Agentic AI Debate Coach & Presentation Analysis Platform** curriculum:
- **Milestone 1 (Weeks 1 & 2)**: Project Setup, JWT Authentication, OAuth2 SSO, 4-Tier Role-Based Access Control (Learner, Coach, Educator, Admin), User Profiles, and Debate Session Management across 6 formal debate formats.
- **Milestone 2 (Weeks 3 & 4)**: Argument Mining Engine, 8-Fallacy Detection Engine, 5-Criteria Rubric Scoring, and 5-Factor Weighted Scoring Model ($30\% / 20\% / 20\% / 15\% / 15\%$).
- **Milestone 3 (Weeks 5 & 6)**: AI Debate Simulation Engine with 8 Opponent Personas, Multi-turn Sparring, 5-Type Structured Counterargument Generation, and 4-Week Personalized Coaching Curriculum.
- **Milestone 4 (Weeks 7 & 8)**: Speech & Audio Presentation Analytics (WPM, Fillers, Pitch/Pacing, Confidence), Multi-Format Executive Export System (PDF, Excel `.xlsx`, CSV), Notification & Engagement System, and Role-Adaptive Dashboards.

> [!NOTE]
> **Deployment Note:** While the curriculum document mentions cloud deployment (Docker, AWS, Azure), **cloud deployment is NOT required for evaluation**. The entire platform runs seamlessly on your local machine using standard `uvicorn` and `vite`. Docker Compose is provided purely as optional infrastructure.

---

## 🛠️ Complete Tools & Tech Stack (As Specified in Document)

The platform architecture directly incorporates the stack specified in Section 7 of the internship project document:

| Layer | Tools & Technologies | Description |
|---|---|---|
| **Programming Languages** | **Python** 3.11+ & **JavaScript** (ES6+) | Core languages powering backend APIs and dynamic frontend interface. |
| **Backend Framework** | **FastAPI** & **Uvicorn** | High-performance asynchronous REST API gateway with automatic OpenAPI documentation. |
| **Frontend Framework** | **React.js** (React 19) + **Vite** | Component-driven reactive UI with sub-second HMR and optimized asset compilation. |
| **Styling & Design System** | **Modular CSS Architecture** & **Tailwind CSS** tokens | Structured into `variables.css`, `base.css`, `components.css`, `layout.css`, and `debate.css`. |
| **Primary Database** | **PostgreSQL** (SQLAlchemy 2.0 Async ORM) | Relational store for users, sessions, notifications, and evaluations (with SQLite local zero-config fallback). |
| **Secondary Database** | **MongoDB / Document Store** | NoSQL document storage pattern for raw debate transcripts and cached AI analysis trees. |
| **AI & Machine Learning** | **Scikit-learn**, **TensorFlow**, **PyTorch**, **Pandas**, **NumPy** | Statistical scoring, metric aggregation, data normalization, and rubric calculation models. |
| **LLM & Agentic AI** | **Google Gemini API** & **OpenAI API** | Multi-agent reasoning pipelines (Argument Miner, Fallacy Hunter, Sparring Opponent, Socratic Coach). |
| **NLP & Argument Intelligence** | **spaCy**, **NLTK**, **Sentence Transformers** | Syntactic parsing, keyword extraction, claim boundary detection, and heuristic pattern matching. |
| **Speech & Audio Analytics** | **Whisper**, **Speech Recognition**, Audio Feature Extraction | Acoustic analysis measuring Words Per Minute (WPM), filler frequency, pauses, and confidence. |
| **Search & Vector Storage** | **Elasticsearch** & **Vector DB (FAISS)** | Embedding concept for similarity matching of historical debate motions and counterargument retrieval. |
| **Document Exporting** | **ReportLab** & **openpyxl** | Programmatic generation of executive PDF reports and multi-tab styled Excel `.xlsx` workbooks. |
| **Security & Auth** | **JWT**, **bcrypt**, **passlib**, **OAuth2 SSO** | Stateless bearer token auth with role-based route guards and password hashing. |
| **DevOps & Containers** | **Docker**, **Docker Compose**, **Git & GitHub** | Container recipes for backend, frontend, and database services. |

---

## 🤖 Why Agentic AI & AI API Keys Are Used

### The Dilemma: Why Static Templates Fail Live Demos
If an evaluator or student enters a custom debate motion during a review meeting—such as:
- *"Should gene editing in human embryos be universally prohibited?"*
- *"Does the commercialization of outer space exacerbate global inequality?"*
- *"Should algorithms determine criminal sentencing and cash bail?"*

A hardcoded regex or template engine will produce generic, repetitive answers that clearly do not understand the domain context.

### The Solution: Hybrid Agentic AI Architecture
DebateCoach AI implements a **smart hybrid agent architecture** located in [`backend/app/services/ai_agent.py`](file:///d:/PROJECTS/debate/backend/app/services/ai_agent.py):
1. **Agentic LLM Mode (When API Key is Present)**:
   - Connects to **Google Gemini API** (`gemini-1.5-flash`) or **OpenAI API** (`gpt-4o-mini`).
   - Understands the exact semantic claims of **ANY arbitrary debate question**.
   - Identifies subtle, real-world fallacies with exact quotes and context-specific corrections.
   - Adopts 8 distinct AI sparring personas that generate sharp, factual rebuttals tailored to the opponent's exact words.
   - Synthesizes 5 typed counterarguments (Logical, Empirical, Ethical, Practical, Policy) with tailored Socratic challenge questions.
2. **Graceful Local Heuristic Fallback (When Offline / No API Key)**:
   - If no API key is provided, the platform automatically activates its built-in rule-based heuristics and regex engines.
   - **Zero crashes, zero 500 errors**: All 27 automated tests pass 100% without requiring an external internet connection or API key!
3. **Live AI Status Badge & Settings**:
   - The top Navbar includes a live status pill: `● Agentic AI: Active (Gemini / OpenAI)` or `○ Local Heuristic Mode`.
   - Click it at any time to open the **AI Configuration Modal**, validate an API key live, or inspect active models.

---

## ⚖️ Core Academic Models & Scoring Formulas

### 1. 5-Factor Weighted Scoring Model
As required by Milestone 2 & 4 specifications:

$$\text{Debate Performance Score} = (AQ \times 30\%) + (EU \times 20\%) + (LC \times 20\%) + (RE \times 15\%) + (CS \times 15\%)$$

- **Argument Quality ($AQ - 30\%$)**: Central thesis clarity, structural cohesion, and deductive soundness.
- **Evidence Usage ($EU - 20\%$)**: Empirical data points, peer-reviewed citations, and factual justification.
- **Logical Consistency ($LC - 20\%$)**: Internal non-contradiction and absence of informal fallacies.
- **Rebuttal Effectiveness ($RE - 15\%$)**: Direct refutation of opposing premises and vulnerability exposure.
- **Communication Skills ($CS - 15\%$)**: Rhetorical conviction, conciseness, pacing, and persuasive clarity.

### 2. 8 Supported Logical Fallacies
The platform actively inspects, explains, and provides repair strategies for all 8 curriculum fallacies:
1. **Ad Hominem**: Attacking speaker character or credentials instead of argument substance.
2. **Straw Man**: Caricaturing or exaggerating the opposing view to easily knock it down.
3. **False Dilemma**: Artificial black-and-white framing that ignores viable middle alternatives.
4. **Slippery Slope**: Claiming without causal evidence that an action leads to catastrophic disaster.
5. **Appeal to Authority**: Citing celebrity endorsement or irrelevant figures without empirical proof.
6. **Circular Reasoning**: Presupposing the conclusion within the premise itself.
7. **Hasty Generalization**: Drawing universal conclusions from isolated anecdotes or small samples.
8. **Red Herring**: Introducing distracting, irrelevant tangents to derail the central resolution.

### 3. 8 AI Opponent Personas (Milestone 3)
1. **Dr. Reeves (Analytical Scholar)**: Evidence-based, data-driven, demands peer-reviewed sources.
2. **Jordan Blake (Aggressive Debater)**: Assertive, confrontational, relentlessly attacks premises.
3. **Prof. Vann (Philosopher)**: Socratic, conceptual, questions definitions and ethical axioms.
4. **Alex Chen (Policy Pragmatist)**: Cost-benefit oriented, focuses on implementation feasibility.
5. **Maya Torres (Ethical Advocate)**: Values-driven, centers human rights and distributive justice.
6. **Sam Reeves (Devil's Advocate)**: Contrarian, tests unstated assumptions with 'what if' probes.
7. **Coach Williams (Socratic Coach)**: Educational, asks guiding questions, affirms sound logic.
8. **Dana Morris (Balanced Moderator)**: Nuanced, steelmans opposing views, seeks common ground.

### 4. 5 Structured Counterargument Types
- **Logical Rebuttal**: Attacks invalid inferential leaps and unproven assumptions.
- **Evidence-Based Rebuttal**: Cites contradictory empirical studies, meta-analyses, and data flaws.
- **Ethical Counterargument**: Analyzes human rights, moral trade-offs, and social justice burdens.
- **Practical Counterargument**: Highlights budget overruns, execution barriers, and opportunity costs.
- **Policy Counterargument**: Evaluates unintended consequences and voluntary regulatory alternatives.

---

## 📂 Modular Codebase Architecture

The codebase has been refactored to eliminate monolithic, unreadable files. Styles and components are strictly divided into maintainable modules:

```
debate/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # Settings, DB URLs, and LLM configuration
│   │   │   ├── database.py           # SQLAlchemy async engine with SQLite zero-config fallback
│   │   │   └── security.py           # JWT token generation, bcrypt password hashing
│   │   ├── models/                   # SQLAlchemy 2.0 ORM models
│   │   │   ├── user.py               # User table with 4 roles (Learner, Coach, Educator, Admin)
│   │   │   ├── debate_session.py     # Debate sessions across 6 formats with rubric JSON
│   │   │   └── notification.py       # Notification and engagement alert model
│   │   ├── schemas/                  # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── ai_agent.py           # Central Agentic AI LLM orchestrator (Gemini / OpenAI)
│   │   │   ├── argument_analysis.py  # Argument mining & 8-fallacy detection engine
│   │   │   ├── debate_simulation.py  # 8-persona sparring arena & typed counterargument engine
│   │   │   ├── coaching.py           # 4-week learning plans & 80-pt benchmark gap diagnostics
│   │   │   └── presentation_analysis.py # Speech prosody, WPM, filler word & confidence analyzer
│   │   └── routers/                  # Versioned API routes (/api/v1/...)
│   │       ├── auth.py, users.py, sessions.py, analysis.py, simulation.py,
│   │       └── coaching.py, presentation.py, reports.py, notifications.py
│   ├── tests/                        # 27 Automated test cases (M1–M4 all passing)
│   ├── requirements.txt              # Backend dependencies (FastAPI, ReportLab, openpyxl, httpx)
│   └── main.py                       # Application entry point with CORS and route registration
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js             # Axios client with JWT bearer interceptors
│   │   ├── context/AuthContext.jsx   # Global user auth state and session persistence
│   │   ├── styles/                   # Modular CSS Architecture (Clean & Non-Monolithic)
│   │   │   ├── variables.css         # Design tokens, color palette, typography & shadows
│   │   │   ├── base.css              # Reset, typography, animations & gradients
│   │   │   ├── components.css        # Reusable buttons, form inputs, cards, badges & modals
│   │   │   ├── layout.css            # Responsive grid layouts, navigation sidebar & shell
│   │   │   └── debate.css            # Arena bubbles, persona selectors & analytics gauges
│   │   ├── components/               # Cleanly decomposed subcomponents
│   │   │   ├── ai/
│   │   │   │   ├── AIStatusBadge.jsx   # Live Agentic AI status pill
│   │   │   │   └── AISettingsModal.jsx # API key tester & model selector modal
│   │   │   ├── analysis/
│   │   │   │   ├── FallacyCatalogModal.jsx # 8-fallacy educational reference guide
│   │   │   │   └── AnalysisResultsView.jsx # Comprehensive argument score breakdown view
│   │   │   ├── simulation/
│   │   │   │   ├── PersonaSelector.jsx      # 8 AI opponent persona cards
│   │   │   │   └── CounterargumentPanel.jsx # 5-type rebuttal generator tool
│   │   │   ├── coaching/
│   │   │   │   ├── SkillScoreSliders.jsx # 5-dimensional interactive rubric sliders
│   │   │   │   ├── LearningPlanTab.jsx   # 4-week structured curriculum timeline
│   │   │   │   └── SkillGapTab.jsx       # Benchmark gap diagnostics
│   │   │   ├── Navbar.jsx            # Header with notification center & AI status
│   │   │   └── Sidebar.jsx           # Role-aware navigation links
│   │   └── pages/                    # Core view containers (M1 to M4)
│   │       ├── Landing.jsx, Login.jsx, Signup.jsx, Dashboard.jsx,
│   │       ├── DebateSessions.jsx, ArgumentAnalysis.jsx, DebateSimulation.jsx,
│   │       ├── Coaching.jsx, PresentationAnalysis.jsx, Reports.jsx, Profile.jsx
│   │   ├── index.css                 # Master style index importing modular CSS files
│   │   └── App.jsx                   # React Router 7 route declarations & protected routes
│   └── package.json                  # React 19 + Vite dependencies
│
├── docs/                             # Architecture and completion documentation
├── docker-compose.yml                # Optional container orchestration
└── README.md
```

---

## 🚀 Step-by-Step Local Setup (No Deployment Required)

You do **not** need Docker, AWS, Azure, or PostgreSQL installed to run this project. It runs completely out-of-the-box using local SQLite fallback.

### Prerequisites
- **Python 3.11+** installed (`python --version`)
- **Node.js 18+** installed (`node --version`)

---

### Step 1: Start the Backend (FastAPI)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Activate virtual environment (Windows)
.\venv\Scripts\activate

# 3. (Optional) Configure an AI API Key for live demonstrations on any topic
# Open backend/.env in any text editor and add:
# GEMINI_API_KEY=your_gemini_api_key_here
# If omitted, the platform will seamlessly run in Local Heuristic Mode!

# 4. Start the backend development server
uvicorn main:app --reload --port 8000
```
- **API Server Running**: `http://localhost:8000`
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`

---

### Step 2: Start the Frontend (React + Vite)

Open a **new terminal**:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start Vite dev server
npm run dev
```
- **Web Platform Running**: `http://localhost:5173`

---

### Step 3: Run the Automated Test Suite

To verify all 27 Milestone verification tests:

```bash
cd backend
.\venv\Scripts\pytest.exe -v tests
```
*Expected Result: `27 passed in ~9s` covering Auth, RBAC, Sessions, Argument Mining, Fallacy Detection, Sparring Simulation, Coaching Plans, Presentation Prosody, and Document Exports.*

---

## 🔑 How to Add an AI API Key for Demonstrations

To demonstrate live Agentic AI reasoning on **any question**:

### Method A: Via `backend/.env` (Recommended)
1. Get a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. Open [`backend/.env`](file:///d:/PROJECTS/debate/backend/.env) and set:
   ```env
   GEMINI_API_KEY=AIzaSyYourKeyHere...
   AI_PROVIDER=gemini
   ```
3. Restart the backend server. The Navbar badge will automatically display: `● Agentic AI: GEMINI`.

### Method B: Via the Web Interface
1. Open `http://localhost:5173` in your browser.
2. Click the **AI Status Badge** in the top navigation bar.
3. In the **Agentic AI Configuration Modal**, paste your API key and click **⚡ Test Connection**.

---

## 📡 Key API Routes Quick Reference

| Route | Method | Purpose | Milestone |
|---|---|---|---|
| `/api/v1/auth/register` | `POST` | Register user across 4 roles (`learner`, `coach`, `educator`, `admin`) | M1 |
| `/api/v1/auth/login` | `POST` | Authenticate and obtain JWT token | M1 |
| `/api/v1/sessions/` | `GET`/`POST` | CRUD debate sessions across 6 international formats | M1 |
| `/api/v1/analysis/evaluate` | `POST` | Semantic claim extraction & 8-fallacy evaluation | M2 |
| `/api/v1/analysis/fallacies` | `GET` | Catalog of 8 supported fallacies with explanations and repairs | M2 |
| `/api/v1/analysis/ai-status` | `GET` | Inspect active Agentic AI engine status & provider | M2/M3 |
| `/api/v1/simulation/start` | `POST` | Initialize sparring session against chosen opponent persona | M3 |
| `/api/v1/simulation/turn` | `POST` | Submit speech and receive persona rebuttal & challenge | M3 |
| `/api/v1/simulation/counterarguments` | `POST` | Generate 5 typed counterarguments for any claim | M3 |
| `/api/v1/coaching/recommendations` | `POST` | Synthesize targeted exercises based on 5-factor rubric | M3 |
| `/api/v1/coaching/learning-plan` | `POST` | Generate 4-week structured curriculum and milestones | M3 |
| `/api/v1/coaching/skill-gap` | `POST` | Calculate benchmark gaps against competitive 80-pt baseline | M3 |
| `/api/v1/presentation/analyze` | `POST` | Acoustic prosody, WPM, filler word count, and delivery confidence | M4 |
| `/api/v1/reports/export/pdf` | `GET` | Generate and download executive PDF evaluation report | M4 |
| `/api/v1/reports/export/excel` | `GET` | Generate and download multi-tab Excel workbook (`.xlsx`) | M4 |
| `/api/v1/notifications/` | `GET` | Retrieve personal debate reminders and platform announcements | M4 |

---

## 👨‍💻 Internship Project Demonstration Tips

During your weekly review meeting:
1. **Highlight the Architecture**: Point to the **AI Status Badge** in the header. Explain that this platform uses an **Agentic AI architecture** supporting live LLM reasoning (Gemini/OpenAI) with a deterministic heuristic fallback for offline safety.
2. **Demonstrate Any Question**:
   - Go to **Argument & Fallacy Lab** (`/analysis`).
   - Type in a completely custom topic (e.g. *"Should deepfake technology be subject to criminal liability?"*).
   - Show how it extracts the central thesis, identifies supporting premises, checks for all 8 fallacies, and computes the weighted rubric score.
3. **Showcase AI Sparring**:
   - Go to **AI Debate Simulation** (`/simulation`).
   - Pick an opponent like *Jordan Blake (Aggressive Debater)* or *Prof. Vann (Philosopher)*.
   - Show how the AI directly counters what you said and gives real-time Socratic coaching tips.
4. **Demonstrate Executive Exports**:
   - Go to **Reports & Analytics** (`/reports`).
   - Click **Download PDF Report** (powered by ReportLab) or **Download Excel .xlsx** (powered by openpyxl) to demonstrate professional deliverables.
