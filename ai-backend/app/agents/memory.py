def summarize_history(sessions: list[dict]) -> str | None:
    past = [s for s in sessions if isinstance(s, dict)][:12]
    if not past:
        return None
    overalls = [float(s["overall"]) for s in past if isinstance(s.get("overall"), (int, float))]
    fallacies = sum(int(s.get("fallacy_count", 0) or 0) for s in past)
    fillers = [float(s["filler_rate"]) for s in past if isinstance(s.get("filler_rate"), (int, float))]
    noun = "session" if len(past) == 1 else "sessions"
    lines = [f"Across {len(past)} past {noun}:"]
    if overalls:
        lines.append(f"average overall {sum(overalls) / len(overalls):.1f}/5.")
    if fallacies:
        noun = "fallacy" if fallacies == 1 else "fallacies"
        lines.append(f"{fallacies} flagged {noun} total; press unsupported claims.")
    else:
        lines.append("no flagged fallacies; press evidence depth instead.")
    if fillers:
        lines.append(f"filler rate recently {fillers[-1]:.1f} per 100 words.")
    return " ".join(lines)


def briefing_for_planner(sessions: list[dict]) -> str | None:
    summary = summarize_history(sessions)
    if summary is None:
        return None
    return f"History across sessions: {summary}"
