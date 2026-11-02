"""Turn timings for the diagnostics event and the dev panel.

Every number published in docs/VOICE.md comes from this module, measured on the
machine that runs the models. Nothing here estimates.
"""

from dataclasses import asdict, dataclass, field


@dataclass
class TurnTimings:
    """One voice turn, in milliseconds, from the end of speech to the last frame."""

    endpoint_wait_ms: int = 0
    stt_ms: int = 0
    plan_ms: int = 0
    draft_ms: int = 0
    verify_ms: int = 0
    tts_first_ms: int = 0
    first_audio_ms: int = 0
    # Time from the end of speech to the first sentence of the *reply*: the
    # opener is pre-rendered, so including it would flatter the number.
    reply_first_audio_ms: int = 0
    voice_to_voice_ms: int = 0
    total_ms: int = 0
    sentences: int = 0
    audio_ms: int = 0
    tts_engine: str = "none"
    opener_used: bool = False
    interrupted: bool = False
    extra: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return asdict(self)


def percentile(values: list[float], fraction: float) -> float:
    """Nearest-rank percentile: no interpolation, so a published p95 is a real turn."""
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, round(fraction * (len(ordered) - 1))))
    return float(ordered[index])


def summarise(samples: list[dict], keys: tuple[str, ...]) -> dict[str, dict[str, float]]:
    """p50/p95/mean for each key, over the turns that actually reported it."""
    report: dict[str, dict[str, float]] = {}
    for key in keys:
        values = [float(sample[key]) for sample in samples if sample.get(key) is not None]
        if not values:
            continue
        report[key] = {
            "p50": round(percentile(values, 0.5), 1),
            "p95": round(percentile(values, 0.95), 1),
            "mean": round(sum(values) / len(values), 1),
            "n": len(values),
        }
    return report
