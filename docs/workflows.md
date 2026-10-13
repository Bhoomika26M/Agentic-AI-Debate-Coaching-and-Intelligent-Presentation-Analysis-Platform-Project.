# Workflows — Agentic AI Debate Coach & Presentation Analysis Platform

## 1. Learner Practice Workflow

```mermaid
flowchart TD
    A([Learner logs in]) --> B[View Dashboard]
    B --> C{Choose action}

    C --> D[Browse Debate Topics]
    D --> E[Create / Join Session]
    E --> F[Select position: For / Against / Observer]
    F --> G[Wait for session to start]
    G --> H[Session goes ACTIVE]
    H --> I[Participate in debate]
    I --> J[Session COMPLETED]
    J --> K[View session recap]
    K --> L[Skill scores recorded]
    L --> M[Update Learning Goals]
    M --> N[View Skills Summary & Trend]

    C --> O[Set / Update Learning Goals]
    C --> P[View Skills Dashboard]
    C --> Q[Update Profile & Preferences]

    style A fill:#6c63ff,color:#fff
    style J fill:#2ecc71,color:#fff
```

### Key Rules
- Learners can only view/manage their **own** data.
- A learner may join a session as `for`, `against`, or `observer`.
- Skill records are auto-created when a session is completed (manual entry also allowed).
- Learning goals are user-managed; status changes are manual in Milestone 1, automated in Milestone 2+.

---

## 2. Debate Coach Review Workflow

```mermaid
flowchart TD
    A([Coach logs in]) --> B[View Dashboard]
    B --> C[See Assigned Learners]
    C --> D{Select learner}
    D --> E[View learner profile & skill history]
    E --> F[View learner's past debate sessions]
    F --> G[View session detail & skill records]
    G --> H{Action needed?}
    H -- Add skill score --> I[POST /skills — manual score entry]
    H -- Review presentation --> J[View presentation history]
    H -- No action --> K[Continue monitoring]
    I --> L[Learner notified — Milestone 2+]

    style A fill:#e67e22,color:#fff
    style L fill:#95a5a6,color:#fff,stroke-dasharray: 5 5
```

### Key Rules
- Coaches can view **assigned learners'** session history and skill records.
- Coaches can add manual skill scores on behalf of a learner (source = `"manual"`).
- Coaches **cannot** modify user accounts or create new topics.

---

## 3. Educator Class Monitoring Workflow

```mermaid
flowchart TD
    A([Educator logs in]) --> B[View Educator Dashboard]
    B --> C[See learners in class]
    C --> D{Action}
    D --> E[View individual learner skills & goals]
    D --> F[View debate topics list]
    D --> G[Create new debate topic]
    D --> H[Schedule a class debate session]
    H --> I[Set format, topic, scheduled_at]
    I --> J[Session SCHEDULED]
    J --> K[Learners join session]
    K --> L[Start session → ACTIVE]
    L --> M[Session completes → COMPLETED]
    M --> N[Review class skill trends]

    style A fill:#3498db,color:#fff
    style J fill:#f39c12,color:#fff
    style M fill:#2ecc71,color:#fff
```

### Key Rules
- Educators can view **all learners** (their class scope enforced in Milestone 2+; currently all learners in Milestone 1).
- Educators can create topics and schedule sessions.
- Educators can start/complete sessions they created.

---

## 4. Administrator Management Workflow

```mermaid
flowchart TD
    A([Admin logs in]) --> B[Admin Dashboard]
    B --> C{Manage area}

    C --> D[User Management]
    D --> D1[List all users]
    D1 --> D2[View any user profile]
    D2 --> D3[Activate / Deactivate user]

    C --> E[Topic Management]
    E --> E1[Create / Edit / Delete topics]

    C --> F[Session Management]
    F --> F1[View all sessions]
    F1 --> F2[Cancel any session]

    C --> G[Role Assignment]
    G --> G1[Change user role]

    C --> H[System Health]
    H --> H1[OpenAPI docs at /docs]
    H --> H2[Database seed script]

    style A fill:#e74c3c,color:#fff
    style D3 fill:#e74c3c,color:#fff,opacity:0.8
```

### Key Rules
- Administrators have **full access** to all resources.
- Only administrators can change user roles or deactivate accounts.
- Seed script (`python -m app.seed`) creates initial admin + sample data.

---

## 5. Session Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> scheduled : POST /sessions (create)
    scheduled --> active : POST /sessions/{id}/start
    scheduled --> cancelled : POST /sessions/{id}/cancel
    active --> completed : POST /sessions/{id}/complete
    active --> cancelled : POST /sessions/{id}/cancel
    completed --> [*]
    cancelled --> [*]
```

---

## 6. Authentication Flow

```mermaid
flowchart LR
    A([User]) --> B{Login method}
    B -- Email + Password --> C[POST /auth/login]
    C --> D[Verify bcrypt hash]
    D --> E[Issue access_token + refresh_token]

    B -- Google OAuth --> F[GET /auth/google/login]
    F --> G[Google consent screen]
    G --> H[GET /auth/google/callback?code=...]
    H --> I[Exchange code → Google user info]
    I --> J{User exists?}
    J -- Yes --> K[Return tokens]
    J -- No --> L[Create user row → Return tokens]

    E --> M[Client stores tokens]
    K --> M
    L --> M
    M --> N[Access protected routes with Bearer token]
    N --> O{Token expired?}
    O -- No --> P[200 OK]
    O -- Yes --> Q[POST /auth/refresh]
    Q --> R[New access_token]
    R --> N

    style A fill:#6c63ff,color:#fff
    style P fill:#2ecc71,color:#fff
```
