"""Voice debate: speech recognition gate, spoken turns, and speech playback.

The voice path is not a second pipeline. A spoken turn is transcribed, checked
by the recognition gate, and then handed to the same guard, planner, draft and
verifier that a typed turn uses. Only the transport (a WebSocket instead of SSE)
and the output (speech instead of text) are different.
"""
