# Debate coach inference service; build from ai-backend/ (EXTRAS=--extra laya adds the
# optional Laya checkpoint, EXTRAS=--extra ser adds the optional emotion model).
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

WORKDIR /app

RUN pip install --no-cache-dir uv

# Dependencies are resolved from the lockfile, so the image matches local runs.
COPY pyproject.toml uv.lock ./
ARG EXTRAS=""
RUN uv sync --frozen --no-dev $EXTRAS

COPY app ./app

# Verification stage: the same suite the repository runs locally, with no Ollama needed.
FROM base AS test
RUN uv sync --frozen --no-default-groups --group dev
COPY tests ./tests
RUN python -m pytest

# One worker: model calls are serialised in-process, so a second would double model memory.
FROM base AS runtime
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
