# System Architecture — Agentic AI Debate Coach & Presentation Analysis Platform

## Overview

The platform is a multi-tier web application that guides learners through structured debate practice, skill tracking, and (in future milestones) AI-powered coaching and presentation analysis.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        RC[React SPA<br/>Vite + Tailwind]
    end

    subgraph Gateway["API Gateway"]
        FW[FastAPI<br/>REST API v1<br/>JWT Auth + RBAC]
    end

    subgraph Services["Application Services"]
        AS[Auth Service]
        US[User / Profile Service]
        DS[Debate Session Service]
        SK[Skill Tracking Service]
        TS[Topic Service]
    end

    subgraph Storage["Storage Layer"]
        PG[(PostgreSQL<br/>Primary DB<br/>Users, Sessions,<br/>Skills, Topics)]
        MG[(MongoDB<br/>Secondary DB<br/>Transcripts &<br/>Arguments — Milestone 2+)]
    end

    subgraph AILayer["AI Layer (Planned — Milestone 2+)"]
        direction TB
        AA[Argument Analyser]
        FD[Fallacy Detector]
        SA[Speech / NLP Analyser]
        AO[AI Debate Opponent]
        PA[Presentation Analyser]
    end

    subgraph Auth["Auth Providers"]
        JW[JWT Access + Refresh Tokens]
        GO[Google OAuth2<br/>via Authlib]
    end

    RC -->|HTTPS / REST| FW
    FW --> AS & US & DS & SK & TS
    AS --> JW & GO
    US --> PG
    DS --> PG
    SK --> PG
    TS --> PG

    DS -.->|Transcripts — future| MG
    AILayer -.->|Planned integration| FW

    style AILayer fill:#1a1a2e,stroke:#6c63ff,stroke-dasharray: 6 6,color:#aaa
    style MG fill:#1a3a2e,stroke:#2ecc71,color:#aaa
```

---

## Component Descriptions

| Component | Technology | Responsibility |
|-----------|-----------|---------------|
| React SPA | Vite + React 18 + Tailwind CSS | UI rendering, routing, auth state |
| FastAPI Gateway | Python 3.11 + FastAPI | REST API, request validation, CORS |
| Auth Service | Authlib + python-jose + passlib | JWT issuance, Google OAuth, RBAC |
| User/Profile Service | SQLAlchemy 2.0 async | User CRUD, profiles, learning goals |
| Debate Session Service | SQLAlchemy 2.0 async | Topics, sessions, participants |
| Skill Tracking Service | SQLAlchemy 2.0 async | Skill records, summaries, trends |
| PostgreSQL | PostgreSQL 15 | Primary relational store |
| MongoDB | MongoDB 7 | Future: transcripts, argument graphs |
| AI Layer | Planned (Milestone 2+) | NLP, argument analysis, coaching |

---

## Request Flow

```mermaid
sequenceDiagram
    participant User as Browser (React)
    participant API as FastAPI
    participant Auth as Auth Service
    participant DB as PostgreSQL

    User->>API: POST /api/v1/auth/login {email, password}
    API->>Auth: verify_password()
    Auth->>DB: SELECT user WHERE email=...
    DB-->>Auth: User row
    Auth-->>API: User valid
    API-->>User: {access_token, refresh_token}

    User->>API: GET /api/v1/sessions (Bearer token)
    API->>Auth: verify_token(token)
    Auth-->>API: Decoded claims {sub, role}
    API->>DB: SELECT sessions WHERE user_id=...
    DB-->>API: Sessions
    API-->>User: [session list]
```

---

## Deployment Architecture (Docker Compose)

```mermaid
graph LR
    subgraph docker["docker-compose network"]
        FE[frontend<br/>:5173]
        BE[backend<br/>:8000]
        PG[(postgres<br/>:5432)]
        MG[(mongodb<br/>:27017)]
    end

    Browser --> FE
    FE -->|/api/v1/*| BE
    BE --> PG & MG
```

---

## Security Model

- **Access Token**: HS256 JWT, 15-minute TTL, contains `sub` (user_id) and `role`.
- **Refresh Token**: HS256 JWT, 7-day TTL, stored in httpOnly cookie.
- **Password Hashing**: bcrypt with 12 rounds via `passlib`.
- **Google OAuth**: PKCE flow via Authlib; user created/linked on first login.
- **RBAC**: `require_roles(*roles)` FastAPI dependency; four roles: `learner`, `debate_coach`, `educator`, `administrator`.
- **CORS**: Allow list configured via `ALLOWED_ORIGINS` env var.

---

## Future AI Integration Points

The following hooks are reserved in the codebase (as TODOs and stub modules) for Milestone 2+:

| Hook | Location | AI Feature |
|------|----------|-----------|
| `POST /sessions/{id}/analyse` | `api/v1/sessions.py` | Argument analysis + fallacy detection |
| `POST /sessions/{id}/speech` | `api/v1/sessions.py` | Speech NLP analysis |
| `POST /sessions/{id}/ai-opponent` | `api/v1/sessions.py` | AI debate opponent |
| `POST /presentations/{id}/analyse` | `api/v1/profiles.py` | Presentation analysis |
| `services/mongodb.py` | Motor async client | Transcript + argument graph storage |
