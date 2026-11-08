# Debate context window measurement

Fixture: 40 turns, 90 filler words per turn, the learner's opening case at turn 0,
and the claim "a phone ban improves focus by twelve percent" planted at turn 2.
Latest learner argument: "Does a phone ban really improve focus in class?"

Environment: `qwen3.5:4b` Q4_K_M through Ollama 0.32.15 on an NVIDIA RTX 4050
Laptop GPU (5.7 GiB). Measured 7 November 2026. The model was warmed with a
one-token call first; each prompt was run three times and the medians are shown.

Command:

```sh
cd ai-backend
uv run python evals/measure_context.py --ollama --runs 3
```

Prompt size:

| Prompt | Prompt tokens (estimate) | Messages | Claim at turn 2 | Opening case |
| --- | ---: | ---: | --- | --- |
| Legacy fixed window (8 turns + digest) | 1,913 | 11 | no | no |
| Token-budgeted context | 3,651 | 22 | yes | yes |

The new context carried 19 turns in the window, condensed 21, and recalled
1 older turn by keyword overlap. Both prompts keep the same system rules and
latest turn; only the history window differs.

Streaming timing (`num_predict=240`):

| Prompt | First token, median | First token, min–max | Total reply, median |
| --- | ---: | ---: | ---: |
| Legacy fixed window | 222 ms | 220–930 ms | 3,393 ms |
| Token-budgeted context | 239 ms | 225–1,592 ms | 2,990 ms |

Reading: the larger window added about **17 ms** to first token in this sample.
Total reply time is dominated by generation and is noisy; the new prompt's lower
total is not evidence of a speedup. The point of the change is recall: the
legacy prompt lost both the opening case and the planted claim at turn 2, while
the new prompt carries both.

One machine, one quantization, three runs. Re-run before quoting these figures
elsewhere; the first run of each prompt also included the most variance.
