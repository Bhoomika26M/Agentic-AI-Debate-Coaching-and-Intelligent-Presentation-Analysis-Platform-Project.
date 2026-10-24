import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import rate_limit
from app.rate_limit import SlidingWindowLimiter, enforce_model_rate_limit


def test_a_key_gets_its_limit_and_then_a_retry_after():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
    assert limiter.allow("a", now=100.0) == (True, 0)
    assert limiter.allow("a", now=101.0) == (True, 0)
    allowed, retry_after = limiter.allow("a", now=102.0)
    assert allowed is False
    assert retry_after == 58


def test_keys_do_not_share_a_budget():
    limiter = SlidingWindowLimiter(limit=1)
    assert limiter.allow("a", now=1.0)[0] is True
    assert limiter.allow("a", now=2.0)[0] is False
    assert limiter.allow("b", now=2.0)[0] is True


def test_the_window_rolls_over():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=10)
    assert limiter.allow("a", now=0.0)[0] is True
    assert limiter.allow("a", now=5.0)[0] is False
    assert limiter.allow("a", now=10.1)[0] is True


def test_the_model_limit_is_per_subject_or_guest_ip(monkeypatch):
    monkeypatch.setattr(rate_limit, "model_limiter", SlidingWindowLimiter(limit=1))
    request = SimpleNamespace(client=SimpleNamespace(host="203.0.113.5"))

    asyncio.run(enforce_model_rate_limit(request, subject="learner-a"))
    with pytest.raises(HTTPException) as raised:
        asyncio.run(enforce_model_rate_limit(request, subject="learner-a"))
    assert raised.value.status_code == 429
    assert raised.value.headers["Retry-After"]

    # A different signed-in learner has a separate budget.
    asyncio.run(enforce_model_rate_limit(request, subject="learner-b"))
