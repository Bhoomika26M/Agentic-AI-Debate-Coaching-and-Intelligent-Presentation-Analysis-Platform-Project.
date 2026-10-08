# Verdict

Verdict is an AI debate coach for students and self directed learners. You pick a debate motion and a side, argue live against an AI opponent with a distinct personality, then get coaching on both what you argued and how you sounded saying it.

No account is needed to start. Open the app as a guest, finish a practice round in a few minutes, and leave with clear next steps for your next debate.

## What you can do

- **Rehearse live debates.** Choose a motion from your topic bank or write your own, argue for or against, pick one of three opponent personas (Strategist, Skeptic, Diplomat), set the pressure level and a 2 to 10 minute clock, then trade turns with streaming AI replies. The opponent plans against your weakest joint every other turn, eases or sharpens pressure based on how you argue, and can press Socratic follow-ups up to 2 deep.
- **Review your arguments.** After a session, get ratings on clarity, relevance, evidence, logic, and persuasion, plus fallacy flags quoted from your exact words and five counterpoints to test your case. Partial results disclose their gaps instead of failing silently.
- **Get a weighted verdict.** Act VI scores the rehearsal 30/20/20/15/15 across argument, evidence, logic, rebuttal, and communication, with quote and timestamp citations for every dimension.
- **Review your delivery.** Record or upload a closing take (up to 3 minutes). Get pace, filler, and pause signals with timestamps you can replay, plus short practice drills.
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
2. The browser sends it as JSON to the Python API (`POST /api/debate/stream`).
3. A deterministic guard routes jailbreaks and off-motion tasks to an in-character redirect with no model call. Otherwise a planner briefs the responder on your weakest joint and the reply streams back word by word over SSE.
4. For coaching, the analysis graph fans rubric scoring, fallacy detection, and counterpoints into parallel branches with targeted retries, then merges them. Fallacy quotes must match your words exactly, and contact info is redacted from every report.
5. For delivery, your audio is transcribed to timestamped words, pure Python counts pace, fillers, pauses, and repeats into delivery states (rushed, hesitant, flat, tense), and the model turns those into practice drills. Audio is discarded right after review unless you explicitly opt into keeping it.
6. Signed-in work persists owner scoped via Supabase row level security. The Python service never touches the database, so a leaked API token can burn compute but can never read another learner's archive.

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

## Milestones and completion status

**Milestone 1 (Weeks 1 and 2): initialization, design, core setup. Status: complete, with roles intentionally out of scope.**

- Done: objectives and debate workflows, system architecture, database schema with owner scoped access, wireframes and workflow planning, frontend and backend environments, email plus Google authentication with password recovery, learner profiles with goals and audio opt-in, topic bank with curated seed, debate session management with saved transcripts.
- Deliberately excluded: coach, admin, or staff roles. Version 1 serves learners only.

**Milestone 2 (Weeks 3 and 4): argument analysis and fallacy detection. Status: complete.**

- Done: argument analysis engine across five rubric criteria, fallacy detection across eight types with exact quote grounding, reasoning evaluation through rubric scores, weighted scoring at 30/20/20/15/15 with citations, feedback reports in the verdict with CSV download and print support.
- Partial reviews disclose named gaps with a retry affordance instead of failing silently.

**Milestone 3 (Weeks 5 and 6): simulation and coaching. Status: substantially complete, two items partial.**

- Done: AI debate simulation with streaming and game-plan briefing, counterargument generation across five kinds, Socratic follow-up loop capped at 2 deep, adaptive pressure from turn signals, performance dashboard with sessions, streaks, averages, and filler trends.
- Partial: coaching recommendations and personalized learning plans arrive per report (next steps, drills, profile goals) rather than as a generated curriculum or milestone system. Those remain future work.

**Milestone 4 (Weeks 7 and 8): presentation analytics, testing, deployment. Status: analytics and validation complete, deployment honest about its limits.**

- Done: presentation recording and upload, transcription with timestamps, pace, filler, and pause features with tutor drills, reports and CSS bar visualizations, full testing guides per module in the local field guide, setup documentation.
- Not done: Docker packaging and managed backend deployment. The frontend deploys static to Vercel or Render today; the Python API plus Ollama run locally or on your own machine. Hosted generation needs per learner provider keys, which are designed but not implemented. Do not expose a guest mode API as a public service.

## Checks that should pass

- Backend health at `http://127.0.0.1:8000/api/health` shows `"status": "ready"`.
- `cd ai-backend` then `uv run python -m compileall app` finishes with no errors.
- `cd web` then `npm run build` finishes with no errors.
- `git diff --check` is clean.

If debate streaming fails, Ollama is usually down or still warming the model. Use Check again in the app. If a page is blank after a production build, `VITE_API_BASE_URL` must be set to the HTTPS origin of your deployed API.

## Project layout

- `web/src/`: landing, setup, live arena, verdict and delivery views, auth screens, API clients, styles.
- `ai-backend/app/`: routes (`main.py`), prompt frames (`prompts.py`), Ollama client, debate analysis, speech transcription, delivery signals, presentation coaching, request schemas, auth, and the `agents/` graphs (guard, planner, challenger, memory, analysis, delivery, judge, scrub).
- `supabase/migrations/`: debate sessions, turns, analyses, presentation feedback, profiles, topic bank, and the private audio bucket, all with owner scoped access rules.

Never put secrets in `VITE_` variables. They ship inside browser files where anyone can read them.
