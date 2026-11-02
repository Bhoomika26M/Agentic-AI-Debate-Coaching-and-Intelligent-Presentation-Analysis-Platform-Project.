# 🎙️ DebateCoach AI — Live Presentation & Meet Demonstration Script

This document is your **step-by-step presentation script** for your internship review meeting. Keep this file open side-by-side during your Google Meet call. Every step contains the **exact text to paste, buttons to click, and spoken talking points** to demonstrate.

---

## 📋 Table of Contents
1. [Pre-Meeting Setup & Early API Key Configuration](#1-pre-meeting-setup--early-api-key-configuration)
2. [Credentials Quick-Reference](#2-credentials-quick-reference)
3. [Understanding the AI Status Badge: Local Heuristic vs. Agentic LLM](#3-understanding-the-ai-status-badge-local-heuristic-vs-agentic-llm)
4. [Role-Based Access Control (RBAC) Architecture Matrix](#4-role-based-access-control-rbac-architecture-matrix)
5. [Act 1: Landing Page & In-App Password Reset](#5-act-1-landing-page--in-app-password-reset)
6. [Act 2: The Learner Experience (Core Agentic AI Demo)](#6-act-2-the-learner-experience-core-agentic-ai-demo)
   - [Part A: Scheduling a Session](#part-a-scheduling-a-session)
   - [Part B: Argument & Fallacy Detection Lab (Copy-Paste Text)](#part-b-argument--fallacy-detection-lab-copy-paste-text)
   - [Part C: AI Debate Simulation & Persona Sparring (Copy-Paste Text)](#part-c-ai-debate-simulation--persona-sparring-copy-paste-text)
   - [Part D: Personalized Coaching & 4-Week Learning Plan](#part-d-personalized-coaching--4-week-learning-plan)
   - [Part E: Presentation & Acoustic Delivery Analytics (Copy-Paste Text)](#part-e-presentation--acoustic-delivery-analytics-copy-paste-text)
7. [Act 3: The Coach Workflow (Student Evaluation & Rubric Grading)](#7-act-3-the-coach-workflow-student-evaluation--rubric-grading)
8. [Act 4: The Educator Workflow (Class Analytics & PDF/Excel Export)](#8-act-4-the-educator-workflow-class-analytics--pdfexcel-export)
9. [Act 5: The Administrator Workflow (Platform Telemetry & Audit Logs)](#9-act-5-the-administrator-workflow-platform-telemetry--audit-logs)
10. [Reviewer Q&A Defense Cheat-Sheet](#10-reviewer-qa-defense-cheat-sheet)

---

## 1. Pre-Meeting Setup & Early API Key Configuration

To ensure a seamless live demonstration without manual API key entry during your call, pre-configure your key in the backend environment file.

### Step A: Early API Key Setup in `backend/.env`
Open [`backend/.env`](file:///d:/PROJECTS/debate/backend/.env) and set your preferred provider:

**For Google Gemini (Free & Recommended):**
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

**For OpenAI / Groq / OpenRouter:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_actual_openai_key_here
OPENAI_MODEL=gpt-4o-mini
```
*(If no key is entered, the platform operates in deterministic **Offline Heuristic Mode** automatically with zero errors).*

---

### Step B: Start Both Services (Run in 2 Terminals)

#### Terminal 1: Backend Server (FastAPI on Port 8000)
```powershell
# From D:\PROJECTS\debate
backend\venv\Scripts\uvicorn main:app --app-dir backend --reload --port 8000
```
*(Verify: `http://localhost:8000/docs` opens Swagger documentation)*

#### Terminal 2: Frontend App (React + Vite on Port 5173)
```powershell
# From D:\PROJECTS\debate
npm run dev --prefix frontend
```
*(Open browser: `http://localhost:5173` — Browser tab title displays **DebateCoach AI**)*

---

## 2. Credentials Quick-Reference

All accounts use the standardized password: **`Password123!`**

| Role | Email | Password | What Makes This Role Special in the Demo |
|---|---|---|---|
| **Learner** | `learner@debate.ai` | `Password123!` | Personal drills, 8-fallacy AI lab, sparring with 8 AI personas, speech pacing. Cannot access other students' data. |
| **Coach** | `coach@debate.ai` | `Password123!` | Roster of assigned students, pending review queue, exclusive **Adjudication Form** with score slider to grade rounds. |
| **Educator** | `educator@debate.ai` | `Password123!` | Class-wide progress metrics, student averages, 1-click **Export to PDF, Excel (.xlsx), and CSV**. |
| **Admin** | `alanolikkaladdwin@gmail.com` | `Password123!` | Platform health telemetry (uptime, active users, AI calls), user role distributions, system-wide audits. |

---

## 3. Understanding the AI Status Badge: Local Heuristic vs. Agentic LLM

In the top navbar, debaters and evaluators will see an AI status badge.

### What it Displays:
1. **`AI: Local Heuristic` (Amber/Gray Dot)**:
   - Displayed when no external API key is active.
   - **How to Explain**:
     > *"This demonstrates our dual-engine architecture. The Local Heuristic engine is our built-in, offline NLP engine. It executes discourse tokenization, sentence-length clarity checks, topic-overlap relevance, and 8-fallacy pattern matching in under 5 milliseconds with zero latency and zero API cost. If internet drops during a debate competition, the platform remains 100% operational."*
2. **`Agentic AI: GEMINI` or `Agentic AI: OPENAI` (Glowing Green Pulse Dot)**:
   - Displayed automatically when an API key is pre-configured in `backend/.env`.
   - **How to Explain**:
     > *"When an API key is connected, our Agentic AI Orchestrator (`ai_agent.py`) takes over. It uses modern LLM inference for deep semantic claim extraction, contextual rebuttal generation, and adaptive multi-turn debate sparring on ANY arbitrary topic."*

---

## 4. Role-Based Access Control (RBAC) Architecture Matrix

The frontend code dynamically adapts based on the authenticated user's role:

```
┌────────────────────────────────┬─────────┬───────┬──────────┬───────┐
│ Feature / Capability           │ Learner │ Coach │ Educator │ Admin │
├────────────────────────────────┼─────────┼───────┼──────────┼───────┤
│ Create & Practice Sessions     │   ✅    │  ✅   │    ✅    │  ✅   │
│ AI Fallacy & Argument Lab      │   ✅    │  ✅   │    ✅    │  ✅   │
│ 8-Persona AI Debate Simulation │   ✅    │  ✅   │    ✅    │  ✅   │
│ Personal 4-Week Coaching Plan  │   ✅    │  ✅   │    ✅    │  ✅   │
│ Speech & Pacing Analysis       │   ✅    │  ✅   │    ✅    │  ✅   │
│ View Other Students' Rosters   │   ❌    │  ✅   │    ✅    │  ✅   │
│ Grade Sessions & Submit Scores │   ❌    │  ✅   │    ✅    │  ✅   │
│ Export Academic Reports (PDF)  │   ❌    │  ❌   │    ✅    │  ✅   │
│ Platform Health Telemetry      │   ❌    │  ❌   │    ❌    │  ✅   │
└────────────────────────────────┴─────────┴───────┴──────────┴───────┘
```

---

## 5. Act 1: Landing Page & In-App Password Reset

### Talking Point:
> *"We designed the platform to look clean, professional, and accessible. The landing page highlights our key functional modules without cluttered marketing claims or placeholder vanity statistics."*

1. Open `http://localhost:5173`.
2. Point out:
   - Clean top navigation bar and platform badge: `Agentic AI-Powered Platform`.
   - The 6 core architecture pillars (AI Argument Analysis, Fallacy Detection, Counterargument Engine, Presentation Analytics, AI Debate Simulation, Personalized Coaching).
3. Click **"Sign In"** in the top-right corner.
4. On the sign-in page, point out the **"Forgot password?"** link directly above the password input.
5. Click **"Forgot password?"** to demonstrate the direct in-app reset flow:
   - **Email field**: Enter `alanolikkaladdwin@gmail.com`
   - Click: **`Proceed to Enter New Password →`**
   - **New Password**: Enter `Password123!` (or your new secret)
   - **Confirm New Password**: Re-enter `Password123!`
   - Click: **`Update Password & Proceed`**
   - Show the success message: *"Password updated successfully! Your password has been updated in the database."*
   - Click **`Proceed to Sign In →`**

---

## 6. Act 2: The Learner Experience (Core Agentic AI Demo)

Log in with:
- **Email**: `learner@debate.ai`
- **Password**: `Password123!`

### Talking Point:
> *"Notice the Learner Dashboard. The greeting says 'Keep practising, keep winning!', displaying student-specific metrics: Total Sessions, Average Score, Win Streak, and Improvement Rate. Learners only see their own sessions."*

---

### Part A: Scheduling a Session
1. In the sidebar, click **"Debate Sessions"** (`/sessions`).
2. Click the **"+ New Session"** button in the top right.
3. Fill out the modal with these exact values:
   - **Topic**: `Artificial Intelligence should be strictly regulated by international treaties`
   - **Format**: Select `Oxford Debate`
   - **Date & Time**: Select today's date / current time
   - **Role / Stance**: Select `Proposition / Affirmative`
4. Click **"Schedule Session"**.
5. The session immediately appears in your session feed with its badge.

---

### Part B: Argument & Fallacy Detection Lab (Copy-Paste Text)
*(This is the most impressive technical part of your review — practice pasting this!)*

1. In the sidebar, click **"Argument & Fallacy Lab"** (`/analysis`).
2. In the text area under **"Speech Transcript / Argument Input"**, paste this exact paragraph:

```text
My opponent claims that commercial artificial intelligence development should be paused immediately. However, he has never worked at a technology company, so his entire opinion on computational safety is completely invalid. Furthermore, if we allow private companies to test autonomous agents today, tomorrow humanity will inevitably become extinct and civilization will collapse. Either we completely ban modern large language models right now, or we surrender all human agency to machines.
```

3. Click **"Analyze Argument"**.
4. Highlight the automated results:
   - **Fallacy 1**: `Ad Hominem` — Flags attacking the opponent's background rather than their argument.
   - **Fallacy 2**: `Slippery Slope` — Flags the catastrophic leap from agent testing to extinction.
   - **Fallacy 3**: `False Dilemma` — Flags the extreme "either total ban or extinction" dichotomy.
   - **Rubric Breakdown**: Point out Clarity, Evidence Strength, Logical Consistency, and Overall Soundness.
   - **AI Counterargument Suggestion**: Point out the automatically generated rebuttal points.

---

### Part C: AI Debate Simulation & Persona Sparring (Copy-Paste Text)
1. In the sidebar, click **"AI Debate Simulation"** (`/simulation`).
2. Show the **Persona Selector**:
   - Point out that debaters can spar against 8 distinct personas (e.g., `Devil's Advocate`, `Socratic Questioner`, `Aggressive Cross-Examiner`, `Pragmatic Policymaker`).
3. Select **"Devil's Advocate"**.
4. In the topic field, enter:
   `Universal Basic Income is essential in the age of automation`
5. Click **"Start Simulation"**.
6. When prompted for your opening argument, paste:
```text
Universal Basic Income establishes a mandatory financial floor for workers displaced by algorithmic automation, stimulating consumer purchasing power and preserving socio-economic stability.
```
7. Click **"Submit Argument"**.
8. Show the AI opponent's response:
   - The AI opponent dynamically dissects your premises, identifies fiscal trade-offs (e.g., inflation, capital taxation), and challenges you to defend your position.

---

### Part D: Personalized Coaching & 4-Week Learning Plan
1. In the sidebar, click **"Coaching & Learning"** (`/coaching`).
2. Show the three tabs:
   - **Skill Score Sliders / Radar**: Shows Clarity, Logical Consistency, Rebuttal Timing.
   - **4-Week Structured Learning Plan**: Week-by-week curriculum covering premise structuring, fallacy identification, POI handling, and closing summary synthesis.
   - **Skill Gap Diagnostics**: Automated analysis of weakest categories with targeted drill recommendations.

---

### Part E: Presentation & Acoustic Delivery Analytics (Copy-Paste Text)
1. In the sidebar, click **"Presentation Analysis"** (`/presentation`).
2. Explain to the reviewers:
   > *"Debate excellence is not only about what you say, but how you deliver it. This module evaluates acoustic pace, speech hesitation, and vocal confidence."*
3. Paste this speech transcript into the text field:
```text
Um, thank you, Mr. Speaker. Like, today we are standing here to, uh, fundamentally oppose this motion. You know, the proposition has failed to, um, demonstrate any practical solvency. We believe, uh, strongly that the economic consequences are, like, catastrophic.
```
4. Click **"Analyze Presentation"**.
5. Show the resulting delivery metrics:
   - **Words Per Minute (WPM)**: Pacing assessment (Normal / Fast / Slow).
   - **Filler Word Detection**: Highlights the frequency of `um`, `uh`, `like`, and `you know`.
   - **Delivery Confidence Score**: Reflects vocal assertiveness and clarity.

---

## 7. Act 3: The Coach Workflow (Student Evaluation & Rubric Grading)

1. Click **"Logout"** at the bottom of the sidebar.
2. Sign in as the **Coach**:
   - **Email**: `coach@debate.ai`
   - **Password**: `Password123!`
3. Show the **Coach Dashboard**:
   - Greeting: *"Shape the next generation of debaters! 🏆"*
   - Stats: **Students**, **Sessions Today**, **Avg Student Score**, **Pending Reviews**.
   - Student Roster Grid: Shows Alex Mercer (Learner), their session counts, and average score.
4. Go to **"Debate Sessions"** (`/sessions`):
   - Click on any **completed** session card to open its detail modal.
   - Point out the **`🔒 Official Review Finalized`** locked scorecard — displays the verified score (`87.2/100`), a quoted coaching feedback block, and a lock icon confirming the evaluation is finalized.
   - Click **`✏️ Edit Review & Score`** to demonstrate that adjustments are still possible when needed — the slider and feedback textarea reappear.
   - Make a change and click **`💾 Update & Lock Evaluation`** to lock it again. Show the green success banner.
   - Click on a **scheduled/unreviewed** session to show the open evaluation form for first-time grading: adjust the slider, enter feedback, click **`⭐ Submit & Lock Evaluation`**.
   - Point out that **Learners cannot see this form at all** — they only see the locked scorecard or a pending notice.

---

## 8. Act 4: The Educator Workflow (Class Analytics & PDF/Excel Export)

1. Sign out and sign in as the **Educator**:
   - **Email**: `educator@debate.ai`
   - **Password**: `Password123!`
2. Show the **Educator Dashboard**:
   - Greeting: *"Driving academic excellence! 📚"*
   - Stats: **Classes**, **Total Students**, **Reports**, **Class Avg Score**.
3. Navigate to **"Reports & Analytics"** (`/reports`):
   - Show the aggregated class metrics — non-zero debate counts, win rates, fallacy trends, and skill progression data pulled from all active learners.
   - Point out the subtitle: *"Class & Cohort Performance Analytics — Institutional Overview"*.
   - Point out the 3 exclusive export buttons in the top right: **"Export CSV"**, **"Export Excel"**, and **"Export PDF"**.
   - Click **"Export PDF"** or **"Export Excel"** — the browser immediately downloads a formal institutional report file.
   - Explain: *"This allows academic instructors to download comprehensive debate grade books for department records."*

---

## 9. Act 5: The Administrator Workflow (Platform Telemetry & Audit Logs)

1. Sign out and log in as the **Admin**:
   - **Email**: `alanolikkaladdwin@gmail.com`
   - **Password**: `Password123!`
2. Show the **Admin Dashboard**:
   - Greeting: *"Platform overview at a glance! ⚙️"*
   - Live Telemetry Stats: **Total Users**, **Total Sessions**, **AI Calls Today**, **System Uptime (99.9%)**.
   - Full student roster across the entire institution.
3. Navigate to **"Reports & Analytics"** (`/reports`):
   - Point out that the exclusive **🛡️ Admin Overview** tab appears (this tab is completely hidden from learners).
   - Click **"🛡️ Admin Overview"**:
     - Shows **User Role Distribution** bar graph (`learner`, `coach`, `educator`, `admin`).
     - Shows **Session Status Distribution** chart (`completed`, `scheduled`, `active`).
     - Shows the **Top Performers Leaderboard**.

---

## 10. Reviewer Q&A Defense Cheat-Sheet

Be prepared with these concise answers during your review:

### Q1: "Did you use an external AI API or is this local?"
> **Your Answer**: *"We designed an **Agentic Hybrid Architecture**. The platform features an automated heuristic NLP engine that detects 8+ fallacy types and evaluates argument syntax 100% offline with zero latency and zero API cost. In addition, when an API key (Google Gemini or OpenAI) is pre-configured in `backend/.env`, our agentic orchestrator (`ai_agent.py`) activates automatically to provide live LLM reasoning for any question or debate topic."*

### Q2: "Why are there different debate formats (Oxford, Lincoln-Douglas, etc.)?"
> **Your Answer**: *"Different debate formats train different intellectual skills. Oxford Style emphasizes binary audience persuasion; Parliamentary emphasizes extemporaneous rapid thinking with POIs; Lincoln-Douglas focuses on ethical values and philosophy. Our platform adapts scoring rubrics based on the selected format."*

### Q3: "How is security and data privacy maintained?"
> **Your Answer**: *"We implement Role-Based Access Control (RBAC) enforced via FastAPI OAuth2 JWT bearer tokens. Learner data is isolated; coaches can only view and evaluate debaters assigned to their roster; and administrative endpoints are guarded by strict role verification in SQLite."*
