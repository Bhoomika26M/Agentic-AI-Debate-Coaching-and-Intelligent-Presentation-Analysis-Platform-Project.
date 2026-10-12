"""Pins the SSE frame format the browser client reads: delta, replace, error, then [DONE]."""

import json

from app.main import BUSY_MESSAGE, STREAM_DONE, sse_event


def _payload(frame: str) -> dict:
    assert frame.startswith("data: ") and frame.endswith("\n\n"), frame
    body = frame[len("data: ") : -2]
    if body == "[DONE]":
        return {"done": True}
    return json.loads(body)


def test_a_delta_frame_carries_the_key_the_client_reads():
    assert _payload(sse_event("delta", "You lean on ")) == {"delta": "You lean on "}


def test_a_correction_frame_is_a_replacement_not_an_append():
    payload = _payload(sse_event("replace", "Which evidence backs that claim?"))
    assert payload == {"replace": "Which evidence backs that claim?"}
    assert "delta" not in payload


def test_an_error_frame_carries_a_readable_message():
    assert _payload(sse_event("error", BUSY_MESSAGE)) == {"error": BUSY_MESSAGE}


def test_frames_keep_non_ascii_text_intact():
    assert _payload(sse_event("delta", "café — naïve"))["delta"] == "café — naïve"


def test_the_stream_terminates_with_done():
    assert STREAM_DONE == "data: [DONE]\n\n"


def test_every_kind_the_server_emits_is_one_the_client_handles():
    client_keys = {"delta", "replace", "error"}
    for kind in ("delta", "replace", "error"):
        assert set(_payload(sse_event(kind, "x"))) <= client_keys
