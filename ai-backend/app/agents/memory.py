"""Deterministic reduction of the learner's stored digests, shared by the opponent and the coach."""

from collections import Counter

CRITERIA = (
    "clarity",
    "relevance",
    "evidence_strength",
    "logical_consistency",
    "persuasiveness",
)
CRITERION_LABELS = {
    "clarity": "Clarity of structure",
    "relevance": "Answering the actual question",
    "evidence_strength": "Grounding claims in evidence",
    "logical_consistency": "Unbroken reasoning",
    "persuasiveness": "Making the case land",
    "delivery": "Pace and filler words",
    "fallacy_control": "Cutting fallacy habits",
    "practice_volume": "Rehearsal volume",
}
FIRST_STEPS = {
    "clarity": "Rebuild one case as claim → reason → evidence → link back.",
    "relevance": "Answer the exact question asked before adding a new point.",
    "evidence_strength": "Attach one concrete source or example to every claim.",
    "logical_consistency": "Read the case backwards and cut any step that does not follow.",
    "persuasiveness": "Rewrite the opening line so the stakes are unmistakable.",
}
WEAK_CRITERION_MAX = 3.4
RECURRING_FALLACY_MIN = 2
FILLER_HIGH = 3.0
MIN_SESSIONS_FOR_TREND = 3
# A plan that names five weaknesses is not a plan: three criteria plus the strongest habit signal.
MAX_SPOTS = 4
MAX_CRITERIA_SPOTS = 3

# Which diagnosed weak spots the learner's own answers make most worth their time.
GOAL_TARGETS = {
    "structure": ("clarity", "logical_consistency"),
    "evidence": ("evidence_strength",),
    "nerves": ("delivery", "persuasiveness"),
    "hostile": ("logical_consistency", "fallacy_control"),
    "win": ("persuasiveness", "evidence_strength"),
}
FOCUS_TARGETS = {
    "argument": ("clarity", "evidence_strength", "logical_consistency"),
    "delivery": ("delivery", "clarity"),
    "confidence": ("delivery", "persuasiveness"),
}


def prioritize(weak_spots: list[dict], preferences: dict | None) -> list[dict]:
    """Lead with the weak spots the learner asked to work on; never add one the record lacks."""
    if not preferences:
        return weak_spots
    targets: list[str] = list(GOAL_TARGETS.get(preferences.get("goal") or "", ()))
    for key in preferences.get("focus") or []:
        targets.extend(FOCUS_TARGETS.get(key, ()))
    unique = list(dict.fromkeys(targets))
    if not unique:
        return weak_spots
    rank = {key: index for index, key in enumerate(unique)}
    return sorted(weak_spots, key=lambda spot: rank.get(spot["key"], len(rank)))


def _digest_dicts(digests: list) -> list[dict]:
    return [d for d in digests if isinstance(d, dict)]


def criterion_scores(digests: list) -> dict[str, list[int]]:
    """Every recorded rating per criterion, oldest first."""
    scores: dict[str, list[int]] = {key: [] for key in CRITERIA}
    for digest in _digest_dicts(digests):
        ratings = digest.get("ratings") or {}
        for key in CRITERIA:
            entry = ratings.get(key) or {}
            score = entry.get("score") if isinstance(entry, dict) else None
            if isinstance(score, int):
                scores[key].append(score)
    return scores


def criterion_averages(digests: list) -> dict[str, float]:
    scores = criterion_scores(digests)
    return {
        key: round(sum(values) / len(values), 1)
        for key, values in scores.items()
        if values
    }


def recurring_fallacies(
    digests: list, minimum: int = RECURRING_FALLACY_MIN
) -> list[tuple[str, int]]:
    counts: Counter[str] = Counter()
    for digest in _digest_dicts(digests):
        for label in digest.get("fallacy_labels") or []:
            counts[str(label)] += 1
    return [(label, count) for label, count in counts.most_common() if count >= minimum]


def filler_trend(digests: list) -> tuple[float | None, float | None]:
    """(earliest recorded rate, latest recorded rate), newest-last ordering."""
    rates = [
        float(digest["filler_rate_per_100w"])
        for digest in _digest_dicts(digests)
        if isinstance(digest.get("filler_rate_per_100w"), (int, float))
    ]
    if not rates:
        return None, None
    return rates[0], rates[-1]


def session_count(digests: list) -> int:
    return len(_digest_dicts(digests))


def summarize_history(digests: list) -> str | None:
    """One plain sentence about the learner's record, or None when there is nothing stored."""
    total = session_count(digests)
    if total == 0:
        return None
    noun = "session" if total == 1 else "sessions"
    lines = [f"Across {total} past {noun}:"]
    averages = criterion_averages(digests)
    scored = [criterion_scores(digests)[key] for key in CRITERIA if averages.get(key) is not None]
    if averages:
        weakest = min(averages, key=lambda key: (averages[key], key))
        strongest = max(averages, key=lambda key: (averages[key], key))
        overall = sum(sum(values) for values in scored) / sum(len(values) for values in scored)
        lines.append(f"average rating {overall:.1f}/5.")
        lines.append(f"weakest {weakest.replace('_', ' ')} {averages[weakest]:.1f}/5.")
        lines.append(f"strongest {strongest.replace('_', ' ')} {averages[strongest]:.1f}/5.")
    fallacies = recurring_fallacies(digests)
    if fallacies:
        spelling = ", ".join(f"{label} x{count}" for label, count in fallacies[:3])
        lines.append(f"recurring fallacies: {spelling}; press the habit, not a one-off slip.")
    elif averages:
        lines.append("no recurring fallacy flagged; probe evidence depth instead.")
    first, last = filler_trend(digests)
    if last is not None and first is not None:
        direction = "down" if last < first else "up" if last > first else "flat"
        lines.append(f"filler rate {last:.1f} per 100 words ({direction}).")
    return " ".join(lines)


def briefing_for_planner(digests: list) -> str | None:
    summary = summarize_history(digests)
    if summary is None:
        return None
    return f"History across sessions: {summary}"


def _habit_signals(digests: list) -> list[tuple[float, dict]]:
    """Signals the rubric does not score directly: fallacy habits and filler rate."""
    signals: list[tuple[float, dict]] = []
    fallacies = recurring_fallacies(digests)
    if fallacies:
        spelled = ", ".join(f"{label} x{count}" for label, count in fallacies[:3])
        signals.append(
            (
               float(fallacies[0][1]) * 1.5,
                {
                    "key": "fallacy_control",
                    "label": CRITERION_LABELS["fallacy_control"],
                    "evidence": f"flagged {spelled}",
                    "first_step": (
                        "Turn the flagged line into a qualified claim before the opponent does."
                    ),
                },
            )
        )
    _, latest_filler = filler_trend(digests)
    if latest_filler is not None and latest_filler >= FILLER_HIGH:
        signals.append(
            (
                float(latest_filler),
                {
                    "key": "delivery",
                    "label": CRITERION_LABELS["delivery"],
                    "evidence": (
                        f"{latest_filler:.1f} filler words per 100 words in the latest take"
                    ),
                    "first_step": (
                        "Record a 60-second take and mark every filler with a pause instead."
                    ),
                },
            )
        )
    return sorted(signals, key=lambda item: (-item[0], item[1]["key"]))


def _volume_spot(total: int, *, strong: bool) -> dict:
    if strong:
        evidence = f"{total} sessions with no criterion below {WEAK_CRITERION_MAX}/5"
        first_step = "Raise the difficulty one notch and rehearse against cross-examination."
    else:
        evidence = f"only {total} saved session(s) to learn from"
        first_step = "Run three 5-minute rehearsals this week before changing anything else."
    return {
        "key": "practice_volume",
        "label": CRITERION_LABELS["practice_volume"],
        "evidence": evidence,
        "first_step": first_step,
    }


def diagnose(digests: list) -> list[dict]:
    """Deterministic weak spots with the evidence that produced them, never empty."""
    total = session_count(digests)
    averages = criterion_averages(digests)
    weak = [
        {
            "key": key,
            "label": CRITERION_LABELS[key],
            "evidence": f"rated {average:.1f}/5 on average across {total} session(s)",
            "first_step": FIRST_STEPS[key],
        }
        for key, average in sorted(averages.items(), key=lambda item: (item[1], item[0]))
        if average <= WEAK_CRITERION_MAX
    ][:MAX_CRITERIA_SPOTS]
    weak.extend(spot for _severity, spot in _habit_signals(digests)[: MAX_SPOTS - len(weak)])
    if total < MIN_SESSIONS_FOR_TREND and len(weak) < MAX_SPOTS:
        weak.append(_volume_spot(total, strong=False))
    if not weak:
        weak.append(_volume_spot(total, strong=True))
    return weak[:MAX_SPOTS]
