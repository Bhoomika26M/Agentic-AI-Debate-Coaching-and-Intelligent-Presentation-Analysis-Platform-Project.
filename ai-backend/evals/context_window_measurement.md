# Debate context window measurement

Fixture: 40 turns, 90 filler words per turn, the learner's opening case at turn 0,
and the claim "a phone ban improves focus by twelve percent" planted at turn 2.
Latest learner argument: "Does a phone ban really improve focus in class?"

Environment: `qwen3.5:4b` Q4_K_M through Ollama 0.32.15 on an NVIDIA RTX 4050
Laptop GPU (5.7 GiB). Measured 7 November 2026. The model was warmed with a
one-token call first; each prompt was run three times and the medians are shown.

**These timings are optimistic as a real-turn estimate.** Each prompt was
repeated unchanged, so Ollama may have reused a warm prompt cache. A real turn
changes the prompt every time. The fresh-prompt cost was not measured; re-run
with `--fresh` (which adds a nonce to defeat the cache) before quoting it. The
token counts below are the `estimate_tokens` heuristic, not the model tokenizer.
The test suite proves the planted claim reaches the prompt; it does not prove the
model uses that claim in its reply. There is no answer-quality evaluation here.

Command:

```sh
cd ai-backend
uv run python evals/measure_context.py --ollama --runs 3 --fresh
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

Reading: the larger window added about **17 ms** to the median first token in
this cached-prompt sample, but the token-budgeted run reached **1,592 ms** and
the legacy run reached 930 ms at its worst. The medians hide that tail. Total
reply time is dominated by generation and is noisy; the new prompt's lower total
is not evidence of a speedup. The point of the change is recall: the legacy
prompt lost both the opening case and the planted claim at turn 2, while the new
prompt carries both. Recall matching is now Unicode-aware, but this fixture does
not measure accented recall or model answer quality.

One machine, one quantization, three runs. Re-run with `--fresh` before quoting
these figures elsewhere; the first run of each prompt also included the most
variance.
