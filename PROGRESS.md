# Progress

## Status snapshot

Verdict is a working local product: guest debate practice, streamed AI replies, argument and delivery coaching, weighted scoring, learner accounts with saved work, a trends dashboard, and a grounded practice plan built from the learner's own record. The whole stack starts with `docker compose up --build`; the static frontend can deploy to Vercel or Render on its own.

Model access is no longer Ollama-only: every call goes through `app/providers.py`, which can use any OpenAI-compatible endpoint when a server-side key is configured. That makes a hosted demo possible without a GPU. **Nothing is deployed yet, and no public demo URL exists.**

## Milestone checklist

**Milestone 1, initialization and core setup: complete (roles out of scope by design).**
Auth (email, Google, password recovery, guest fallback), debate sessions with saved transcripts, learner profiles with goals and audio opt-in, curated plus personal topic bank, owner-scoped Supabase schema. Learner accounts only; no coach, admin, or staff roles in version 1.

**Milestone 2, analysis and fallacy detection: complete with deviations.**
Five-criteria argument analysis, eight fallacy types grounded in exact transcript quotes, five counterpoint styles, and a weighted 30/20/20/15/15 verdict with citations. Rebuttal is read from the learner's replies to the opponent's challenges, and any dimension without evidence is omitted with the remaining weights renormalized and disclosed. CSV download and print reports. Partial results disclose named gaps with retry. There is no claim or evidence extraction, and detector accuracy is not yet measured — a 50-snippet labelled set and scoring script are in `evals/`, but the numbers must be produced by running it.

**Milestone 3, simulation and coaching: complete.**
Streaming debate with game-plan briefing, a memory agent that briefs the opponent from stored digests, a verifier plus reviser on every opponent turn, Socratic follow-ups capped at 2 deep, adaptive pressure, performance dashboard with streaks and trends, and a coaching plan agent that diagnoses weak spots from the learner's own scores, drills them, and persists the plan in the learner space.

**Milestone 4, presentation analytics, testing, deployment: partial — the deployment half is not done.**
Recording and upload, timestamped transcription, pace/filler/pause signals with drills, reports and visualizations, an automated suite (278 backend tests and 11 Playwright tests) covering the deterministic gates and the agent graphs, GitHub Actions running pytest, the typecheck and a build, Dockerfiles for the API and web app with a compose file that starts Ollama, the API and the frontend together. Hosted provider routing now works. Still missing: an actual public deployment, monitoring, and native PDF/Excel exports.

## Standing decisions

- Learner accounts and AI debate simulation only; other roles and formats stay out of version 1.
- All AI logic lives in Python with FastAPI; the browser never calls a model directly.
- Local development uses Ollama. A deployment may set one server-side provider key; per-learner keys and managed multi-tenant inference stay out of scope.
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

1. Deploy the demo: host the API with a hosted provider key, point the static frontend at it, and record a walkthrough video so the product can be seen without a 3.4 GB Ollama install.
2. Apply `20261010120000_create_learning_plans.sql` and exercise the Plan tab end to end with a real signed-in account, alongside auth, archive, profiles, retention, and dashboard checks.
3. Run the fallacy evaluation against the hosted model and publish precision and recall with the model's name, then grow the set beyond 50 snippets.
4. Make the arena and verdict views hash addressable so a mid-debate refresh resumes where the learner was instead of landing on the home page; narrow `connect-src` in production.

## Verification

- `cd ai-backend` then `uv run pytest` passes 278 tests with no model or network.
- `cd ai-backend` then `uv run python evals/evaluate_fallacies.py --check` validates 50 labelled snippets without a model.
- `cd web` then `npx tsc -b` and `npm run build` finish with no errors.
- `docker compose up --build` serves the app on `http://localhost:8080`, where `/api/health` reports ready and a real debate turn streams through the nginx proxy.
- Backend health at `http://127.0.0.1:8000/api/health` shows `"status": "ready"` with Ollama running.

Not verified in this environment (no Ollama daemon, no hosted key): a live model turn, the fallacy precision/recall run, and the compose stack. Those need `make api` with a model.
