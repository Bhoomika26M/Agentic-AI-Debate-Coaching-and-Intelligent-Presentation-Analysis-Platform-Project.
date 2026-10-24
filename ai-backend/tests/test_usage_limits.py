"""The follow-up cap must be enforced by the server, not by the depth a client sends."""

from app.usage_limits import TurnFollowUpLimiter


def test_one_learner_turn_gets_two_follow_ups():
    limiter = TurnFollowUpLimiter(limit=2)
    assert limiter.claim("learner-a", "My first case.") == (True, 1)
    assert limiter.claim("learner-a", "My first case.") == (True, 2)
    assert limiter.claim("learner-a", "My first case.") == (False, 2)


def test_a_new_learner_turn_gets_a_fresh_allowance():
    limiter = TurnFollowUpLimiter(limit=2)
    limiter.claim("learner-a", "My first case.")
    limiter.claim("learner-a", "My first case.")
    assert limiter.claim("learner-a", "A brand new case.") == (True, 1)


def test_learners_do_not_share_a_cap():
    limiter = TurnFollowUpLimiter(limit=2)
    limiter.claim("learner-a", "Same words.")
    limiter.claim("learner-a", "Same words.")
    assert limiter.claim("learner-b", "Same words.") == (True, 1)


def test_a_released_claim_can_be_used_again():
    limiter = TurnFollowUpLimiter(limit=1)
    assert limiter.claim("learner-a", "My case.") == (True, 1)
    limiter.release("learner-a", "My case.")
    assert limiter.claim("learner-a", "My case.") == (True, 1)


def test_an_expired_claim_starts_over():
    limiter = TurnFollowUpLimiter(limit=1, window_seconds=10)
    assert limiter.claim("learner-a", "My case.", now=100.0) == (True, 1)
    assert limiter.claim("learner-a", "My case.", now=105.0) == (False, 1)
    assert limiter.claim("learner-a", "My case.", now=111.0) == (True, 1)
