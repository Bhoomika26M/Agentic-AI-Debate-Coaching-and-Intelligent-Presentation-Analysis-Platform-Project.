# Progress

## Status snapshot

Verdict is a working local product: guest debate practice, streamed AI replies, argument and delivery coaching, weighted scoring, learner accounts with saved work, and a trends dashboard. The static frontend deploys to Vercel or Render today; the Python API plus Ollama run locally or on your own machine. Public hosted AI is not yet possible.

## Milestone checklist

**Milestone 1, initialization and core setup: complete (roles out of scope by design).**
Auth (email, Google, password recovery, guest fallback), debate sessions with saved transcripts, learner profiles with goals and audio opt-in, curated plus personal topic bank, owner-scoped Supabase schema. Learner accounts only; no coach, admin, or staff roles in version 1.

**Milestone 2, analysis and fallacy detection: complete.**
Five-criteria argument analysis, eight fallacy types grounded in exact transcript quotes, five counterpoint styles, weighted 30/20/20/15/15 verdict with citations, CSV download and print reports. Partial results disclose named gaps with retry.

**Milestone 3, simulation and coaching: substantially complete.**
Streaming debate with game-plan briefing, Socratic follow-ups capped at 2 deep, adaptive pressure, performance dashboard with streaks and trends. Per-report coaching exists; a generated curriculum with learning plans and milestones does not yet.

**Milestone 4, presentation analytics, testing, deployment: analytics done, deployment open.**
Recording and upload, timestamped transcription, pace/filler/pause signals with drills, per-module testing guides in the local field guide. Missing: Docker packaging, managed backend deployment, hosted provider key routing, narrowed production CSP.

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

## What's next, in order

1. Exercise auth, archive, profiles, retention, and dashboard against real Supabase credentials.
2. Build the recommendations engine and generated learning plans Milestone 3 still owes.
3. Implement hosted provider key routing, narrow `connect-src`, decide the final host, and package or document the backend deploy. Keep categorical emotion local-only.
4. Add Docker packaging only if the chosen host needs it; prefer the lightest working deploy.

## Verification

- `cd ai-backend` then `uv run python -m compileall app` finishes with no errors.
- `cd web` then `npm run build` finishes with no errors.
- `git diff --check` is clean, and the detector over changed web targets reports nothing.
- Backend health at `http://127.0.0.1:8000/api/health` shows `"status": "ready"` with Ollama running.
