from app.agents.verifier import engagement_ratio, inspect_plan, inspect_reply

GOOD_REPLY = (
    "You lean on attention gains, but a phone ban moves the same distraction into the corridor. "
    "Which evidence shows classroom focus improving without a phone-free school?"
)
GOOD_LATEST = "Schools should ban phones because evidence shows attention improves."


def _weak_spots(*keys) -> list[dict]:
    return [
        {"key": key, "label": key, "evidence": "rated 2.0/5 on average", "first_step": "try this"}
        for key in keys
    ]


def _plan(**overrides) -> dict:
    plan = {
        "headline": "Sharpen the evidence line",
        "summary": "A drill for a case that asserts more than it shows.",
        "drills": [
            {
                "weak_spot": "evidence_strength",
                "title": "One source per claim",
                "minutes": 10,
                "steps": ["Write it.", "Source it."],
                "success_check": "Every claim has a source.",
            }
        ],
        "milestones": [
            {
                "week": 1,
                "focus": ["evidence_strength"],
                "practice": "Two rehearsals.",
                "win_condition": "No unsupported claim survives.",
            }
        ],
        "next_session": "Rehearse once and source every claim out loud as you make it.",
    }
    plan.update(overrides)
    return plan


def test_a_clean_turn_passes():
    problems = inspect_reply(GOOD_REPLY, latest=GOOD_LATEST, brief="Private coaching brief: press the evidence gap.")
    assert problems == []


def test_empty_and_tiny_drafts_are_rejected():
    assert inspect_reply("") == ["the draft was empty"]
    assert any("too short" in problem for problem in inspect_reply("Yes, but no."))


def test_role_labels_headings_and_length_are_rejected():
    assert any("speaker label" in p for p in inspect_reply(f"Skeptic: {GOOD_REPLY}"))
    assert any("analysis headings" in p for p in inspect_reply(f"{GOOD_REPLY}\n## Analysis"))
    long_turn = " ".join(["claim"] * 200) + "?"
    assert any("words" in p for p in inspect_reply(long_turn))


def test_an_assistant_voice_breaks_character():
    problems = inspect_reply("As an AI language model I cannot debate that. Shall we continue?")
    assert any("breaks character" in p for p in problems)


BRIEF = (
    "Private coaching brief, never quote it. Press this joint: the learner always ignores "
    "counterevidence about cost. Angle: ask who pays."
)


def test_a_paraphrase_of_the_brief_is_not_a_leak():
    """Echoing one idea is not leaking; only an ordered run of the brief's content is."""
    reply = (
        "You lean on attention gains, but the cost falls on the schools. Who pays for it?"
    )
    assert inspect_reply(reply, latest=GOOD_LATEST, brief=BRIEF) == []


def test_a_leaked_private_brief_is_rejected():
    reply = (
        "You want me to press the learner always ignores counterevidence, and I will. "
        "Who pays when the corridor is louder?"
    )
    assert any(
        "private coaching brief" in problem
        for problem in inspect_reply(reply, brief=BRIEF)
    )
    assert inspect_reply(GOOD_REPLY, brief=BRIEF) == []


def test_a_turn_must_engage_the_latest_point():
    reply = "That is an interesting view and I will consider the wider question. Which part matters most to you?"
    assert any("does not engage" in p for p in inspect_reply(reply, latest=GOOD_LATEST))
    assert engagement_ratio(GOOD_LATEST, GOOD_REPLY) > 0.08


def test_a_turn_must_ask_something_back():
    reply = (
        "You lean on attention gains, but a phone ban moves the same distraction into the corridor "
        "and hides it from the timetable."
    )
    assert "the draft does not end with a question to answer" in inspect_reply(reply)


def test_a_grounded_plan_passes():
    problems = inspect_plan(
        _plan(),
        _weak_spots("evidence_strength"),
        session_total=2,
        averages={"evidence_strength": 2.0},
    )
    assert problems == []


def test_undiagnosed_weak_spots_are_rejected():
    problems = inspect_plan(
        _plan(),
        _weak_spots("fallacy_control"),
        session_total=2,
        averages={"fallacy_control": 3.0},
    )
    assert any("never diagnosed" in p for p in problems)
    assert any("no drill targets the weakest spot" in p for p in problems)


def test_the_top_weak_spot_must_be_drilled():
    plan = _plan(
        drills=[
            {
                "weak_spot": "relevance",
                "title": "Answer the question",
                "minutes": 8,
                "steps": ["Re-read the motion."],
                "success_check": "The question is answered first.",
            }
        ]
    )
    problems = inspect_plan(
        plan,
        _weak_spots("evidence_strength", "relevance"),
        session_total=4,
        averages={"evidence_strength": 2.0, "relevance": 3.0},
    )
    assert any("no drill targets the weakest spot (evidence_strength)" in p for p in problems)


def test_invented_scores_and_counts_are_rejected():
    inflated = _plan(summary="Your evidence score sits at 4.9/5 across 12 sessions.")
    problems = inspect_plan(
        inflated,
        _weak_spots("evidence_strength"),
        session_total=2,
        averages={"evidence_strength": 2.0},
    )
    assert any("cites a score" in p for p in problems)
    assert any("cites 12 sessions" in p for p in problems)


def test_real_numbers_are_allowed():
    honest = _plan(summary="Evidence sits at 2.0/5 across your 2 sessions.")
    problems = inspect_plan(
        honest,
        _weak_spots("evidence_strength"),
        session_total=2,
        averages={"evidence_strength": 2.0},
    )
    assert problems == []


def test_a_thin_next_session_line_is_rejected():
    plans = [
        _plan(next_session="Week 2"),
        _plan(next_session="Keep practising."),
    ]
    problems = [
        inspect_plan(plan, _weak_spots("evidence_strength"), session_total=1, averages={})
        for plan in plans
    ]
    assert all(
        any("next-session line" in problem for problem in findings) for findings in problems
    )
    assert inspect_plan(
        _plan(next_session="Rehearse once and attach one source to every claim you make."),
        _weak_spots("evidence_strength"),
        session_total=1,
        averages={},
    ) == []


def test_duplicate_weeks_and_missing_milestones_are_rejected():
    doubled = _plan(
        milestones=[
            {"week": 1, "focus": ["evidence_strength"], "practice": "Two rehearsals.", "win_condition": "Better sources."},
            {"week": 1, "focus": ["evidence_strength"], "practice": "Two rehearsals.", "win_condition": "Better sources."},
        ]
    )
    problems = inspect_plan(
        doubled,
        _weak_spots("evidence_strength"),
        session_total=1,
        averages={"evidence_strength": 2.0},
    )
    assert any("repeat a week" in p for p in problems)
    empty = inspect_plan({}, _weak_spots("evidence_strength"), session_total=1, averages={})
    assert any("no drills" in p for p in empty)
    assert any("no milestones" in p for p in empty)
