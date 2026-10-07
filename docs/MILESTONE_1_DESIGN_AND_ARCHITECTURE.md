# 🏛️ DebateCoach AI — Milestone 1: System Architecture, Design Process & Workflows

**Project:** Agentic AI Debate Coach & Presentation Analysis Platform  
**Milestone:** Milestone 1 (Week 1 & 2) — Project Initialization, Design Process & Core Setup  
**Document Version:** 1.0.0  

---

## 1. Project Objectives & Executive Summary

The **DebateCoach AI** platform empowers users to cultivate debating, public speaking, critical thinking, and persuasive presentation skills through an agentic AI ecosystem.

### Core Objectives for Milestone 1:
1. **Core Workflows**: Define and establish user journeys for debate practice, presentation analysis, coaching evaluation, and multi-round argument handling.
2. **System Architecture**: Multi-tier architecture encompassing a React single-page frontend, an asynchronous FastAPI backend, relational persistence with role-based segregation, and foundational hooks for future Agentic LLM reasoning engines (Milestones 2–4).
3. **Authentication & RBAC**: JWT-based authentication with 4 distinct roles: **Learner**, **Debate Coach**, **Educator**, and **Administrator**.
4. **User Profile & Skill Tracking Integration**: Track communication skill metrics (clarity, evidence strength, logical consistency, persuasiveness, speaking pace, confidence), presentation domains, debate topics, learning goals, and session histories.
5. **Debate Session Management**: End-to-end lifecycle for creating, scheduling, position assignment, transcript/speech recording, and coach evaluation across 6 international debate formats.

---

## 2. Supported Debate Formats & Rules

| Format | Structure | Key Dynamic | Target Skills |
|---|---|---|---|
| **One-on-One Debate** | 2 speakers, alternating speeches & rebuttals | Head-to-head agility | Direct clash, rapid rebuttal |
| **Parliamentary Debate** | Government vs. Opposition, points of information (POIs) | Dynamic parliamentary discourse | Spontaneous thinking, rhetoric |
| **Oxford Debate** | Proposition vs. Opposition with audience pre/post vote | Persuasion of a jury | Audience sway, formal structure |
| **Policy Debate** | Problem-solution oriented, affirmative plan vs. negative counterplan | In-depth evidence analysis | Research rigor, evidence cards |
| **Public Forum Debate** | Accessible current events topic, crossfire rounds | Broad accessibility | Civility, crossfire questioning |
| **AI Debate Simulation** | Learner vs. Adaptive AI Agent with automated difficulty scaling | Solo practice & sparring | Tenacity, logical endurance |

---

## 3. High-Level System Architecture

```mermaid
graph TD
    subgraph Client Layer ["Frontend (React 19 + Vite)"]
        UI_Land["Landing & Auth Page"]
        UI_Dash["Role-Adaptive Dashboard<br/>(Learner / Coach / Educator / Admin)"]
        UI_Sess["Debate Session Manager<br/>(Schedule, Run, Evaluate)"]
        UI_Prof["Profile & Skill Tracker<br/>(Radar, Domains, History)"]
    end

    subgraph Gateway ["API Gateway & Core Security"]
        CORS["CORS & Request Validation"]
        JWT_MW["JWT Token Auth & RBAC Guard"]
    end

    subgraph Service Layer ["FastAPI Backend Engine (Python 3.12)"]
        Auth_Svc["Authentication Router (/auth)"]
        User_Svc["User & Skill Router (/users)"]
        Sess_Svc["Session Router (/sessions)"]
        Coach_Svc["Coach Evaluation Engine"]
        Future_AI["[Milestone 2-4 Extension]<br/>Argument Mining & LLM Agents"]
    end

    subgraph Persistence Layer ["Storage & Database"]
        PG_DB["PostgreSQL 16 (Production/Docker)"]
        SQLITE_DB["SQLite + aiosqlite (Local Dev Fallback)"]
    end

    UI_Land --> CORS
    UI_Dash --> CORS
    UI_Sess --> CORS
    UI_Prof --> CORS

    CORS --> JWT_MW
    JWT_MW --> Auth_Svc
    JWT_MW --> User_Svc
    JWT_MW --> Sess_Svc
    JWT_MW --> Coach_Svc

    Auth_Svc --> PG_DB & SQLITE_DB
    User_Svc --> PG_DB & SQLITE_DB
    Sess_Svc --> PG_DB & SQLITE_DB
    Coach_Svc --> PG_DB & SQLITE_DB
```

---

## 4. Database Schema Design (Entity-Relationship)

```mermaid
erDiagram
    USERS ||--o{ DEBATE_SESSIONS : "participates / owns"
    USERS {
        uuid id PK
        string full_name
        string email UK
        string hashed_password
        string role "learner | coach | educator | admin"
        boolean is_active
        string bio
        string experience_level "Beginner | Intermediate | Advanced | Expert"
        json debate_topics "array of preferred topics"
        json presentation_domains "array of presentation areas"
        json learning_goals "array of target goals"
        json coaching_prefs "array of feedback preferences"
        json communication_skills "granular skill scores"
        json presentation_history "array of past presentations"
        int total_sessions
        float avg_score
        int win_streak
        datetime created_at
        datetime updated_at
    }

    DEBATE_SESSIONS {
        uuid id PK
        uuid user_id FK "References USERS.id"
        string topic
        string format "One-on-One | Parliamentary | Oxford | Policy | Public Forum | AI Sim"
        string position "Proposition | Opposition | Government | Affirmative | Negative | Neutral"
        text notes "preparation notes"
        string status "scheduled | active | completed | cancelled"
        datetime scheduled_at
        int round_count
        int duration_minutes
        text transcript "speeches and transcripts"
        string recording_url "audio/video reference"
        json key_arguments "extracted or logged points"
        float score "overall score out of 100"
        text feedback_summary "coach or AI feedback"
        json evaluation_criteria "rubric breakdown"
        datetime created_at
        datetime updated_at
    }
```

---

## 5. Role-Based Access Control (RBAC) Matrix

| Resource & Action | Learner | Debate Coach | Educator | Admin |
|---|:---:|:---:|:---:|:---:|
| **Register & Login** | ✅ | ✅ | ✅ | ✅ |
| **Manage Own Profile & Skill Settings** | ✅ | ✅ | ✅ | ✅ |
| **Create Personal Debate Session** | ✅ | ✅ | ✅ | ✅ |
| **View Personal Debate Sessions** | ✅ | ✅ | ✅ | ✅ |
| **View All Student Debate Sessions** | ❌ | ✅ | ✅ | ✅ |
| **Evaluate & Score Student Sessions** | ❌ | ✅ | ✅ | ✅ |
| **View Class Analytics & Student Roster** | ❌ | ✅ | ✅ | ✅ |
| **Delete Any Session** | ❌ (Own only) | ❌ (Own only) | ❌ (Own only) | ✅ |
| **System-wide Management** | ❌ | ❌ | ❌ | ✅ |

---

## 6. AI-Powered Debate Coaching Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    actor Coach
    participant Frontend as React Client
    participant API as FastAPI Backend
    participant DB as Relational DB

    Learner->>Frontend: Register / Login (Role: Learner)
    Frontend->>API: POST /auth/login
    API-->>Frontend: JWT Access Token + Profile
    Learner->>Frontend: Sets Experience, Topics, Presentation Domains
    Frontend->>API: PUT /users/me
    API->>DB: Updates user profile & skill parameters

    Learner->>Frontend: Schedules Debate Session (e.g. Oxford Debate, Affirmative)
    Frontend->>API: POST /sessions
    API->>DB: Persists new session with status='scheduled'
    
    Learner->>Frontend: Commences debate & records speech transcript
    Frontend->>API: PUT /sessions/{id} (updates transcript & status='active')
    
    Coach->>Frontend: Logs in (Role: Coach)
    Frontend->>API: GET /sessions (Returns all student sessions)
    Coach->>Frontend: Reviews Learner's debate transcript
    Coach->>Frontend: Submits Score (88/100) & Feedback Summary
    Frontend->>API: PUT /sessions/{id}/evaluate
    API->>DB: Stores score, rubric, updates Learner's avg_score & total_sessions
    
    Learner->>Frontend: Views updated Learner Dashboard with progress & coaching insights
```

---

## 7. UI Wireframe Concepts

### Wireframe A: Role-Adaptive Dashboard
- **Top Bar**: Platform title, live date/time, user role pill, session quick-links.
- **Top Stats Ribbon**: 4 metric cards customized by role (e.g., Learner: Sessions, Avg Score, Win Streak, Improvement Rate; Coach: Active Students, Reviews Pending, Today's Sessions).
- **Primary Grid (Left 65%)**: Recent Debate Sessions table with format badges, dates, statuses, and quick review/open buttons.
- **Side Panel (Right 35%)**: 
  - Quick Actions widget (New Session, My Sessions, Update Skills).
  - Performance Gauge & Communication Skill Radar showing score progression.

### Wireframe B: Profile & Skill Tracking Center
- **Section 1**: Basic info (Name, Email, Role badge, Bio).
- **Section 2**: Experience Level selector buttons (Beginner, Intermediate, Advanced, Expert).
- **Section 3**: Communication Skill Tracking Metrics (Live interactive score cards for Clarity, Evidence Strength, Logical Consistency, Rebuttal Skill, Delivery Pace, Confidence).
- **Section 4**: Preferred Debate Topics multi-select chips.
- **Section 5**: Presentation Domains multi-select chips (Keynote, Academic, Business Pitch, Political Debate, etc.).
- **Section 6**: Learning Goals & Coaching Preferences.

### Wireframe C: Debate Session Command Center
- **Header**: Status filter tabs (`All`, `Scheduled`, `Active`, `Completed`) with dynamic count badges + "+ New Session" button.
- **Session List**: Rich cards with format icon, topic title, format label, scheduled date/time, status badge, and action triggers.
- **New Session Modal**: Topic prompt, format selector (all 6 formats), position selector, datetime picker, preparation notes.
- **Session Detail & Evaluation Modal**:
  - Metadata breakdown (Topic, Format, Position, Date).
  - Transcript / speech notes viewer and input.
  - Evaluation panel for Coaches: Numeric score input (0–100), feedback summary, and one-click save.
