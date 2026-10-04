import os

ENABLE_SER = os.getenv("ENABLE_SER", "false").strip().lower() == "true"
_model = None


class SerUnavailableError(RuntimeError):
    """Raised when categorical emotion recognition is disabled or missing."""


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from speechbrain.inference import EncoderClassifier
    except ImportError as error:
        raise SerUnavailableError(
            "Emotion recognition is unavailable. Install speechbrain locally."
        ) from error
    _model = EncoderClassifier.from_hparams(
        source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP"
    )
    return _model


# Local-only stub: loads the classifier to prove availability, but per-window
# scores stay unwired until PCM decode lands. Callers must treat output as reflection-only.
def analyze_emotion_windows(
    pcm16: bytes, sample_rate: int, windows: list[tuple[float, float]]
) -> list[dict]:
    if not ENABLE_SER:
        raise SerUnavailableError("Categorical emotion stays local-only opt-in.")
    if not pcm16 or sample_rate <= 0:
        raise ValueError("Audio and sample rate are required.")
    _load_model()
    return [
        {"start": s, "end": e, "label": "reflection-only", "note": "Acted-data model; use for reflection only."}
        for s, e in windows[:8]
    ]
