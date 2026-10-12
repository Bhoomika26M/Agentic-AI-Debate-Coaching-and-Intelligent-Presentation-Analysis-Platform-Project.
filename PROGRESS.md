# Progress

## Status snapshot

Verdict is a working local product: guest debate practice, streamed AI replies, argument and delivery coaching, weighted scoring, learner accounts with saved work, a trends dashboard, and a grounded practice plan built from the learner's own record. The whole stack now starts with `docker compose up --build`; the static frontend still deploys to Vercel or Render on its own. Public hosted AI is not yet possible.

## Milestone checklist

**Milestone 1, initialization and core setup: complete (roles out of scope by design).**
Auth (email, Google, password recovery, guest fallback), debate sessions with saved transcripts, learner profiles with goals and audio opt-in, curated plus personal topic bank, owner-scoped Supabase schema. Learner accounts only; no coach, admin, or staff roles in version 1.

**Milestone 2, analysis and fallacy detection: complete.**
Five-criteria argument analysis, eight fallacy types grounded in exact transcript quotes, five counterpoint styles, weighted 30/20/20/15/15 verdict with citations, CSV download and print reports. Partial results disclose named gaps with retry.

**Milestone 3, simulation and coaching: complete.**
Streaming debate with game-plan briefing, a memory agent that briefs the opponent from stored digests, a verifier plus reviser on every opponent turn, Socratic follow-ups capped at 2 deep, adaptive pressure, performance dashboard with streaks and trends, and a coaching plan agent that diagnoses weak spots from the learner's own scores, drills them, and persists the plan in the learner space.

**Milestone 4, presentation analytics, testing, deployment: complete, with containers instead of a managed host.**
Recording and upload, timestamped transcription, pace/filler/pause signals with drills, reports and visualizations, an automated suite (73 tests) covering the deterministic gates and the agent graphs, Dockerfiles for the API and web app with a compose file that starts Ollama, the API and the frontend together, and README documentation for the whole stack. Open by choice: managed hosting for the Python API, hosted provider key routing, narrowed production CSP.

## Standing decisions

- Learner accounts and AI debate simulation only; other roles and formats stay out of version 1.
- All AI logic lives in Python with FastAPI; the browser never calls a model directly.
- Local development uses Ollama; deployed generation requires each learner's own provider key, handled transiently and never stored.
- Free tools and hosting tiers only; no project-owned paid key and no paid fallback.
- Audio is discarded by default; retention needs an explicit learner opt-in.
- `.references/` and `personal-guide/` stay local and untracked; this file is tracked.
- Work on `Sreeram_KL` in concise one-line conventional commits; keep Python modules focused with minimal comments.

## Build history (condensed)

- Scaffolded the React/Vite UI and FastAPI inference service with health checks, strict origins, security headers, and bounded schemas.
- Shipped the walkthrough, setup flow, streamed arena, and session recap in the Prompt-book theatre identity with self-hosted fonts and verified responsive layouts.
- Added Supabase auth, owner-scoped debate persistence, learner archive, and deployment configurations for Vercel and Render.
- Built argument intelligence (five rubrics, eight fallacies, five counterpoints) with repair retries, then hardened prompts against instruction injection with a live jailbreak rejection check.
- Migrated all coaching paths to LangGraph (guard-responder debate, fanned analysis with disclosed partials, delivery pipeline, deterministic judge) with per-call timings, then added contact scrubbing, planner briefing, Socratic challenges, and cross-session memory hooks.
- Closed scoring end to end (weighted verdict UI), then profiles, topic bank, audio retention, password recovery, adaptive pressure, dashboard trends, CSV/print exports, and partial review rendering.
- Rewrote the README around the four milestones and moved full setup plus per-milestone testing into the untracked field guide.
- Made the debate turn agentic end to end: guard, memory, planner, streaming responder, verifier and reviser, with a corrected replacement rather than a discarded turn, and agent log lines visible under a configurable `LOG_LEVEL`.
- Built the coaching plan agent (deterministic diagnosis, model draft, groundedness verifier, one repair, deterministic fallback), exposed it at `POST /api/coach/plan`, persisted plans in `learning_plans`, and surfaced it as the Plan tab in the learner space.
- Added the automated suite with deterministic model fakes and a Docker test stage, then packaged the stack with compose so one command starts Ollama, the API and the web app.

## What's next, in order

1. Apply `20261010120000_create_learning_plans.sql` and exercise the Plan tab end to end with a real signed-in account, alongside auth, archive, profiles, retention, and dashboard checks.
2. Make the arena and verdict views hash addressable so a mid-debate refresh resumes where the learner was instead of landing on the home page.
3. Implement hosted provider key routing, narrow `connect-src`, and decide the final host for the Python API; keep categorical emotion local-only.
4. Move the agent traces into something structured (per-turn step counts and timings) if the pipeline grows more branches.

## Verification

- `cd ai-backend` then `uv run python -m pytest` passes 73 tests with no model or network.
- `cd ai-backend` then `uv run python -m compileall app` finishes with no errors.
- `cd web` then `npm run build` finishes with no errors.
- `git diff --check` is clean, and the detector over changed web targets reports nothing.
- Backend health at `http://127.0.0.1:8000/api/health` shows `"status": "ready"` with Ollama running.
- `docker compose up --build` serves the app on `http://localhost:8080`, where `/api/health` reports ready and a real debate turn streams through the nginx proxy.
