# Scorecard load measurement

Fixture: a 16-turn phone-ban debate with 8 learner turns and a closing take.
Environment: `qwen3.5:4b` Q4_K_M through Ollama 0.32.15 on an NVIDIA RTX 4050
Laptop GPU (5.7 GiB), 7 November 2026.

Method: direct calls into the same graphs the API uses. The model was warmed
first. Each review condition was run three times and the medians are shown.
"Old caps" forces the pre-change 1,400-token cap on every review branch;
"new caps" uses the current 700/500/600 limits. The judge is deterministic.
The plan refresh is the real model-written plan graph and verifier. Supabase
writes and browser paint time are excluded.

Command:

```sh
cd ai-backend
uv run python evals/measure_scorecard.py --runs 3
```

| Stage | Median |
| --- | ---: |
| Review, old caps | 30,595 ms |
| Review, new caps | 31,126 ms |
| Deterministic judge | 3 ms |
| Plan refresh | 49,578 ms |

Modeled scorecard wait for a signed-in learner with a saved review:

| Sequence | Wait |
| --- | ---: |
| Old: review + plan refresh + judge | 80,176 ms |
| New: review + judge, plan in background | 31,129 ms |
| Removed from the full-review path | 49,047 ms |

The API now streams the rubric as soon as that branch lands, so the
scorecard can paint before fallacy detection and counterpoints finish. This
table still measures the complete review; it does not measure the earlier
first paint.

Reading:

- The gain comes from **not waiting for the practice-plan refresh**. The 4B
  model finished below both review caps, so tightening the caps did not
  measurably speed up the review; it only bounds worst-case output.
- The remaining full-review wait is about **31 s** on this hardware. The
  rubric is now streamed as soon as that branch lands, so the scorecard paints
  while the other review branches finish. The next useful optimization would
  be to reduce the number of review branches or shorten their outputs.
- Scope: a signed-in learner with a saved review. Guests never ran the plan
  refresh, so their scorecard path was already review + judge.
- One machine, one quantization, three runs. Re-run before quoting elsewhere.
