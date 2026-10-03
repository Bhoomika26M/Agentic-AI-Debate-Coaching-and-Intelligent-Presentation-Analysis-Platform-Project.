# Verdict Setup

This guide takes a clean machine to a working Verdict product: guest debate practice, streamed AI replies, argument analysis, plus learner accounts and saved sessions via Supabase.

Guest practice works without Supabase. Signed-in practice needs Supabase Auth + database.

## Prerequisites

- Node.js 20 or newer
- Python 3.12
- [`uv`](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com/download)
- A free Supabase account (only needed for accounts/saved sessions)

## 1. Start Ollama

Install Ollama, start its service, then pull the model:

```bash
ollama pull qwen3.5:4b
```

If Ollama did not start as a desktop service, run in a terminal and leave it open:

```bash
ollama serve
```

This quantized model is about 3.4 GB. Memory use depends on context length and GPU memory.

Verify Ollama answers:

```bash
curl http://127.0.0.1:11434/api/tags
```

You should see `qwen3.5:4b` listed.

## 2. Configure the Python backend

```bash
cd ai-backend
cp .env.example .env
```

`ai-backend/.env` keys:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:4b
WEB_ORIGIN=http://127.0.0.1:5173
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
MAX_ACTIVE_STREAMS=2
SUPABASE_URL=
SUPABASE_JWKS_URL=
SUPABASE_JWT_ISSUER=
REQUIRE_AUTH=false
```

Rules:

- Keep `REQUIRE_AUTH=false` for testing so guest practice works.
- Leave `SUPABASE_*` empty until Section 4 is done. Empty means guest-only; the API skips token verification.
- After Supabase is ready, set `SUPABASE_URL` to your project URL (for example `https://xyzcompany.supabase.co`). `SUPABASE_JWKS_URL` and `SUPABASE_JWT_ISSUER` default to `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` and `<SUPABASE_URL>/auth/v1`, so set them explicitly only if you use a custom issuer.
- `WEB_ORIGIN` must list your exact frontend origin(s), comma-separated. `ALLOWED_HOSTS` must list your API hostnames. Wildcards are rejected.

## 3. Configure the web app

```bash
cd web
cp .env.example .env
```

`web/.env` keys:

```dotenv
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Rules:

- Leave `VITE_API_BASE_URL` blank for testing. Vite proxies `/api` to `http://127.0.0.1:8000`.
- Leave Supabase vars empty for guest-only testing. The UI shows “Account service needs Supabase setup. Guest practice is ready now.”
- `VITE_` variables ship in browser assets. Never put secrets there: no service-role key, no OAuth client secret, no model-provider key.

## 4. Set up Supabase (accounts + saved sessions)

Skip this section for guest-only testing. Complete it for sign-up, sign-in, Google OAuth, and the learner archive.

### 4.1 Create the project

1. Create a free Supabase project.
2. Copy its Project URL and publishable key.
3. Put them in `web/.env`:

```dotenv
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

4. Put the project URL in `ai-backend/.env`:

```dotenv
SUPABASE_URL=https://xyzcompany.supabase.co
```

Restart both services after changing env files.

### 4.2 Apply the database migrations

In Supabase Dashboard → SQL Editor, run these files in timestamp order:

1. `supabase/migrations/20261002090000_create_debate_records.sql`
2. `supabase/migrations/20261002110000_create_debate_analyses.sql`

This creates:

- `public.debate_sessions` (topic, side, persona, difficulty, duration, status)
- `public.debate_turns` (ordered transcript turns)
- `public.debate_analyses` (saved coaching report per session)

All three enable row-level security and grant access only to `authenticated` users scoped to their own `auth.uid()`.

Verify in Supabase → Table Editor that the three tables exist, then in Authentication → Policies that RLS is enabled.

### 4.3 Email auth

In Supabase → Authentication → Providers → Email:

- Keep email confirmation enabled.
- Set the password policy to at least 12 characters with uppercase, lowercase, and numeric characters. Verdict enforces the same rule in the UI.

In Authentication → URL Configuration:

- Site URL: `http://127.0.0.1:5173` for testing.
- Redirect allowlist: add `http://127.0.0.1:5173` and your deployed site origin.
- Verdict sends `emailRedirectTo: window.location.origin` on sign-up and `redirectTo: window.location.origin` for Google, so both origins must be allowed.

### 4.4 Google OAuth

1. In Google Cloud Console, create an OAuth client (Web application).
2. Add authorized JavaScript origins:
   - `http://127.0.0.1:5173`
   - your deployed frontend origin
3. Add authorized redirect URI for Supabase:
   - `https://xyzcompany.supabase.co/auth/v1/callback`
   - Replace the host with your Supabase project URL.
4. Copy the Google Client ID and Client Secret.
5. In Supabase → Authentication → Providers → Google:
   - Enable Google.
   - Paste Client ID and Client Secret. Keep the secret in Supabase only.
6. Test with “Continue with Google” in Verdict. Supabase returns to your site origin; Verdict persists the session automatically.

The hosted free email service is rate-limited, so it suits testing but not high-volume signups.

## 5. Run the services

Terminal 1 — backend:

```bash
cd ai-backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — frontend:

```bash
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Backend health is at `http://127.0.0.1:8000/api/health`:

```json
{
  "status": "ready",
  "model": "qwen3.5:4b",
  "model_available": true,
  "model_loaded": true
}
```

- `warming`: Ollama is up but the model is still loading. The UI polls every 2.5s.
- `model_unavailable` / `offline`: start Ollama and pull the model, then use “Check again” in the UI.

Production checks:

```bash
cd ai-backend
uv run python -m compileall app
cd ../web
npm run build
```

Both must pass with no errors.

## 6. Verify the product works

### A. Guest debate (no Supabase needed)

1. Open the app → “Open the prompt book”.
2. Pick a curated motion or write a custom motion (3–240 chars).
3. Choose side, opponent (`strategist`, `skeptic`, `diplomat`), pressure (`warm-up`, `challenge`, `cross-examination`), and time (2–10 min).
4. Start the session. The opponent opening streams in. The entrance cue shows briefly; streamed text accumulates with a blinking cursor.
5. Send one learner argument. Confirm a streamed opponent reply follows that point.
6. End the session → verdict view shows your turns, your words, and time in room.

If streaming fails with 503, Ollama or the model is down. If 429, the opponent is busy (`MAX_ACTIVE_STREAMS=2`); wait 5s and retry.

### B. Argument analysis

1. In the verdict view with at least one learner turn, choose “Analyze my arguments”.
2. Confirm you get:
   - Five ratings: Clarity, Relevance, Evidence, Logic, Persuasion (each `score / 5` + note)
   - Strengths and next moves
   - Logic watch with quoted transcript text
   - Five counterpoint styles with a test question each
3. Analysis states its text-only limits and that scores are estimates, not objective measures.
4. If the model reply is incomplete, the backend retries up to three times; a still-incomplete report ends in a clear error, not a partial scorecard.

Direct API check:

```bash
curl -X POST http://127.0.0.1:8000/api/debate/analyze \
  -H 'Content-Type: application/json' \
  -d '{"topic":"Should cities ban cars from their centres?","learner_position":"for","persona":"skeptic","difficulty":"challenge","turns":[{"speaker":"learner","content":"Car-free centres cut emissions and make streets safer for walking."}]}'
```

### C. Email accounts

1. Go to Sign in → Create account.
2. Use an email plus a 12+ character password with lowercase, uppercase, and number. Mismatched confirmation blocks submit.
3. Submit → “Check your inbox for a verification link.” Confirm email, return, sign in.
4. Wrong credentials show “That email and password do not match.” Unconfirmed email prompts verification. Rate limits show a wait-and-retry message.
5. After sign-in, header shows “Learner space”.

### D. Saved sessions (signed in, Supabase configured)

1. Start a signed-in debate. If saving fails, the UI says the session could not be saved but lets the debate continue.
2. Send turns. If a turn fails to sync, the UI keeps it on screen and warns before ending.
3. End the session → transcript and any completed review persist to your archive.
4. Open Learner space → confirm the session, transcript, and saved analysis load. Only your own records are visible (RLS).
5. “Return to the room” resumes an in-progress record; “Start a new rehearsal” creates a fresh one.

### E. Google sign-in

1. Choose “Continue with Google”.
2. Complete Google consent → you return to Verdict signed in.
3. If Supabase is unconfigured, the UI says account access is not connected and offers guest practice.

## Troubleshooting

- `Account service needs Supabase setup`: `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` missing. Guest still works.
- `Account token verification is not configured` (503): backend has a token but no `SUPABASE_URL`/JWKS. Set `SUPABASE_URL` and restart.
- `Sign in to use the debate service` (401): backend has `REQUIRE_AUTH=true` and no token. Sign in, or set `false` for guest testing.
- `Your sign-in has expired. Sign in again` (401): token expired/invalid. Sign in again. Hosted JWKS requires an asymmetric signing key so the JWKS endpoint exists.
- Supabase insert/select denied: migrations not applied in order, or RLS policy missing. Re-run both SQL files, confirm authenticated grants.
- CORS/host errors: `WEB_ORIGIN` must exactly match the frontend origin; `ALLOWED_HOSTS` must include the API hostname.
- Blank page after `npm run build` in production: `VITE_API_BASE_URL` must be set to the HTTPS API origin. It must be origin-only, no path/query, no credentials.
- CSP errors: frontend sends restrictive CSP with `connect-src 'self' https:`; self-hosted fonts only.

## Deployment checklist

- Frontend: Vercel project rooted at `web/`, or Render static site via root `render.yaml`. Both apply CSP, security headers, and immutable caching for `/assets/*`.
- Set in the frontend host: `VITE_API_BASE_URL` (HTTPS API origin, public but not secret), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Set on the Python host: `WEB_ORIGIN` (exact deployed frontend origin), `ALLOWED_HOSTS` (API hostname), `SUPABASE_URL` (+ optional explicit JWKS/issuer), `REQUIRE_AUTH=true`.
- Keep `REQUIRE_AUTH=true` once Supabase JWKS is configured; leave `false` only for guest testing.
- Never put a Supabase service-role key or model-provider secret in `VITE_` vars or browser code.
- Transcript analysis still runs on Ollama in this phase, so the API needs a local Ollama runtime. Do not expose a guest-mode API as a public service; the public path needs authenticated bring-your-own-key handling, which is still planned.
