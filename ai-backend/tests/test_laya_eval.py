"""Keep the hand-labeled Laya baseline honest as it is edited."""

import importlib.util
from pathlib import Path

from app.agents.laya_selector import MOVE_INSTRUCTIONS

EVAL = Path(__file__).resolve().parents[1] / "evals" / "evaluate_laya.py"


def _module():
    spec = importlib.util.spec_from_file_location("evaluate_laya", EVAL)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_labeled_set_is_valid_and_covers_every_move():
    module = _module()
    rows = module.load_rows()

    assert len(rows) == 24
    assert module.validate_rows(rows, set(MOVE_INSTRUCTIONS)) == []
    assert {row["expected_move"] for row in rows} == set(MOVE_INSTRUCTIONS)


def test_validation_rejects_a_mislabeled_move():
    module = _module()
    rows = module.load_rows()[:1]
    rows[0] = {**rows[0], "expected_move": "win_the_round"}

    problems = module.validate_rows(rows, set(MOVE_INSTRUCTIONS))
    assert any("expected_move" in problem for problem in problems)
