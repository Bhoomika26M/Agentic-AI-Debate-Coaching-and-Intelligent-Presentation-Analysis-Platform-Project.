"""Measure the debate prompt before and after the token-budgeted context change.

The token counts are deterministic and run without a model. Pass ``--ollama`` to
also time the first token against a live local model:

    cd ai-backend
    uv run python evals/measure_context.py --ollama --runs 3

The "legacy" prompt uses the same system rules and latest turn as the current
prompt, but only the old fixed eight-turn window plus the condensed digest, so
the comparison isolates the context change.
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

import httpx

# Run as `uv run python evals/measure_context.py` from ai-backend.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.conversation import build_context, estimate_tokens, window_turns  # noqa: E402
from app.prompts import build_messages  # noqa: E402
from app.schemas import DebateRequest  # noqa: E402

CLAIM = "The key claim: a phone ban improves focus by twelve percent."
LATEST = "Does a phone ban really improve focus in class?"


def fixture(turns: int = 40) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for index in range(turns):
        content = f"turn {index} " + " ".join(["filler"] * 90) + f" point{index}"
        if index == 0:
            content = "Opening case: phones distract students during lessons."
        elif index == 2:
            content = CLAIM
        history.append(
            {
                "speaker": "learner" if index % 2 == 0 else "opponent",
                "content": content,
            }
        )
    return history


def request(history: list[dict[str, str]]) -> DebateRequest:
    return DebateRequest(
        topic="Should schools ban phones?",
        learner_position="for",
        persona="skeptic",
        difficulty="challenge",
        history=history,
        learner_argument=LATEST,
    )


def legacy_messages(
    history: list[dict[str, str]], current: list[dict[str, str]]
) -> list[dict[str, str]]:
    """Old fixed window, with the same system prompt and latest turn as the new prompt."""
    summary, window = window_turns(history)
    messages = [current[0]]
    if summary:
        messages.append({"role": "system", "content": summary})
    messages.extend(
        {
            "role": "user" if turn["speaker"] == "learner" else "assistant",
            "content": turn["content"],
        }
        for turn in window
    )
    messages.append(current[-1])
    return messages


def report(name: str, messages: list[dict[str, str]]) -> dict[str, object]:
    joined = "\n".join(message["content"] for message in messages)
    return {
        "name": name,
        "messages": len(messages),
        "prompt_tokens": sum(estimate_tokens(message["content"]) for message in messages),
        "claim_present": CLAIM in joined,
        "opening_present": "Opening case: phones distract students" in joined,
    }


async def warmup(model: str, base_url: str) -> float:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with ready."}],
        "stream": False,
        "think": False,
        "keep_alive": "10m",
        "options": {"temperature": 0, "num_predict": 1, "num_ctx": 8192},
    }
    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=httpx.Timeout(300, connect=5)) as client:
        response = await client.post(f"{base_url}/api/chat", json=payload)
        response.raise_for_status()
    return (time.perf_counter() - started) * 1000


async def first_token_ms(
    messages: list[dict[str, str]], model: str, base_url: str
) -> dict[str, float]:
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "think": False,
        "keep_alive": "10m",
        "options": {"temperature": 0.2, "num_predict": 240, "num_ctx": 8192},
    }
    started = time.perf_counter()
    first = None
    async with httpx.AsyncClient(timeout=httpx.Timeout(300, connect=5)) as client:
        async with client.stream("POST", f"{base_url}/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                if chunk.get("message", {}).get("content"):
                    if first is None:
                        first = (time.perf_counter() - started) * 1000
                    if chunk.get("done"):
                        break
    total = (time.perf_counter() - started) * 1000
    if first is None:
        raise ValueError("the model returned no content")
    return {"first_token_ms": first, "total_ms": total}


def _median(values: list[float]) -> float:
    return statistics.median(values) if values else float("nan")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ollama", action="store_true", help="time a live local model")
    parser.add_argument("--model", default="qwen3.5:4b")
    parser.add_argument("--base-url", default="http://127.0.0.1:11434")
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()

    history = fixture()
    current = build_messages(request(history))
    legacy = legacy_messages(history, current)
    context = build_context(history, latest=LATEST)

    rows = [report("legacy fixed window", legacy), report("token-budgeted context", current)]
    for row in rows:
        print(
            f"{row['name']}: {row['prompt_tokens']} prompt tokens, "
            f"{row['messages']} messages, claim={row['claim_present']}, "
            f"opening={row['opening_present']}"
        )
    print(
        f"new context: {context.context_turns} turns in context, "
        f"{context.summarized_turns} condensed, {len(context.relevant)} relevant old turns"
    )

    if not args.ollama:
        print("model timing skipped; pass --ollama to measure the local 4B model")
        return

    try:
        warm_ms = await warmup(args.model, args.base_url)
        print(f"warm-up: {warm_ms:.0f}ms")
    except (httpx.HTTPError, ValueError) as error:
        print(f"model unavailable ({type(error).__name__}); timing skipped")
        return

    timings: dict[str, list[dict[str, float]]] = {str(row["name"]): [] for row in rows}
    for _ in range(max(1, args.runs)):
        for row, messages in zip(rows, (legacy, current), strict=True):
            try:
                timings[str(row["name"])].append(
                    await first_token_ms(messages, args.model, args.base_url)
                )
            except (httpx.HTTPError, ValueError) as error:
                print(f"{row['name']}: run failed ({type(error).__name__})")

    for row in rows:
        entries = timings[str(row["name"])]
        firsts = [entry["first_token_ms"] for entry in entries]
        totals = [entry["total_ms"] for entry in entries]
        print(
            f"{row['name']}: first token median {_median(firsts):.0f}ms "
            f"(min {min(firsts):.0f}, max {max(firsts):.0f}), "
            f"total median {_median(totals):.0f}ms (n={len(entries)})"
        )


if __name__ == "__main__":
    asyncio.run(main())
