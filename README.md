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

No cloud account or API key is needed for the first local debate demo. Keep all secrets out of Git. The later hosted version will require a provider key supplied by each user.

## Frontend deployment configuration

The frontend is a React 19 + TypeScript single-page application built to static assets by Vite. It can be deployed as a Vercel project rooted at `web/` or as the static site in the root `render.yaml` blueprint. Both configurations apply a restrictive Content Security Policy and security response headers.

Set `VITE_API_BASE_URL` to the HTTPS origin of the deployed Python API when building the frontend. This is a public URL, not a secret. Vite includes `VITE_` variables in browser assets, so never put API keys, passwords, or service-role credentials in them. The local default stays blank and uses Vite's `/api` proxy.

Set `WEB_ORIGIN` on FastAPI to the exact deployed frontend origin and `ALLOWED_HOSTS` to the API service hostname. The service rejects unknown hosts, disables cross-origin cookies, applies no-store headers to API responses, validates request sizes, and limits simultaneous local model streams. The backend currently uses Ollama, so a public AI deployment still needs the planned authenticated bring-your-own-key provider path; do not expose the guest demo API as a public service.
