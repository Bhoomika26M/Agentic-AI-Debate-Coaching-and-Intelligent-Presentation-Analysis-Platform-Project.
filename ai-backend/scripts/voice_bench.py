"""Measure a real voice turn, end to end, on the machine that runs the models.

This is not a mock: it synthesises a learner utterance with Kokoro, sends it as
a 24 kHz WAV over the real ``/ws/voice`` socket, and lets the real
faster-whisper, guard, planner, qwen3.5:4b and Kokoro do the work. Every number
in docs/VOICE.md comes from this script.

    .venv/bin/python scripts/voice_bench.py --turns 20 --out ../docs/voice-measurements.json

The first turn is a warm-up and is not counted: it pays for the STT model load
and a cold Ollama.
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

import websockets

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

LEARNER_LINES = [
    "I think the levy is fair because the people who use the buses are the ones who pay for it.",
    "My opponent says enforcement is expensive, but the audit report shows it costs less "
    "than the roadworks.",
    "Look, if we do not fund late buses, the night shift workers are the ones who lose out.",
    "The evidence from the pilot scheme is clear, ridership went up and complaints went down.",
    "You keep asking who pays, and I have answered that twice now.",
]


def synth_turn(text: str, model_dir: Path) -> bytes:
    """A learner voice, not an opponent voice: different speaker from the persona set."""
    from kokoro_onnx import Kokoro
    from kokoro_onnx.config import EspeakConfig

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from app.voice.tts import wav_bytes

    kokoro = Kokoro(
        str(model_dir / "kokoro-v1.0.onnx"),
        str(model_dir / "voices-v1.0.bin"),
        espeak_config=EspeakConfig(
            data_path="/usr/share/espeak-ng-data", lib_path="libespeak-ng.so.1"
        ),
    )
    samples, rate = kokoro.create(text, voice="af_bella", speed=1.0, lang="en-us")
    return wav_bytes(samples, rate)


async def one_turn(ws, audio: bytes, timeout: float = 90.0) -> dict:
    speech_end_ms = int(time.time() * 1000)
    sent = time.perf_counter()
    await ws.send(
        json.dumps(
            {
                "type": "utterance_start",
                "speech_end_ms": speech_end_ms,
                "mode": "push_to_talk",
                "edit_window": False,
            }
        )
    )
    await ws.send(audio)

    first_audio_wall: float | None = None
    first_audio_server: float | None = None
    diagnostics: dict | None = None
    reply = ""
    captions = 0
    deadline = time.perf_counter() + timeout
    while time.perf_counter() < deadline:
        remaining = max(1.0, deadline - time.perf_counter())
        message = await asyncio.wait_for(ws.recv(), timeout=remaining)
        if isinstance(message, bytes):
            if first_audio_wall is None:
                first_audio_wall = round((time.perf_counter() - sent) * 1000)
            continue
        event = json.loads(message)
        kind = event.get("type")
        if kind == "caption" and not event.get("opener"):
            captions += 1
        elif kind == "reply":
            reply = event.get("text", "")
        elif kind == "diagnostics":
            diagnostics = event
        elif kind == "state" and event.get("state") == "listening":
            break
        elif kind == "error":
            return {
                "error": event.get("message"),
                "wall_ms": round((time.perf_counter() - sent) * 1000),
            }

    voice = (diagnostics or {}).get("turn", {}).get("voice", {})
    if first_audio_server is None:
        first_audio_server = voice.get("first_audio_ms")
    return {
        "wall_first_audio_ms": first_audio_wall,
        "first_audio_ms": first_audio_server,
        "wall_total_ms": round((time.perf_counter() - sent) * 1000),
        "captions": captions,
        "reply_words": len(reply.split()),
        **{key: voice.get(key) for key in (
            "endpoint_wait_ms",
            "stt_ms",
            "plan_ms",
            "draft_ms",
            "verify_ms",
            "first_audio_ms",
            "reply_first_audio_ms",
            "voice_to_voice_ms",
            "total_ms",
            "sentences",
            "audio_ms",
            "tts_engine",
            "opener_used",
        )},
    }


def percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, round(fraction * (len(ordered) - 1))))
    return round(float(ordered[index]), 1)


def summarise(turns: list[dict], keys: tuple[str, ...]) -> dict:
    report = {}
    for key in keys:
        values = [float(turn[key]) for turn in turns if isinstance(turn.get(key), (int, float))]
        if not values:
            continue
        report[key] = {
            "p50": percentile(values, 0.5),
            "p95": percentile(values, 0.95),
            "mean": round(statistics.fmean(values), 1),
            "n": len(values),
        }
    return report


async def bench(turns: int, url: str, model_dir: Path, timeout: float) -> dict:
    texts = [LEARNER_LINES[index % len(LEARNER_LINES)] for index in range(turns + 1)]
    print(f"Synthesising {len(texts)} learner utterances once…", flush=True)
    clips = [synth_turn(text, model_dir) for text in texts]
    print(f"Clips ready: {sum(len(clip) for clip in clips) // 1024} KiB total", flush=True)

    async with websockets.connect(
        url,
        max_size=16 * 1024 * 1024,
        open_timeout=30,
        # A first turn can spend a while loading models; a keepalive timeout
        # would cut the measurement short rather than report it.
        ping_interval=None,
    ) as ws:
        ready = json.loads(await ws.recv())
        print(f"ready: tts={ready.get('tts')} recognition={ready.get('recognition')}", flush=True)
        await ws.send(
            json.dumps(
                {
                    "type": "start",
                    "topic": "This house would replace city parking with bus lanes",
                    "learner_position": "for",
                    "persona": "skeptic",
                    "difficulty": "challenge",
                    "reset": True,
                }
            )
        )
        while True:
            event = json.loads(await ws.recv())
            if event.get("type") == "started":
                break

        print("Warm-up turn (not measured)…", flush=True)
        await one_turn(ws, clips[0], timeout)

        results = []
        for index in range(turns):
            result = await one_turn(ws, clips[index + 1], timeout)
            results.append(result)
            if "error" in result:
                print(f"  turn {index + 1}: ERROR {result['error']}", flush=True)
                continue
            print(
                f"  turn {index + 1:02d}: voice-to-voice {result.get('voice_to_voice_ms')} ms "
                f"(stt {result.get('stt_ms')} + plan {result.get('plan_ms')} + draft "
                f"{result.get('draft_ms')} + verify {result.get('verify_ms')}), "
                f"captions {result.get('captions')}",
                flush=True,
            )

    measured = [r for r in results if "error" not in r]
    keys = (
        "endpoint_wait_ms",
        "stt_ms",
        "plan_ms",
        "draft_ms",
        "verify_ms",
        "first_audio_ms",
        "reply_first_audio_ms",
        "voice_to_voice_ms",
        "wall_first_audio_ms",
        "wall_total_ms",
    )
    return {
        "url": url,
        "turns_measured": len(measured),
        "failures": len(results) - len(measured),
        "summary": summarise(measured, keys),
        "turns": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--turns", type=int, default=20)
    parser.add_argument("--url", default="ws://127.0.0.1:8011/ws/voice")
    parser.add_argument("--models", default="models/kokoro")
    parser.add_argument("--out", default="../docs/voice-measurements.json")
    parser.add_argument("--timeout", type=float, default=90.0)
    args = parser.parse_args()

    report = asyncio.run(
        bench(args.turns, args.url, Path(args.models), args.timeout)
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nWrote {out}")
    for key, stats in report["summary"].items():
        print(f"  {key:>22}: p50 {stats['p50']:>7} ms   p95 {stats['p95']:>7} ms   n={stats['n']}")


if __name__ == "__main__":
    main()
