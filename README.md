# Verdict

Verdict is an AI debate coach for students and self directed learners. You pick a debate motion and a side, argue live against an AI opponent with a distinct personality, then get coaching on both what you argued and how you sounded saying it.

No account is needed to start. Open the app as a guest, finish a practice round in a few minutes, and leave with clear next steps for your next debate.

## What you can do

- **Rehearse live debates.** Choose a curated or custom motion, argue for or against, pick one of three opponent personas (Strategist, Skeptic, Diplomat), set the pressure level and a 2 to 10 minute clock, then trade turns with streaming AI replies.
- **Review your arguments.** After a session, get ratings on clarity, relevance, evidence, logic, and persuasion, plus fallacy flags quoted from your exact words and five counterpoints to test your case.
- **Review your delivery.** Record or upload a closing take (up to 3 minutes). Get pace, filler, and pause signals with timestamps you can replay, plus short practice drills.
- **Keep your work (optional).** Create a free account with email or Google to save transcripts and reviews in your learner archive. Guests keep everything in the browser.

## Technologies

- **Web app:** React 19, TypeScript, Vite. This is what you see and click.
- **AI backend:** Python 3.12, FastAPI, Pydantic, managed with `uv`. All AI logic lives here. The browser never talks to a model directly.
- **Local model:** Ollama running `qwen3.5:4b` (about 3.4 GB). Used for debate replies and coaching during development.
- **Speech (optional):** `faster-whisper` for local transcription. Only needed for delivery review.
- **Accounts and storage (optional):** Supabase Free (Auth plus Postgres with row level security). Only needed if you want saved sessions.
- **Hosting:** Vercel or Render free tiers for the static frontend.

## How it works

1. You type an argument in the browser.
2. The browser sends it as JSON to the Python API (`POST /api/debate/stream`).
3. Python checks the shape of the request, builds a persona aware prompt, and streams the reply back word by word over SSE.
4. For coaching, Python asks the model for a strict JSON report (`POST /api/debate/analyze`), retries up to three times if the reply is incomplete, and drops any fallacy quote that does not match your words exactly.
5. For delivery, your audio is transcribed to timestamped words, pure Python counts pace, fillers, pauses, and repeats into delivery states (rushed, hesitant, flat, tense), and the model turns those into practice drills. Audio is discarded right after review unless you explicitly opt into keeping it.

Deployed AI calls use a provider key that you supply yourself. It is passed through Python for that request only and is never stored or logged.

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

The defaults already point at your local Ollama and allow the local web app, so there is nothing else to change for guest practice.

**Step 3: start the web app.**

```bash
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and choose Open the prompt book.

**Step 4 (optional): enable accounts with Supabase.**

Skip this for guest practice. To save sessions, create a free Supabase project, put its project URL and publishable key in `web/.env`, put the project URL in `ai-backend/.env` as `SUPABASE_URL`, and run the SQL files in `supabase/migrations/` in filename order using the Supabase SQL editor. Keep email confirmation on, set the password rule to 12 or more characters with uppercase, lowercase, and numbers, and add `http://127.0.0.1:5173` to the redirect allowlist. For Google sign in, add your Google OAuth client ID and secret in the Supabase provider settings and keep the secret there only.

## Checks that should pass

- Backend health at `http://127.0.0.1:8000/api/health` shows `"status": "ready"`.
- `cd ai-backend` then `uv run python -m compileall app` finishes with no errors.
- `cd web` then `npm run build` finishes with no errors.

If debate streaming fails, Ollama is usually down or still warming the model. Use Check again in the app. If a page is blank after a production build, `VITE_API_BASE_URL` must be set to the HTTPS origin of your deployed API.

## Project layout

- `web/src/`: landing, setup, live arena, verdict and delivery views, auth screens, API clients, styles.
- `ai-backend/app/`: routes (`main.py`), prompts, Ollama client, debate analysis, speech transcription, delivery signals, presentation coaching, request schemas, auth.
- `supabase/migrations/`: debate sessions, turns, analyses, and presentation feedback tables with owner scoped access rules.
- `personal-guide/`: a local website that explains the codebase file by file. It is ignored by git. Run `python3 -m http.server 4177 --directory personal-guide` and open `http://127.0.0.1:4177`.

Never put secrets in `VITE_` variables. They ship inside browser files where anyone can read them.
