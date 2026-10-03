import re

FILLERS = {"um", "uh", "like", "you know", "so basically", "basically", "actually"}
REPEAT_RE = re.compile(r"\b(\w+)(?:\s+\1\b)+", re.IGNORECASE)
PROLONG_RE = re.compile(r"\b\w*([a-z])\1{2,}\w*\b", re.IGNORECASE)
REVISION_MARKS = (" -- ", " — ", " ... ", " - ")


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", text.lower())


def _find_fillers(text: str) -> int:
    lowered = f" {text.lower()} "
    return sum(lowered.count(f" {f} ") for f in FILLERS if " " not in f) + sum(
        lowered.count(f) for f in FILLERS if " " in f
    )


def analyze_delivery(segments: list[dict]) -> dict:
    texts = [(str(s.get("text", "")), float(s.get("start", 0)), float(s.get("end", 0))) for s in segments]
    words = sum(len(_words(t)) for t, _, _ in texts)
    duration = max((e for _, _, e in texts), default=0.0) - min((s for _, s, _ in texts), default=0.0)
    duration = max(duration, 0.1)
    wpm = round(words / duration * 60, 1)
    fillers = sum(_find_fillers(t) for t, _, _ in texts)
    filler_rate = round(fillers / max(words, 1) * 100, 1)
    pauses = [
        {"start": prev_e, "end": cur_s, "gap": round(cur_s - prev_e, 2)}
        for (_, _, prev_e), (_, cur_s, _) in zip(texts, texts[1:])
        if cur_s - prev_e >= 0.6
    ]
    repetitions = sum(len(REPEAT_RE.findall(t)) for t, _, _ in texts)
    revisions = sum(t.count(m) for t, _, _ in texts for m in REVISION_MARKS)
    prolongations = sum(len(PROLONG_RE.findall(t)) for t, _, _ in texts)
    events: list[dict] = []
    for text, start, end in texts:
        seg_wpm = round(len(_words(text)) / max(end - start, 0.5) * 60, 1)
        if seg_wpm >= 170:
            events.append({"kind": "rushed", "start": start, "end": end, "label": "Rushed pace", "detail": f"{seg_wpm} wpm here vs {wpm} overall. Slow the next sentence."})
        if _find_fillers(text) >= 2 or len(REPEAT_RE.findall(text)) >= 1:
            events.append({"kind": "hesitant", "start": start, "end": end, "label": "Hesitant patch", "detail": "Fillers or repeats cluster here. Pause, then restart the chunk."})
    for p in pauses:
        if p["gap"] >= 1.5:
            events.append({"kind": "tense", "start": p["start"], "end": p["end"], "label": "Tense break", "detail": f"{p['gap']}s gap. Breathe, then re-anchor on one claim."})
    if len(texts) >= 3 and wpm < 110 and fillers == 0:
        s, _, _ = texts[0]
        _, _, e = texts[-1]
        events.append({"kind": "flat", "start": s, "end": e, "label": "Flat run", "detail": "Steady but low-variation delivery. Stress one key word per sentence."})
    return {
        "wpm": wpm,
        "words": words,
        "duration_sec": round(duration, 1),
        "filler_count": fillers,
        "filler_rate_per_100w": filler_rate,
        "pause_count": len(pauses),
        "longest_pause_sec": max((p["gap"] for p in pauses), default=0.0),
        "repetition_count": repetitions,
        "revision_count": revisions,
        "prolongation_count": prolongations,
        "events": events[:8],
    }
