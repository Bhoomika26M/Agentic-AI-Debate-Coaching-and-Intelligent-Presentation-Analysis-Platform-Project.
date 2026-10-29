# Progress

## Status snapshot

Verdict is a working local product: guest debate practice, streamed AI replies, argument and delivery coaching, weighted scoring, learner accounts with saved work, a trends dashboard, and a grounded practice plan built from the learner's own record. The whole stack starts with `docker compose up --build`; the static frontend can deploy to Vercel or Render on its own.

Model access is no longer Ollama-only: every call goes through `app/providers.py`, which can use any OpenAI-compatible endpoint when a server-side key is configured. That makes a hosted demo possible without a GPU. **Nothing is deployed yet, and no public demo URL exists.**

## Milestone checklist

**Milestone 1, initialization and core setup: complete (roles out of scope by design).**
Auth (email, Google, password recovery, guest fallback), debate sessions with saved transcripts, learner profiles with goals and audio opt-in, curated plus personal topic bank, owner-scoped Supabase schema. Learner accounts only; no coach, admin, or staff roles in version 1.

**Milestone 2, analysis and fallacy detection: complete with deviations.**
Five-criteria argument analysis, eight fallacy types grounded in exact transcript quotes, five counterpoint styles, and a weighted 30/20/20/15/15 verdict with citations. Rebuttal is read from the learner's replies to the opponent's challenges or later points, never from the opening case, and any dimension without evidence is omitted with the remaining weights renormalized and disclosed. CSV download and print reports. Partial results disclose named gaps with retry. There is no claim or evidence extraction. Fallacy accuracy is now measured on 50 author-labelled snippets with the default local model: 73.7–77.8% precision but only 35.0–45.0% recall across three runs, so the detector is conservative rather than reliable. The numbers, raw runs and limits are in `ai-backend/evals/fallacy_results_qwen3.5-4b.md`.

**Milestone 3, simulation and coaching: complete.**
Streaming debate with game-plan briefing, a memory agent that briefs the opponent from stored digests, a verifier plus reviser on every opponent turn, Socratic follow-ups capped at 2 deep, adaptive pressure, performance dashboard with streaks and trends, and a coaching plan agent that diagnoses weak spots from the learner's own scores, drills them, and persists the plan in the learner space.

**Milestone 4, presentation analytics, testing, deployment: partial — the deployment half is not done.**
Recording and upload, timestamped transcription, pace/filler/pause signals with drills, reports and visualizations, an automated suite (280 backend tests and 11 Playwright tests) covering the deterministic gates and the agent graphs, a GitHub Actions workflow that runs pytest, the fallacy-set check, the typecheck and a build (not yet run on a GitHub runner), Dockerfiles for the API and web app with a compose file that starts Ollama, the API and the frontend together. Hosted provider routing now works. Still missing: an actual public deployment, monitoring, and native PDF/Excel exports.

## Standing decisions

- Learner accounts and AI debate simulation only; other roles and formats stay out of version 1.
- All AI logic lives in Python with FastAPI; the browser never calls a model directly.
- Local development uses Ollama. A deployment may set one server-side provider key; per-learner keys and managed multi-tenant inference stay out of scope.
- Free tools and hosting tiers only; no project-owned paid key and no paid fallback.
- Audio is discarded by default; retention needs an explicit learner opt-in.
- `.references/` stays local and untracked; this file is tracked.
- Work on `Sreeram_KL` in concise one-line conventional commits; keep Python modules focused with minimal comments.

## Build history (condensed)

- Scaffolded the React/Vite UI and FastAPI inference service with health checks, strict origins, security headers, and bounded schemas.
- Shipped the walkthrough, setup flow, streamed arena, and session recap in the Prompt-book theatre identity with self-hosted fonts and verified responsive layouts.
- Added Supabase auth, owner-scoped debate persistence, learner archive, and deployment configurations for Vercel and Render.
- Built argument intelligence (five rubrics, eight fallacies, five counterpoints) with repair retries, then hardened prompts against instruction injection with a live jailbreak rejection check.
- Migrated all coaching paths to LangGraph (guard-responder debate, fanned analysis with disclosed partials, delivery pipeline, deterministic judge) with per-call timings, then added contact scrubbing, planner briefing, Socratic challenges, and cross-session memory hooks.
- Closed scoring end to end (weighted verdict UI), then profiles, topic bank, audio retention, password recovery, adaptive pressure, dashboard trends, CSV/print exports, and partial review rendering.
- Rewrote the README around the four milestones; setup and verification live in the repository README.
- Made the debate turn agentic end to end: guard, memory, planner, streaming responder, verifier and reviser, with a corrected replacement rather than a discarded turn, and agent log lines visible under a configurable `LOG_LEVEL`.
- Built the coaching plan agent (deterministic diagnosis, model draft, groundedness verifier, one repair, deterministic fallback), exposed it at `POST /api/coach/plan`, persisted plans in `learning_plans`, and surfaced it as the Plan tab in the learner space.
- Added the automated suite with deterministic model fakes and a Docker test stage, then packaged the stack with compose so one command starts Ollama, the API and the web app.

## What's next, in order

1. Deploy the demo: host the API with a hosted provider key and point the static frontend at it, so the product can be tried without a 3.4 GB Ollama install. A real local walkthrough is already captured in `docs/demo.webm`.
2. Apply `20261010120000_create_learning_plans.sql` and exercise the Plan tab end to end with a real signed-in account, alongside auth, archive, profiles, retention, and dashboard checks.
3. Improve fallacy recall (currently 35–45%) without losing precision, grow the labelled set beyond 50 snippets, and re-run the baseline against the hosted model with its name attached.
4. Make the arena and verdict views hash addressable so a mid-debate refresh resumes where the learner was instead of landing on the home page; narrow `connect-src` in production.

## Verification

- `cd ai-backend` then `uv run pytest` passes 280 tests with no model or network.
- `cd ai-backend` then `uv run python evals/evaluate_fallacies.py --check` validates 50 labelled snippets without a model.
- `cd web` then `npx tsc -b` and `npm run build` finish with no errors.
- `docker compose build web` and `docker compose build api` both build, and `docker compose config -q` validates.
- `cd ai-backend` then `uv run python evals/evaluate_fallacies.py` ran three times against `qwen3.5:4b`; the results are in `evals/fallacy_results_qwen3.5-4b.md` (73.7–77.8% precision, 35.0–45.0% recall).
- A full guest round against the same local model ran end to end; `docs/screenshots/verdict.png` and the continuous 68-second `docs/demo.webm` were captured from it, and the API health check reported `"status": "ready"`. The learner-space screenshot uses the seeded browser-test fixture, as its README caption says.

Not verified in this environment: a public deployment, monitoring, and the GitHub Actions workflow on a GitHub runner. `docker compose up` was not repeated after these changes; only the image builds and config were checked.
