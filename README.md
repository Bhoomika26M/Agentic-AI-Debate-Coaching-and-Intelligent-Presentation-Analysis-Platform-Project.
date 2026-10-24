# Verdict

**Debate practice, with a point of view.**

Verdict is an AI debate coach for students and self-directed learners. Choose a motion, take a side, and argue it live against an opponent with a distinct personality — then get coaching on both what you argued and how you sounded saying it.

No account is required. Open the app, finish a practice round in a few minutes, and leave with clear next steps for your next debate.

![The Verdict landing page](docs/screenshots/landing.png)

---

## What you can do

**Rehearse a live debate.** Choose a motion from your topic bank or write your own, argue for or against, pick one of three opponents (Strategist, Skeptic, Diplomat), set the pressure and a 2–10 minute clock, then trade turns. Each opponent reply is drafted in full, verified, and only then displayed as a checked answer; the room labels that wait "Drafting and reviewing." The opponent plans against your weakest joint, remembers what your saved sessions showed was weak, adapts its pressure to how you argue, and can press Socratic follow-ups two deep per learner turn.

**Review your arguments.** Every rehearsal gets ratings on clarity, relevance, evidence, logic, and persuasion, fallacy flags quoted from your exact words, and five counterpoints that test your case from other angles.

**Get a weighted verdict.** Argument, evidence, logic, rebuttal, and communication are combined 30/20/20/15/15 into one deterministic summary of the review and delivery signals, each with a line of coaching behind it. It is not a second, independent model judgment. The logic score names the fallacy quotes it caught, and communication carries timestamps from your delivery review when there is one.

**Review your delivery.** Record or upload a closing take of up to three minutes. You get transcript-based pace, filler, and pause signals with timestamps you can replay, plus short drills built around what the recording actually shows. The four labels describe observable patterns — fast pace, hesitant patch, long pause, steady pace — not the speaker's emotional state. Audio is discarded after the review unless you choose to keep it.

**Follow a practice plan.** The Plan tab reads your saved sessions, names the criteria your own scores say are weakest, and drafts a drill for each, a four-week rhythm, and the one thing to work on next. Tick each drill off when you finish it; completion stays with the saved plan.

**Track your progress.** Your learner space holds your archive, a profile with goals and audio preferences, and trends across sessions, streaks, average scores, and filler direction. Download an archive CSV with transcripts, reviews, and delivery takes, or print a report. Settings can delete one rehearsal, all saved practice, or the account itself.

**Keep your work.** A free account with email or Google saves transcripts and reviews to your archive; password recovery is built in. A guest rehearsal lives only in the current browser tab and is cleared when the session ends.

---

## A round, end to end

**Set the terms.** Choose a motion from your bank or write your own, take a side, pick the opponent who attacks a case the way you find hardest, and set the pressure and the clock.

![Setting up a rehearsal: motion, side, opponent, difficulty, and length](docs/screenshots/setup.png)

**Argue it live.** Your turns and the opponent's verified replies appear in a single transcript, with your own turn and word counts kept beside it and the clock still running.

![A live rehearsal in the arena](docs/screenshots/arena.png)

**Read the verdict.** Five weighted dimensions, each with the reasoning behind the score, followed by the fuller review underneath.

![The weighted verdict with five scored dimensions](docs/screenshots/verdict.png)

---

## How it works

1. You type an argument in the browser and send it to the API.
2. A narrow deterministic guard routes obvious jailbreaks and off-motion requests to an in-character redirect with no model call. It is a coarse routing signal, not a complete injection defence, so a normal argument that merely mentions a trigger phrase still reaches the model. On a normal learner turn, a small deterministic argument-shape policy handles clear cases: it answers a challenge before probing, presses unsourced evidence, tests a load-bearing premise, challenges an absolute claim, traces a policy's consequences, or clarifies a vague causal claim. Ambiguous turns go to local Laya, which chooses among those five concrete vulnerabilities rather than the generic follow-up move. Ollama writes the in-persona reply. If the tactical layer is disabled, or no rule and no supported Laya move are available, the existing planner supplies its private weakest-joint brief. A verifier checks length, role labels, character breaks, leakage of any private prompt context (planner brief, stored-history summary, Laya tactic, pressure hint), and whether the reply engaged the latest point. A flagged turn is repaired once; a turn that still fails is replaced rather than shipped. The complete draft is reviewed before any of it is displayed.
3. Coaching fans rubric scoring, fallacy detection, and counterpoints into parallel branches that merge into one review. Every fallacy quote is matched against your own words, and contact details are redacted from saved reports. A transcript longer than 32 turns is reviewed from a condensed older summary plus the latest 32 turns; a transcript over 200 turns is declined with a clear message instead of being truncated silently.
4. The practice plan diagnoses weak spots from your scores, writes a drill for each, and refuses to invent weaknesses, scores, or session counts that your record does not support.
5. Delivery review transcribes your audio to timestamped words, counts pace, fillers, pauses, and repeats in pure Python, and turns those signals into drills.

The model only ever receives text through the API. The browser never talks to a model directly.

---

## Architecture

| Layer | Built with | Notes |
| --- | --- | --- |
| Web app | React 19, TypeScript, Vite | Landing, setup, live arena, verdict, delivery room, learner space |
| API | Python 3.12, FastAPI, Pydantic, LangGraph | All model calls, orchestration, and validation live here |
| Inference | Ollama (`qwen3.5:4b` by default) | Any endpoint reachable at `OLLAMA_BASE_URL` |
| Debate move selection | Deterministic argument-shape policy, plus Laya as an optional local PyTorch checkpoint | Clear turns are routed by policy; Laya chooses an ambiguous five-way vulnerability. Ollama still writes the reply |
| Speech | `faster-whisper` | Local transcription for delivery review; `distil-large-v3.5` by default |
| Accounts and storage | Supabase (free tier) | Auth, Postgres with row level security, private audio bucket |

---

## Milestone Checklist

| Milestone | Scope | Status |
| :--- | :--- | :--- |
| M1 — Week 1 & 2: Project Initialization, Design Process & Core Setup | Workflows definition, system architecture & database schema, UI wireframes, frontend & backend setup, authentication & role-based access, user profiles & skill tracking, debate session management | Complete |
| M2 — Week 3 & 4: Argument Analysis & Fallacy Detection | Argument analysis engine, logical fallacy detection workflows, reasoning evaluation models, argument scoring systems, debate feedback reports | Complete |
| M3 — Week 5 & 6: AI Debate Simulation & Coaching | AI debate simulation engine, counterargument generation workflows, coaching recommendation engine, personalized learning plans, performance dashboards | Complete |
| M4 — Week 7 & 8: Presentation Analytics, Testing & Deployment | Presentation analysis engine, reports & visualization modules, automated testing & validations, Docker containerization & deployment, final documentation | Complete |

### Detailed Milestone Breakdown

#### Milestone 1: Week 1 & 2 — Project Initialization, Design Process & Core Setup

- **Tasks**
  - [x] Define project objectives and debate coaching workflows.
  - [x] Design system architecture and database schema.
  - [x] Create UI wireframes and workflow planning.
  - [x] Setup frontend and backend environments.
  - [x] Implement authentication and role-based access system.
  - [x] Build user profile and skill tracking workflows.
  - [x] Create debate session management modules.
- **Outcomes**
  - [x] Understand AI-powered debate coaching workflows.
  - [x] Learn system architecture and database design concepts.
  - [x] Build frontend and backend project initialization.
  - [x] Working authentication and debate session management system.

#### Milestone 2: Week 3 & 4 — Argument Analysis & Fallacy Detection

- **Tasks**
  - [x] Implement argument analysis engine.
  - [x] Build logical fallacy detection workflows.
  - [x] Develop reasoning evaluation models.
  - [x] Create argument scoring systems.
  - [x] Generate debate feedback reports.
- **Outcomes**
  - [x] Argument analysis engine operational.
  - [x] Fallacy detection workflows functional.
  - [x] Reasoning assessment system completed.

#### Milestone 3: Week 5 & 6 — AI Debate Simulation & Coaching

- **Tasks**
  - [x] Implement AI debate simulation engine.
  - [x] Build counterargument generation workflows.
  - [x] Develop coaching recommendation engine.
  - [x] Generate personalized learning plans.
  - [x] Create performance dashboards.
- **Outcomes**
  - [x] AI debate simulation operational.
  - [x] Coaching engine functional.
  - [x] Personalized learning workflows completed.

#### Milestone 4: Week 7 & 8 — Presentation Analytics, Testing & Deployment

- **Tasks**
  - [x] Implement presentation analysis engine.
  - [x] Add reports and visualization modules.
  - [x] Implement testing and validations.
  - [x] Deploy platform using Docker and cloud services.
  - [x] Prepare final documentation and presentation.
- **Outcomes**
  - [x] Fully deployed production-ready platform.
  - [x] Debate coaching intelligence systems operational.
  - [x] Complete end-to-end debate improvement workflow demonstrable.

---

## Run it locally

You need Node.js 20 or newer, Python 3.12, `uv`, and Ollama.

**1. Start Ollama and pull the model**

```bash
ollama pull qwen3.5:4b
```

If Ollama does not start on its own, run `ollama serve` in a terminal and leave it open. Confirm it with `curl http://127.0.0.1:11434/api/tags`.

**2. Start the API**

```bash
cd ai-backend
cp .env.example .env
uv sync --extra laya
uv run --extra laya uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The defaults already point at your local Ollama and allow the local web app. The `laya` extra installs Laya and CPU-only PyTorch on Linux x86-64. The English Laya checkpoint downloads from Hugging Face on the first debate move (about 808 MB) and is cached locally. If cold loading takes more than 10 seconds, that ambiguous turn uses the existing planner; the worker thread keeps loading for later turns, and `/api/health` reports that the package is installed, not that the checkpoint is ready. Speech and test tooling install through the default `uv` groups. The first transcription downloads its own model (about 1.5 GB); `STT_DEVICE=cuda` moves transcription to an NVIDIA GPU.

Set `ENABLE_LAYA_TACTICS=false` in `ai-backend/.env` to disable the tactical layer and use the existing planner for every turn. Laya chooses only a tactic; Ollama remains responsible for the spoken debate reply. Clear argument shapes are handled before Laya is consulted, so the package is optional and a missing checkpoint only affects ambiguous turns.

This first version does not claim debate-specific accuracy. The policy validates that Laya returns one of the five supported vulnerability moves, and it does not use confidence scores as a gate. A 24-turn hand-labeled baseline lives in `ai-backend/evals/laya_moves.jsonl`; `make eval-laya` reports agreement for policy-routed and Laya-routed turns separately. The set is small, some labels are debatable, and agreement is not coaching accuracy or learner improvement.

From the repository root, `make api` and `make web` start the same two services. `make test` runs the backend pytest suite and the frontend typecheck; `make e2e` builds the web app and runs its Playwright suite (`npx playwright install chromium` once). The browser tests mock the API and Supabase REST responses, so they need no Ollama, account, or network.

**3. Start the web app**

```bash
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

**4. Optional: enable accounts**

Practice works without this. To save sessions to an archive, create a Supabase project, put its project URL and publishable key in `web/.env`, put the project URL in `ai-backend/.env` as `SUPABASE_URL`, and run the SQL files in `supabase/migrations/` in filename order. Keep email confirmation on, set the password rule to 12 or more characters with uppercase, lowercase, and numbers, and add `http://127.0.0.1:5173` to the redirect allowlist. Google sign-in is configured in the Supabase provider settings, where the client secret stays. In-app account deletion is optional: deploy the `supabase/functions/delete-account` Edge Function with `supabase functions deploy delete-account` and set its `APP_ORIGIN` secret to the web origin. Without it, learners can still delete their practice data and are told that account removal needs the operator.

---

## Docker

To include Laya in the API image, copy `.env.docker.example` to `.env` before building. It sets `EXTRAS=--extra laya`.

One command starts the API, the web app, and an Ollama service with the model pulled:

```bash
docker compose up --build          # then open http://localhost:8080
```

The first run downloads the Ollama image and about 3.4 GB of model. The first debate move downloads the Laya checkpoint (about 808 MB) into the persistent `hf-cache` volume. Set `EXTRAS=` to omit Laya and use the planner fallback. Accounts stay optional; fill in the Supabase values in `.env` to enable them.

Compose builds the `runtime` target, so `docker compose up` does not run the backend tests. Run `make test`, `uv run pytest` in `ai-backend`, or `docker build --target test ai-backend` when you want the suite exercised.

Already running Ollama on the host? Reuse it instead of the bundled service:

```bash
docker compose up api web          # with OLLAMA_BASE_URL=http://host.docker.internal:11434 in .env
```

Local transcription is built into the API image, and downloaded Hugging Face models are kept in the `hf-cache` volume. Set `EXTRAS=--extra laya` in `.env` to install Laya in the API image. Add `ser` to the extras only if you also want the optional emotion model.

---

## Speech and transcription

Delivery review transcribes locally with `faster-whisper`, so audio never leaves the machine.

| Where | What to do |
| --- | --- |
| Local API | `uv sync --extra laya`, then `uv run --extra laya uvicorn app.main:app ...` |
| Docker | Already included in the image; the downloaded model is kept in the `hf-cache` volume |

The speech packages are a `uv` dependency group that `uv sync` installs by default, so a plain sync never removes local transcription. The Delivery Room reports transcription as unavailable only when the group is left out.

`GET /api/health` reports `"transcription": "ready"` or `"unavailable"`, so you can check the wiring without uploading audio:

```bash
curl -s http://127.0.0.1:8000/api/health
cd ai-backend && uv run python -c "from app.speech import transcription_available; print(transcription_available())"
```

The default model is `distil-large-v3.5` (English only, about 1.5 GB, fetched on the first transcription). `STT_MODEL=large-v3-turbo` is the multilingual option. On CPU it runs at roughly 2.5 times realtime, so a three minute talk takes about 75 seconds. `STT_DEVICE=cuda` moves transcription onto an NVIDIA GPU, which needs CUDA 12 cuBLAS and cuDNN 9 on the machine; when they are missing the API logs a warning and falls back to CPU int8.

Whisper normalises filler words such as "um" and "uh" out of the transcript, so the filler counts in a delivery review under-report. Every delivery metric is computed from that transcript and segment timestamps; none of it measures pitch, volume, or emotion. Audio duration is read from the container before transcription starts, and decoding is capped by `MAX_TRANSCRIBE_SEC`, so an overlong or pathological upload does not hold a model slot for a full decode.

---

## Configuration

Set these in `ai-backend/.env` (see `.env.example`) unless noted.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Model endpoint the API calls |
| `OLLAMA_MODEL` | `qwen3.5:4b` | Model name to expect and request |
| `WEB_ORIGIN` | `http://127.0.0.1:5173` | Exact allowed browser origins, comma separated; wildcards are rejected |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,0.0.0.0` | Hosts the API will answer for |
| `REQUIRE_AUTH` | `false` | Set to `true` with Supabase configured before any public deployment |
| `DEPLOYMENT_ENV` | `local` | `local` allows guest mode. `public` refuses to start unless auth is required, every origin is `https`, and hosts are not loopback |
| `RATE_LIMIT_PER_MINUTE` | `60` | Per-IP API requests per minute, per process; `/api/health` is exempt |
| `MODEL_RATE_LIMIT_PER_MINUTE` | `12` | Per-learner (or guest IP) model-backed requests per minute, per process |
| `SUPABASE_URL` | empty | Enables token verification for signed-in requests |
| `SUPABASE_JWKS_URL` | derived | Override only if you serve JWKS elsewhere |
| `MAX_ACTIVE_STREAMS` | `2` | Concurrent model streams per process before requests are answered with 429 |
| `ENABLE_LAYA_TACTICS` | `true` | Use the argument-shape policy and local Laya for ambiguous moves; set false to use the planner |
| `PLANNER_EVERY_N_TURNS` | `2` | How often the fallback planner re-plans against your weakest joint |
| `STT_MODEL` | `distil-large-v3.5` | English-only Whisper model for delivery review; use `large-v3-turbo` for multilingual |
| `STT_DEVICE` | `cpu` | Set `cuda` to transcribe on an NVIDIA GPU; needs CUDA 12 cuBLAS/cuDNN 9, and falls back to CPU when they are missing |
| `STT_COMPUTE_TYPE` | `int8` CPU / `float16` CUDA | CTranslate2 precision override |
| `STT_LANGUAGE` | `en` | `auto` lets Whisper detect the language |
| `STT_BEAM_SIZE` | `5` | Decoding beams; higher is more accurate and slower |
| `STT_VAD` | `false` | Trim silence before transcription; may shift pause timings |
| `MAX_AUDIO_MB` / `MAX_AUDIO_SEC` | `10` / `180` | Upload caps, checked before transcription; duration is read from the container |
| `MAX_TRANSCRIBE_SEC` | `240` | Wall-clock decoding budget before the API returns a clear timeout error |
| `ENABLE_SER` | `false` | Local-only emotion recognition; leave off on anything public |
| `LOG_LEVEL` | `INFO` | Agent and timing logs |

In `web/.env`: `VITE_API_BASE_URL` (blank uses the dev proxy or a same-origin `/api`), `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`. Only public values belong in `VITE_` variables — they ship inside the browser bundle.

---

## API

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Model and transcription readiness |
| `POST /api/debate/stream` | Streams one opponent reply over server-sent events, ending with `[DONE]` |
| `POST /api/debate/analyze` | Argument review: ratings, fallacy flags, counterpoints, disclosed gaps |
| `POST /api/debate/challenge` | One Socratic follow-up, or done at depth 2 |
| `POST /api/debate/judge` | Weighted verdict with citations; deterministic, no model call |
| `POST /api/coach/plan` | Practice plan from your own record, grounded in diagnosed weak spots |
| `POST /api/presentation/analyze` | Audio upload plus optional motion; returns transcript, delivery signals, and drills |

With `REQUIRE_AUTH=true`, every endpoint except health requires a signed-in token. In guest mode, model-backed endpoints are capped by client IP; signed-in requests are capped per learner. Both limits are process-local.

---

## Deployment

The web app builds to static files, so it can be hosted anywhere. A Render blueprint is included as `render.yaml`, and `web/vercel.json` carries the same headers for Vercel, including a content security policy, immutable caching for hashed assets, and `microphone=(self)` for recording.

The API needs a host that can run a container and reach a model endpoint. Point `VITE_API_BASE_URL` at its HTTPS origin, set `WEB_ORIGIN` and `ALLOWED_HOSTS` to the exact origins you serve from, then set `DEPLOYMENT_ENV=public` and `REQUIRE_AUTH=true` with Supabase configured. `DEPLOYMENT_ENV=public` makes the API refuse to start with guest mode, an `http` origin, or a loopback host; it is a startup guard, not a substitute for a proxy-level limiter.

Rate limits are held in each API process. If you run more than one instance, add a shared rate limiter at the proxy or a shared store; the in-process counters do not coordinate across workers.

Two things are deliberately not in this release: managed multi-tenant inference, and per-learner provider keys for hosted generation. Until a deployment has its own authenticated API in front of a model, keep it private.

---

## Privacy and security

- Prompt construction, model calls, transcription, and coaching happen server-side. The browser never talks to a model directly.
- Signed-in data is owner-scoped by Postgres row level security. The API holds no database credential, so a leaked API token cannot read another learner's archive.
- API replies carry `no-store` headers, including SSE streams; the service starts only with explicit origins and hosts, and rejects wildcards.
- Request sizes are bounded, concurrent streams are capped, and per-IP plus per-learner request limits return `429` with `Retry-After`. Learner text is always treated as data, never as instructions.
- Recorded audio is discarded immediately after review unless the learner opts into retention, in which case it is stored in a private per-owner bucket. Deleting practice data or the account removes that audio first.
- Learners can download a full archive, delete a single rehearsal, or delete every saved practice item. Account deletion is server-mediated and removes the auth user only after its audio is gone.
- Contact details are redacted from saved coaching reports, and categorical emotion recognition stays local and off by default.

---

## Project layout

- `web/src/` — views, API clients, session handling, and styles. `features/` holds the arena, verdict, delivery room, learner space, and onboarding; `services/` holds typed API and Supabase clients.
- `ai-backend/app/` — routes in `main.py`, request schemas, the Ollama client, auth, speech, delivery signals, and the `agents/` graphs that orchestrate a debate turn, a review, a delivery pass, and a practice plan. `ai-backend/evals/` holds the small labeled baseline for the tactical selector.
- `supabase/migrations/` — sessions, turns, analyses, delivery feedback, profiles, topic bank, learning plans, and the private audio bucket, each with owner-scoped access rules.
- `docker-compose.yml`, `ai-backend/Dockerfile`, `web/Dockerfile` — the whole stack in containers, with an nginx front end that proxies `/api` and streams server-sent events unbuffered.
- `ai-backend/.env.example`, `web/.env.example`, `.env.docker.example` — every setting above with safe defaults.

---

## License

MIT. See `LICENSE`.
