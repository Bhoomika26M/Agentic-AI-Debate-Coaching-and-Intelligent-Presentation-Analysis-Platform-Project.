# Agentic AI Debate Coach & Presentation Analysis Platform
## Database Schema Specification (Milestone 1)

### 1. Entity-Relationship Overview

```mermaid
erDiagram
    USERS ||--|| PROFILES : has
    USERS ||--|| USER_SKILLS : possesses
    USERS ||--o{ SESSION_PARTICIPANTS : joins
    USERS ||--o{ DEBATE_SESSIONS : creates
    DEBATE_TOPICS ||--o{ DEBATE_SESSIONS : frames
    DEBATE_SESSIONS ||--o{ SESSION_PARTICIPANTS : includes
    DEBATE_SESSIONS ||--o{ SESSION_TRANSCRIPTS : records
    DEBATE_SESSIONS ||--o{ PERFORMANCE_EVALUATIONS : produces
    USERS ||--o{ NOTIFICATIONS : receives

    USERS {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        string role "Learner | Debate Coach | Educator | Administrator"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PROFILES {
        uuid id PK
        uuid user_id FK
        string experience_level "Novice | Intermediate | Advanced | Champion"
        json preferred_topics
        json presentation_domains
        text learning_goals
        string coaching_preferences
        string bio
        timestamp updated_at
    }

    USER_SKILLS {
        uuid id PK
        uuid user_id FK
        float argument_quality "0-100"
        float evidence_usage "0-100"
        float logical_consistency "0-100"
        float rebuttal_effectiveness "0-100"
        float communication_skills "0-100"
        float speech_pace_wpm
        float confidence_score "0-100"
        integer debates_completed
        timestamp updated_at
    }

    DEBATE_TOPICS {
        uuid id PK
        string title
        text motion_text
        string category "Ethics | AI & Tech | Economics | Climate | Law | Healthcare"
        string difficulty_level "Beginner | Intermediate | Advanced"
        text proposition_stance
        text opposition_stance
        uuid created_by FK
        timestamp created_at
    }

    DEBATE_SESSIONS {
        uuid id PK
        uuid topic_id FK
        string debate_format "One-on-One | Parliamentary | Oxford | Policy | Public Forum | AI Debate Simulation"
        string session_title
        string status "scheduled | in_progress | completed | cancelled"
        timestamp scheduled_start
        timestamp actual_start
        timestamp actual_end
        uuid moderator_id FK
        uuid created_by FK
        timestamp created_at
    }

    SESSION_PARTICIPANTS {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        string position "proposition | opposition | adjudicator | observer"
        string speaking_order
        integer score_awarded
        timestamp joined_at
    }

    SESSION_TRANSCRIPTS {
        uuid id PK
        uuid session_id FK
        uuid speaker_id FK
        integer turn_number
        string speaker_role "proposition | opposition | ai_opponent | moderator"
        text transcript_text
        float speech_duration_sec
        json detected_arguments
        json detected_fallacies
        timestamp timestamp
    }

    PERFORMANCE_EVALUATIONS {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        float overall_performance_score
        float argument_quality_score
        float evidence_usage_score
        float logical_consistency_score
        float rebuttal_effectiveness_score
        float communication_skills_score
        text personalized_coaching_feedback
        json recommended_exercises
        timestamp evaluated_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string notification_type "session_reminder | coaching_alert | skill_milestone | platform_announcement"
        string title
        text message
        boolean is_read
        timestamp created_at
    }
```

---

### 2. Table Specifications & Constraints

#### 2.1 Table: `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID identifier |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Account email for credentials |
| `hashed_password` | `VARCHAR(255)` | NOT NULL | Salted bcrypt password hash |
| `full_name` | `VARCHAR(120)` | NOT NULL | User's display / legal name |
| `role` | `VARCHAR(32)` | NOT NULL, DEFAULT 'Learner' | One of: Learner, Debate Coach, Educator, Administrator |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Account state |
| `created_at` | `DATETIME` | DEFAULT UTC_NOW | Registration timestamp |
| `updated_at` | `DATETIME` | DEFAULT UTC_NOW | Last modified timestamp |

#### 2.2 Table: `profiles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID identifier |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`users.id`), UNIQUE | Associated user |
| `experience_level` | `VARCHAR(32)` | DEFAULT 'Novice' | Novice, Intermediate, Advanced, Champion |
| `preferred_topics` | `JSON` | NULLABLE | Array of topic tags (Ethics, AI, Economics...) |
| `presentation_domains` | `JSON` | NULLABLE | Array of domains (Pitch, Keynote, Oxford...) |
| `learning_goals` | `TEXT` | NULLABLE | Specific mastery targets |
| `coaching_preferences` | `VARCHAR(64)` | DEFAULT 'Socratic & Balanced' | Coaching style |
| `bio` | `TEXT` | NULLABLE | User bio / background description |
| `updated_at` | `DATETIME` | DEFAULT UTC_NOW | Last profile update |

#### 2.3 Table: `user_skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID identifier |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`users.id`), UNIQUE | Associated user |
| `argument_quality` | `FLOAT` | DEFAULT 50.0 | Argument construction strength (0-100) |
| `evidence_usage` | `FLOAT` | DEFAULT 50.0 | Factual citation & empirical backing (0-100) |
| `logical_consistency` | `FLOAT` | DEFAULT 50.0 | Fallacy resistance & syllogistic rigor (0-100) |
| `rebuttal_effectiveness`| `FLOAT` | DEFAULT 50.0 | Counterargument sharpness (0-100) |
| `communication_skills` | `FLOAT` | DEFAULT 50.0 | Delivery, clarity, confidence (0-100) |
| `speech_pace_wpm` | `FLOAT` | DEFAULT 135.0 | Average speech tempo (words/min) |
| `confidence_score` | `FLOAT` | DEFAULT 60.0 | Aggregate confidence metric (0-100) |
| `debates_completed` | `INTEGER` | DEFAULT 0 | Count of completed sessions |
| `updated_at` | `DATETIME` | DEFAULT UTC_NOW | Last skill recalibration |

#### 2.4 Table: `debate_topics`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID identifier |
| `title` | `VARCHAR(200)` | NOT NULL | Short title |
| `motion_text` | `TEXT` | NOT NULL | Formal debate motion ("This House Would...") |
| `category` | `VARCHAR(64)` | NOT NULL | Ethics, AI, Economics, Climate, Law, Healthcare |
| `difficulty_level` | `VARCHAR(32)` | DEFAULT 'Intermediate' | Beginner, Intermediate, Advanced |
| `proposition_stance`| `TEXT` | NULLABLE | Summary rationale for Proposition |
| `opposition_stance` | `TEXT` | NULLABLE | Summary rationale for Opposition |
| `created_by` | `VARCHAR(36)` | FOREIGN KEY (`users.id`) | Creator ID |
| `created_at` | `DATETIME` | DEFAULT UTC_NOW | Creation timestamp |

#### 2.5 Table: `debate_sessions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID identifier |
| `topic_id` | `VARCHAR(36)` | FOREIGN KEY (`debate_topics.id`) | Assigned debate topic |
| `debate_format` | `VARCHAR(64)` | NOT NULL | One of 6 formats |
| `session_title` | `VARCHAR(200)` | NOT NULL | Display title for the session |
| `status` | `VARCHAR(32)` | DEFAULT 'scheduled' | scheduled, in_progress, completed, cancelled |
| `scheduled_start` | `DATETIME` | NOT NULL | Planned start time |
| `actual_start` | `DATETIME` | NULLABLE | Actual timestamp started |
| `actual_end` | `DATETIME` | NULLABLE | Actual timestamp ended |
| `created_by` | `VARCHAR(36)` | FOREIGN KEY (`users.id`) | Host user ID |
| `created_at` | `DATETIME` | DEFAULT UTC_NOW | Creation timestamp |

#### 2.6 Table: `session_participants`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PRIMARY KEY | Unique UUID identifier |
| `session_id` | `VARCHAR(36)` | FOREIGN KEY (`debate_sessions.id`) | Associated session |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`users.id`) | Participating user |
| `position` | `VARCHAR(32)` | NOT NULL | proposition, opposition, adjudicator, observer |
| `speaking_order` | `INTEGER` | DEFAULT 1 | Speaker position index |
| `score_awarded` | `FLOAT` | NULLABLE | Overall awarded score |
| `joined_at` | `DATETIME` | DEFAULT UTC_NOW | Join timestamp |

---

### 3. Database Indexes for High-Concurrency Performance
1. `users(email)` - Unique B-Tree index for instantaneous authentication.
2. `debate_sessions(status, scheduled_start)` - Composite index for dashboard scheduling queries.
3. `session_participants(session_id, user_id)` - Composite index for fast membership validation.
4. `user_skills(user_id)` - Fast 1:1 lookup for real-time coach feedback.
