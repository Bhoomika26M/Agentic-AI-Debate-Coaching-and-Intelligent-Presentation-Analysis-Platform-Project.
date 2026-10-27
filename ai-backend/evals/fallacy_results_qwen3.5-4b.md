# Fallacy detection baseline

Measured on 2026-10-27 with the local model this project defaults to.

- Model: `qwen3.5:4b`, Q4_K_M, 4.7B parameters, running under Ollama on this machine (an NVIDIA RTX 4050 Laptop GPU is present; the run was not profiled for device placement).
- Prompt: the production fallacy branch (`FALLACY_INSTRUCTIONS` / `FALLACY_TASK`), temperature 0.2.
- Data: all 50 snippets in `fallacy_snippets.jsonl`, labelled by the author of this repository.
- Command: `cd ai-backend && uv run python evals/evaluate_fallacies.py --json`
- Raw runs: `fallacy_results_qwen3.5-4b.run1.json`, `.run2.json`, `.run3.json`

The scores are flag-level: a true positive is a predicted label that matches the snippet's label. A
predicted label on a clean snippet, or a second label on a flagged one, is a false positive. The
model was not re-prompted between runs, so the spread below is sampling variance at temperature
0.2.

| Run | Precision | Recall | F1 | TP | FP | FN | Snippets detected |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 77.8% | 35.0% | 48.3% | 14 | 4 | 26 | 24/50 |
| 2 | 75.0% | 45.0% | 56.3% | 18 | 6 | 22 | 27/50 |
| 3 | 73.7% | 35.0% | 47.5% | 14 | 5 | 26 | 24/50 |

Range: precision 73.7–77.8%, recall 35.0–45.0%, F1 47.5–56.3%, per-snippet detection 24–27 of 50.

Recall per type, as a range across the three runs: Ad Hominem 4–5/5, Appeal to Authority 3/5,
False Dilemma 1–3/5, Hasty Generalization 1–3/5, Red Herring 1–3/5, Circular Reasoning 0–1/5,
Slippery Slope 0–1/5, Straw Man 0–1/5. Zero predicted quotes were dropped for failing the
verbatim check in any run.

## What this means

The detector is conservative and misses most non-ad-hominem fallacies on this set: it finds four or
five of five ad hominem examples but only zero or one straw man and slippery slope. A precise but
low-recall detector is the safer failure mode for coaching (a missed label is better than a false
accusation), but it is not good enough to claim reliable fallacy detection. The eight categories
exist and are quote-grounded; the accuracy is the weak part.

## Limits

- 50 snippets is small, and every label is one author's reading. It is not an adjudicated corpus.
- Only one model at one quantization was measured. A hosted model will score differently.
- A label counts as correct when its type matches; the quote is only checked for being verbatim,
  not for picking the best span.
- This set was written before these runs and has not been tuned against them. Do not treat these
  numbers as a ceiling or a target; if the prompt changes, re-run and publish a new baseline.
- These are detector numbers, not learner improvement.
