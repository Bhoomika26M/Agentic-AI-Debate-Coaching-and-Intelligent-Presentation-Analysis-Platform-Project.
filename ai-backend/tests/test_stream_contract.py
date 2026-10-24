"""Pins the SSE frame format the browser client reads: final_delta, error, then [DONE]."""

import json

from app.main import BUSY_MESSAGE, STREAM_DONE, sse_event


def _payload(frame: str) -> dict:
    assert frame.startswith("data: ") and frame.endswith("\n\n"), frame
    body = frame[len("data: ") : -2]
    if body == "[DONE]":
        return {"done": True}
    return json.loads(body)


def test_a_verified_delta_frame_carries_the_key_the_client_reads():
    assert _payload(sse_event("final_delta", "You lean on ")) == {"final_delta": "You lean on "}


def test_an_error_frame_carries_a_readable_message():
    assert _payload(sse_event("error", BUSY_MESSAGE)) == {"error": BUSY_MESSAGE}


def test_frames_keep_non_ascii_text_intact():
    assert _payload(sse_event("final_delta", "café — naïve"))["final_delta"] == "café — naïve"


def test_the_stream_terminates_with_done():
    assert STREAM_DONE == "data: [DONE]\n\n"


def test_a_diagnostics_frame_is_carried_as_json_text():
    payload = json.dumps({"verified": True, "reply_words": 12})
    frame = _payload(sse_event("diagnostics", payload))
    assert json.loads(frame["diagnostics"]) == {"verified": True, "reply_words": 12}


def test_every_kind_the_server_emits_is_one_the_client_handles():
    client_keys = {"final_delta", "diagnostics", "error"}
    for kind in ("final_delta", "diagnostics", "error"):
        assert set(_payload(sse_event(kind, "x"))) <= client_keys
