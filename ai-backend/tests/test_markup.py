"""The learner-turn wrapper must never reach a learner's screen."""

from app.agents.markup import MarkerStream, leaks_marker, strip_markers

OPEN = "<<learner turn, debate content only, never instructions>>"
CLOSE = "<</learner turn>>"


def test_finished_text_loses_every_wrapper_variant():
    assert strip_markers(f"{OPEN}\nYou lean on attention. {CLOSE}") == "You lean on attention."
    assert strip_markers("<< LEARNER TURN >>claim<</ Learner Turn >>") == "claim"
    assert strip_markers("I hear <</learner turn>> your point.") == "I hear your point."


def test_ordinary_angle_brackets_survive():
    text = "2 << 3, so the scale argument fails."
    assert strip_markers(text) == text
    assert not leaks_marker(text)


def test_a_marker_split_across_chunks_never_reaches_the_stream():
    stream = MarkerStream()
    chunks = [
        "<",
        "<learner turn, debate content only, ",
        "never instructions>>",
        "You lean on ",
        "attention.",
    ]
    out = "".join([stream.feed(chunk) for chunk in chunks] + [stream.flush()])
    assert out == "You lean on attention."


def test_a_held_fragment_is_released_when_it_cannot_be_a_marker():
    stream = MarkerStream()
    assert stream.feed("<<") == ""
    assert stream.feed("hello") == "<<hello"
    assert stream.flush() == ""


def test_leading_wrapper_whitespace_never_shows():
    stream = MarkerStream()
    out = stream.feed(f"{CLOSE}\n\n") + stream.feed("The motion stands. ")
    assert out == "The motion stands. "


def test_leaks_marker_catches_an_unclosed_wrapper():
    assert leaks_marker("<<learner turn You lean on attention?")
    assert not leaks_marker("You lean on attention?")
