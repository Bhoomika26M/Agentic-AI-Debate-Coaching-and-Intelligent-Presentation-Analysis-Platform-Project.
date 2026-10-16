# DebateIQ: REST API & WebSocket Documentation

## Base URL: `/api/v1`

### 1. Authentication & Users
- `POST /auth/register` — Register a new user (`email`, `password`, `full_name`, `role`). Returns tokens.
- `POST /auth/login` — Login with credentials. Returns `access_token` and `refresh_token`.
- `POST /auth/refresh` — Refresh access token using refresh token.
- `POST /auth/google` — Mock / OAuth2 Google SSO handler.
- `GET /auth/me` — Get authenticated user details and active role.
- `GET /users` — List platform users (Admin, Coach, Educator).
- `PATCH /users/{user_id}/role` — Update user role (Admin only).

### 2. User Profiles & Skills
- `GET /profiles/me` — Get current user's profile, XP, debater level, and badges.
- `PUT /profiles/me` — Update experience level, preferred topics, domains, bio.
- `GET /skills/me` — Get current user's 5-pillar skill metrics and speech averages.
- `PUT /skills/me` — Update skill ratings (self or diagnostic).
- `POST /skills/{user_id}/recalibrate` — Recalibrate student skills (Coach, Admin).
- `GET /goals` — List learning goals.
- `POST /goals` — Create a new learning goal.
- `PATCH /goals/{goal_id}` — Update goal progress or mark completed.
- `DELETE /goals/{goal_id}` — Remove a goal.

### 3. Debate Topics & Sessions
- `GET /debates/formats` — List the 6 supported debate formats with rules, speaker orders, and timers.
- `GET /debates/topics` — List curated and user-created debate motions.
- `POST /debates/topics` — Create a new debate topic motion.
- `POST /debates/topics/ai-suggest` — Get AI-generated debate motions tailored to user level.
- `GET /debates/sessions` — List debate sessions with optional format and status filters.
- `POST /debates/sessions` — Schedule a new debate match with position and format.
- `GET /debates/sessions/{session_id}` — Get full session details, participants, and turns.
- `PATCH /debates/sessions/{session_id}` — Update session metadata or advance status (`scheduled` -> `live` -> `completed`).
- `POST /debates/sessions/{session_id}/join` — Assign or switch speaker position (`proposition`, `opposition`, `adjudicator`).
- `POST /debates/sessions/{session_id}/turns` — Submit a speech turn (text or Web Speech transcript).
- `GET /debates/sessions/{session_id}/turns` — List all turns in sequence.

### 4. Argument Analysis & Fallacy Engine (Milestone 2)
- `GET /analysis/fallacy-catalog` — Full knowledgebase of the 8 canonical fallacies.
- `POST /analysis/fallacies` — Scan text for logical fallacies with exact spans and rewrites.
- `POST /analysis/arguments` — Deconstruct discourse, extract claims/evidence, score on 5 criteria.
- `POST /analysis/evaluate` — Synthesize full Debate Feedback Report.
- `GET /analysis/reports` — List feedback reports.
- `GET /analysis/reports/{report_id}` — Retrieve feedback report with strengths and drills.

### 5. AI Simulation, Rebuttals & Coaching (Milestone 3)
- `POST /simulation/turn` — Generate next AI opponent turn, counterpoint, and challenge questions.
- `GET /simulation/stream` — SSE stream for live AI debate generation.
- `POST /simulation/coach-whisper` — Generate live tactical tips for the active speaker.
- `POST /rebuttals/generate` — Generate the 5 distinct rebuttal dimensions (Logical, Evidence, Ethical, Practical, Policy).
- `GET /scoring/session/{session_id}` — Compute weighted scores (30/20/20/15/15) for a completed match.
- `GET /coaching/plan` — Retrieve personalized multi-week learning plan and exercises.
- `GET /dashboards/{role}` — Role-specific aggregated analytics (learner, coach, educator, admin).
- `GET /notifications` — List user notifications.
- `PATCH /notifications/{notification_id}/read` — Mark notification read.
