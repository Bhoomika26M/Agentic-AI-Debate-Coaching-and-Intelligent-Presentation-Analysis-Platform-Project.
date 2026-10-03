# Verdict

Verdict is a local-first AI debate coach. The first demo includes an interactive product walkthrough and a streamed debate against a local Ollama model. The learner chooses the topic, side, opponent persona, difficulty, and session length.

The frontend is a React + TypeScript app. The AI backend is Python 3.12 + FastAPI. The browser calls the Python service; Python owns prompt construction and model inference.

## Requirements

- Node.js 20 or newer
- Python 3.12
- [`uv`](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com/download)

## Start Ollama

Install Ollama, start its local service, then download the initial model:

```bash
ollama pull qwen3.5:4b
```

If Ollama did not start as a desktop service, run `ollama serve` in a terminal and leave it open.

This quantized model is about 3.4 GB. Its actual memory use depends on context length and available GPU memory.

## Start the Python AI backend

In a terminal:

```bash
cd ai-backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API health check is at `http://127.0.0.1:8000/api/health`.

## Start the web app

In a second terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite forwards `/api` requests to the local Python service.

## Local configuration

Copy `ai-backend/.env.example` to `ai-backend/.env`. The defaults use Ollama at `http://127.0.0.1:11434` and model `qwen3.5:4b`. Set `OLLAMA_MODEL` if you have pulled a different model.

The local debate demo works as a guest without a cloud account. Learner accounts, saved transcripts, and saved coaching reviews use Supabase's free tier. Create a free Supabase project, copy its project URL and publishable key into `web/.env` (start from `web/.env.example`), and apply both SQL migrations in `supabase/migrations/` in timestamp order. Set `SUPABASE_URL` in `ai-backend/.env` when using signed-in accounts locally so the Python API can verify their access tokens. The browser uses only the publishable key; row-level security scopes every record and review to its owner.

Keep email confirmation enabled in Supabase Auth. Set the password policy to at least 12 characters with uppercase, lowercase, and numeric characters. To enable Google sign-in, add the Google OAuth client ID and secret in the Supabase Auth provider settings, and configure the Supabase redirect allowlist for `http://127.0.0.1:5173` and your deployed site. Keep the Google client secret in Supabase only. The hosted free email service is rate-limited, so it is suitable for a demo but not high-volume signups.

For local backend requests, authentication stays optional so the guest demo remains usable. Configure `SUPABASE_URL` when the local frontend is connected to learner accounts so the Python API can verify access tokens. To require learner accounts in a hosted backend, set `REQUIRE_AUTH=true` with that same project URL. The API verifies Supabase access tokens against the project's JWKS; use an asymmetric signing key so the JWKS endpoint is available. Never put a Supabase service-role key or model-provider secret in frontend variables.

## Frontend deployment configuration

The frontend is a React 19 + TypeScript single-page application built to static assets by Vite. It can be deployed as a Vercel project rooted at `web/` or as the static site in the root `render.yaml` blueprint. Both configurations apply a restrictive Content Security Policy and security response headers.

Set `VITE_API_BASE_URL` to the HTTPS origin of the deployed Python API when building the frontend. This is a public URL, not a secret. Vite includes `VITE_` variables in browser assets, so never put API keys, passwords, or service-role credentials in them. The local default stays blank and uses Vite's `/api` proxy.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel or Render build environment to enable learner accounts and saved sessions. The Render blueprint declares these values as dashboard-supplied environment variables. Keep `REQUIRE_AUTH=true` on the deployed Python API after the API's Supabase JWKS settings are configured; leave it false for the local guest demo. Transcript analysis runs on the configured Ollama model, so the API must have a local Ollama runtime for this phase.

Set `WEB_ORIGIN` on FastAPI to the exact deployed frontend origin and `ALLOWED_HOSTS` to the API service hostname. The service rejects unknown hosts, disables cross-origin cookies, applies no-store headers to API responses, validates request sizes, and limits simultaneous local model streams. The backend currently uses Ollama, so a public AI deployment still needs the planned authenticated bring-your-own-key provider path; do not expose the guest demo API as a public service.
