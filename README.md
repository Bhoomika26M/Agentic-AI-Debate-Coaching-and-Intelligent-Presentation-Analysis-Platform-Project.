# Verdict

Verdict is an AI debate coach for students and self directed learners. You pick a debate motion and a side, argue live against an AI opponent with a distinct personality, then get coaching on both what you argued and how you sounded saying it.

No account is needed to start. Open the app as a guest, finish a practice round in a few minutes, and leave with clear next steps for your next debate.

## What you can do

- **Rehearse live debates.** Choose a motion from your topic bank or write your own, argue for or against, pick one of three opponent personas (Strategist, Skeptic, Diplomat), set the pressure level and a 2 to 10 minute clock, then trade turns with streaming AI replies. The opponent plans against your weakest joint every other turn, remembers what your saved sessions showed was weak, eases or sharpens pressure based on how you argue, and can press Socratic follow-ups up to 2 deep.
- **Review your arguments.** After a session, get ratings on clarity, relevance, evidence, logic, and persuasion, plus fallacy flags quoted from your exact words and five counterpoints to test your case. Partial results disclose their gaps instead of failing silently.
- **Get a weighted verdict.** Act VI scores the rehearsal 30/20/20/15/15 across argument, evidence, logic, rebuttal, and communication, with quote and timestamp citations for every dimension.
- **Review your delivery.** Record or upload a closing take (up to 3 minutes). Get pace, filler, and pause signals with timestamps you can replay, plus short practice drills.
- **Follow a practice plan.** The Plan tab reads your saved sessions, names the criteria your own scores say are weakest, and drafts a drill for each plus a four-week rhythm and the one thing to work on in your next rehearsal. Rebuild it after a few sessions to keep it current.
- **Track progress.** The Learner space keeps your archive, a profile with goals and audio opt-in, and a trends tab with sessions, streaks, average scores, and filler direction. Download sessions as CSV or print a report.
- **Keep your work (optional).** Create a free account with email or Google to save transcripts and reviews in your learner archive. Password recovery is built in. Guests keep everything in the browser.

## Technologies

- **Web app:** React 19, TypeScript, Vite. This is what you see and click.
- **AI backend:** Python 3.12, FastAPI, Pydantic, LangGraph, managed with `uv`. All AI logic lives here. The browser never talks to a model directly.
- **Local model:** Ollama running `qwen3.5:4b` (about 3.4 GB). Used for debate replies and coaching during development.
- **Speech (optional):** `faster-whisper` for local transcription. Only needed for delivery review.
- **Accounts and storage (optional):** Supabase Free (Auth plus Postgres with row level security, plus a private audio bucket). Only needed if you want saved sessions.
- **Hosting:** Vercel or Render free tiers for the static frontend. The Python API runs locally or on your own machine.

## How it works

1. You type an argument in the browser.
2. The browser sends it as JSON to the Python API (`POST /api/debate/stream`), together with compact digests of your recent rehearsals.
3. Five agents answer, in order. A deterministic guard routes jailbreaks and off-motion tasks to an in-character redirect with no model call. A memory agent reduces your saved history into a private brief. A planner names the weakest joint in the transcript every other turn. The responder streams an in-persona reply. A verifier then inspects it for length, role labels, character breaks, leaked brief text and whether it engaged your latest point: a flagged turn goes to a reviser once, and a turn that still fails is replaced by the in-character redirect rather than shipped.
4. For coaching, the analysis graph fans rubric scoring, fallacy detection, and counterpoints into parallel branches with targeted retries, then merges them. Fallacy quotes must match your words exactly, and contact info is redacted from every report.
5. For your practice plan, a diagnosis agent reads the same memory reduction and names weak spots with the evidence behind them. The coach model writes drills and milestones for exactly those weak spots, a groundedness verifier rejects invented weaknesses, invented scores and next-session lines that say nothing, one repair attempt is allowed, and a plan that still fails is built from your scores directly with the gap disclosed.
6. For delivery, your audio is transcribed to timestamped words, pure Python counts pace, fillers, pauses, and repeats into delivery states (rushed, hesitant, flat, tense), and the model turns those into practice drills. Audio is discarded right after review unless you explicitly opt into keeping it.
7. Signed-in work persists owner scoped via Supabase row level security. The Python service never touches the database, so a leaked API token can burn compute but can never read another learner's archive.

Deployed AI calls use a provider key that you supply yourself. It is passed through Python for that request only and is never stored or logged. Provider routing for hosted generation is designed but not implemented yet.

## API endpoints

All endpoints except health checks require a signed-in token when the backend runs with `REQUIRE_AUTH=true`. Guest mode skips verification for local testing.

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Model readiness: ready, warming, or unavailable. |
| `POST /api/debate/stream` | Streams one opponent reply over SSE, ending with `[DONE]`. Jailbreaks get an in-character redirect with no model call. |
| `POST /api/debate/analyze` | Returns the argument review envelope: available sections plus disclosed gaps. |
| `POST /api/debate/challenge` | Returns one Socratic follow-up, or done at depth 2. |
| `POST /api/debate/judge` | Returns the deterministic weighted verdict with citations. Uses no model call. |
| `POST /api/coach/plan` | Returns a grounded practice plan: diagnosed weak spots, drills, milestones and the next session focus. Falls back to the deterministic diagnosis instead of inventing weaknesses. |
| `POST /api/presentation/analyze` | Accepts audio upload plus optional motion. Returns transcript segments, delivery signals, and drills. |

## Run it in 4 steps

You need Node.js 20 or newer, Python 3.12, `uv`, and Ollama installed.

**Step 1: start Ollama and pull the model.**

```bash
ollama pull qwen3.5:4b
```

If Ollama did not start by itself, run `ollama serve` in a terminal and leave it open. Check it with `curl http://127.0.0.1:11434/api/tags`. You should see `qwen3.5:4b` listed.

**Step 2: start the Python backend.**

```bash
cd ai-backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The defaults already point at your local Ollama and allow the local web app, so there is nothing else to change for guest practice. For delivery review, add the speech extra with `uv sync --extra stt`.

**Step 3: start the web app.**

```bash
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and choose Open the prompt book.

**Step 4 (optional): enable accounts with Supabase.**

Skip this for guest practice. To save sessions, create a free Supabase project, put its project URL and publishable key in `web/.env`, put the project URL in `ai-backend/.env` as `SUPABASE_URL`, and run the SQL files in `supabase/migrations/` in filename order. Keep email confirmation on, set the password rule to 12 or more characters with uppercase, lowercase, and numbers, and add `http://127.0.0.1:5173` to the redirect allowlist. For Google sign in, add your Google OAuth client ID and secret in the Supabase provider settings and keep the secret there only.

## Run the whole stack with Docker

One command starts the API, the web app and a local Ollama with the model pulled:

```bash
docker compose up --build          # then open http://localhost:8080
```

The first run downloads the Ollama image and about 3.4 GB of model. The web image serves the built app and proxies `/api` to the API container, so the browser only ever talks to one origin. Accounts stay optional; copy `.env.docker.example` to `.env` and fill in your Supabase values to enable them.

If you already run Ollama on the host, skip the bundled service and reuse it:

```bash
docker compose up api web          # with OLLAMA_BASE_URL=http://host.docker.internal:11434 in .env
```

Add `EXTRAS=--extra stt` to the `.env` to build the API with local transcription for delivery review. The API image has a test stage, so the suite can also run inside a clean container:

```bash
docker build --target test ./ai-backend
```

## Milestones and completion status

Each task and outcome below is a checkbox. A ticked box means the item is shipped in this repository and was exercised; an unticked box is still open, and the reason is named next to it. Every link points at a tracked file. The evidence behind every tick, including what could not be verified, is in [MILESTONE_AUDIT.md](MILESTONE_AUDIT.md).

### Milestone 1: Week 1 & 2 — Project Initialization, Design Process & Core Setup

Status: complete, with role-based access scoped to the learner on purpose.

Tasks

- [x] Define project objectives and debate coaching workflows — [PRODUCT.md](PRODUCT.md), [README.md](README.md)
- [x] Design system architecture and database schema — `ai-backend/app/` plus the schema in [supabase/migrations/](supabase/migrations), where every learner-facing table carries row level security policies
- [x] Create UI wireframes and workflow planning — workflow planning is in [PRODUCT.md](PRODUCT.md); the wireframes and per-screen specs live in local design notes (`DESIGN.md`, `.impeccable/surfaces/`) that are gitignored on purpose, so they are not part of this repository
- [x] Setup frontend and backend environments — Vite plus TypeScript in `web/`, FastAPI plus uv in `ai-backend/`
- [x] Implement authentication — email and Google sign-in, password recovery, JWKS-verified tokens, rows readable only by their owner
- [ ] Role-based access for coach, admin or staff roles — version 1 serves learners only; the learner role is enforced by Supabase row level security rather than a role table
- [x] Build user profile and skill tracking workflows — `profiles` table, profile form, trends tab, persisted practice plans
- [x] Create debate session management modules — sessions, turns, saved transcripts, archive and resume

Outcomes

- [x] Understand AI-powered debate coaching workflows — documented end to end in [PRODUCT.md](PRODUCT.md)
- [x] Learn system architecture and database design concepts — architecture notes are in the local design doc (`DESIGN.md`, gitignored) and the schema it describes is in [supabase/migrations/](supabase/migrations)
- [x] Build frontend and backend project initialization — both projects run and are built by CI-style checks below
- [x] Working authentication and debate session management system

### Milestone 2: Week 3 & 4 — Argument Analysis & Fallacy Detection

Status: complete.

Tasks

- [x] Implement argument analysis engine — [analysis_graph.py](ai-backend/app/agents/analysis_graph.py) fans out rubric, fallacy and counterpoint branches with targeted retries
- [x] Build logical fallacy detection workflows — eight fallacy types, every quote grounded against the learner's own words
- [x] Develop reasoning evaluation models — rubric branch over five named criteria
- [x] Create argument scoring systems — [judge.py](ai-backend/app/agents/judge.py), weighted 30/20/20/15/15, deterministic, no model call
- [x] Generate debate feedback reports — the verdict view, CSV download and print report

Outcomes

- [x] Argument analysis engine operational
- [x] Fallacy detection workflows functional
- [x] Reasoning assessment system completed

Partial reviews name their gaps and offer a retry instead of failing silently.

### Milestone 3: Week 5 & 6 — AI Debate Simulation & Coaching

Status: complete.

Tasks

- [x] Implement AI debate simulation engine — [debate.py](ai-backend/app/agents/debate.py): guard to memory to planner to drafter (streamed) to verifier to reviser, with an in-character fallback instead of a discarded turn
- [x] Build counterargument generation workflows — five counterpoint kinds, each enforced exactly once
- [x] Develop coaching recommendation engine — [memory.py](ai-backend/app/agents/memory.py) diagnoses weak spots from your own scores
- [x] Generate personalized learning plans — `POST /api/coach/plan`, the `learning_plans` table, and the Plan tab in the learner space
- [x] Create performance dashboards — sessions, streaks, averages and filler direction in the trends tab, plus the plan's four-week rhythm

Outcomes

- [x] AI debate simulation operational — streaming opponent with a Socratic follow-up loop capped at 2 deep and adaptive pressure
- [x] Coaching engine functional — the model may only coach weak spots the deterministic diagnosis found; invented weaknesses, scores or session counts are rejected by [verifier.py](ai-backend/app/agents/verifier.py)
- [x] Personalized learning workflows completed

### Milestone 4: Week 7 & 8 — Presentation Analytics, Testing & Deployment

Status: every task is done except managed cloud deployment and the presentation, both open on purpose.

Tasks

- [x] Implement presentation analysis engine — transcribe, then delivery signals, then drills in [delivery_graph.py](ai-backend/app/agents/delivery_graph.py), with audio discarded unless you opt in
- [x] Add reports and visualization modules — delivery signal rows, drills, print and CSV output, CSS bar visualizations
- [x] Implement testing and validations — 96 pytest tests over the deterministic gates, the agent graphs and the request contracts, with model fakes so no Ollama is needed
- [x] Deploy the platform with Docker — [ai-backend/Dockerfile](ai-backend/Dockerfile) (runtime and test stages), [web/Dockerfile](web/Dockerfile), [nginx.conf](web/nginx.conf), [docker-compose.yml](docker-compose.yml)
- [ ] Deploy to cloud services — the frontend has a static deploy config in [render.yaml](render.yaml), but managed hosting for the Python API and the model runtime, plus hosted provider key routing, are still open; do not expose a guest mode API as a public service
- [x] Prepare final documentation — this file, [PROGRESS.md](PROGRESS.md), [MILESTONE_AUDIT.md](MILESTONE_AUDIT.md) and [SECURITY.md](SECURITY.md); the `personal-guide/` walkthrough is local-only and gitignored
- [ ] Prepare the final presentation — nothing in this repository yet

Outcomes

- [ ] Fully deployed production-ready platform — Docker packaging is done; managed hosting is not
- [x] Debate coaching intelligence systems operational
- [x] Complete end-to-end debate improvement workflow demonstrable

## Checks that should pass

- Backend health at `http://127.0.0.1:8000/api/health` shows `"status": "ready"`.
- `cd ai-backend` then `uv run --extra dev python -m pytest` passes (96 tests, no model or network needed).
- `cd ai-backend` then `uv run python -m compileall app` finishes with no errors.
- `cd web` then `npm run build` finishes with no errors.
- `docker compose config --quiet` accepts the compose file.
- `git diff --check` is clean.

If debate streaming fails, Ollama is usually down or still warming the model. Use Check again in the app. If a page is blank after a production build, `VITE_API_BASE_URL` must be set to the HTTPS origin of your deployed API.

## Project layout

- `web/src/`: landing, setup, live arena, verdict and delivery views, auth screens, API clients, styles.
- `ai-backend/app/`: routes (`main.py`), prompt frames (`prompts.py`), Ollama client, debate analysis, speech transcription, delivery signals, presentation coaching, request schemas, auth, and the `agents/` graphs (guard, memory, planner, verifier, challenger, analysis, delivery, judge, plan, scrub).
- `ai-backend/tests/`: the automated suite, including deterministic fakes for the model so the graphs run without Ollama.
- `supabase/migrations/`: debate sessions, turns, analyses, presentation feedback, profiles, topic bank, learning plans, and the private audio bucket, all with owner scoped access rules.
- `docker-compose.yml`, `ai-backend/Dockerfile`, `web/Dockerfile`: the whole stack on one command.

Never put secrets in `VITE_` variables. They ship inside browser files where anyone can read them.
