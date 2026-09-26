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
