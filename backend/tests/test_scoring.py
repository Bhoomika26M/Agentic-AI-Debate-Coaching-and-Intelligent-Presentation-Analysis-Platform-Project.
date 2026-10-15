import pytest
from app.utils.scoring import compute_overall, WEIGHTS

def test_compute_overall_all_present():
    scores = {"argument_quality": 80, "evidence_usage": 70, "logical_consistency": 90,
              "rebuttal_effectiveness": 60, "communication_skills": 75}
    assert compute_overall(scores) == round(
        80*.3 + 70*.2 + 90*.2 + 60*.15 + 75*.15, 2)

def test_compute_overall_missing_raises():
    with pytest.raises(ValueError):
        compute_overall({"argument_quality": 50})

def test_weights_sum_to_one():
    assert round(sum(WEIGHTS.values()), 6) == 1.0