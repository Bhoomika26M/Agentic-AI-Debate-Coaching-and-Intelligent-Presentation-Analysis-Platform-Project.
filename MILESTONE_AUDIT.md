# Milestone audit and completion record

Audit of the four project milestones against the code in this repository, rewritten after the
work that closed the gaps. Status vocabulary: **Done** (shipped and exercised), **Partial**
(exists but weaker than the milestone asks), **Missing** (no implementation).

Evidence is limited to what the repository contains and what was run against the live stack.
Anything not exercised is marked as unverified rather than assumed.

## Milestone 1 — initialization, design process, core setup

| Task | Status | Evidence | Note |
|---|---|---|---|
| Define objectives and coaching workflows | Done | `PRODUCT.md`, `README.md` | — |
| Design system architecture and database schema | Done | `supabase/migrations/*`, `ai-backend/app/` | — |
| UI wireframes and workflow planning | Done | `PRODUCT.md` for the workflow; wireframes and per-screen specs are local-only (`DESIGN.md`, `.impeccable/surfaces/`), both gitignored by choice | — |
| Frontend and backend environments | Done | `web/` (Vite + TS), `ai-backend/` (FastAPI + uv) | — |
| Authentication and role-based access | Partial | `web/src/features/auth/`, `ai-backend/app/auth.py`, Supabase RLS | Deliberate: v1 is learner-only, so there is no instructor or judge role. The learner role is enforced by RLS plus JWKS verification, not by a role table. |
| User profile and skill tracking | Done | `profiles` table, `AccountView` profile form, trends tab, `learning_plans` | The skill model is now persisted: a plan records which weak spots were diagnosed, from which scores. |
| Debate session management | Done | `debate_sessions`, `debate_turns`, archive, resume | — |

**Verdict: complete with deviations.** There are no roles beyond learner, no scheduling, and no
named debate formats; those are recorded as product decisions, not defects.

## Milestone 2 — argument analysis and fallacy detection

| Task | Status | Evidence |
|---|---|---|
| Argument analysis engine | Done | `app/agents/analysis_graph.py` (fan-out branches, bounded schema repair) |
| Fallacy detection workflows | Done | `fallacy_node`, quote grounding against learner text |
| Reasoning evaluation models | Done | Rubric branch over five named criteria, judge graph |
| Argument scoring systems | Done with deviations | `app/agents/judge.py`, weighted 30/20/20/15/15; rebuttal is scored from the learner's replies to challenges or later points (not the opening case), and a dimension with no evidence is omitted with the remaining weights renormalized and disclosed |
| Debate feedback reports | Done | Verdict view, CSV export, print report |

**Verdict: complete with deviations.** The analysis is rubric ratings and quote-grounded fallacies; there is no claim extraction or evidence grading. Fallacy accuracy is measured on 50 author-labelled snippets with `qwen3.5:4b`: 73.7–77.8% precision but only 35.0–45.0% recall across three runs (see `evals/fallacy_results_qwen3.5-4b.md`). The detector is conservative and misses most straw man, slippery slope and circular reasoning examples, which is the weakest measured part of the analysis.

## Milestone 3 — AI debate simulation and coaching

| Task | Status | Evidence |
|---|---|---|
| AI debate simulation engine | Done | `app/agents/debate.py`: guard → memory → planner → drafter (streamed) → verifier → reviser, with a neutral on-motion fallback instead of a discarded turn |
| Counterargument generation workflows | Done | `counter_node`, five kinds enforced exactly once each |
| Coaching recommendation engine | Done | `app/agents/memory.py` diagnosis over the learner's own digests, drilled by `app/agents/plan_graph.py` |
| Personalized learning plans | Done | `POST /api/coach/plan`, `learning_plans` table, Plan tab in the learner space |
| Performance dashboards | Partial | Learner trends tab (sessions, streaks, averages, filler direction) plus the plan's four-week rhythm. There are no coach, educator, or admin dashboards |

**Verdict: complete with deviations** (learner dashboard only). The plan is grounded by construction: the deterministic diagnosis names
the weak spots, the model may only coach those, and `verifier.inspect_plan` rejects invented
weaknesses, invented scores, invented session counts and a next-session line that says nothing.
One repair attempt is allowed; a draft that still fails is replaced by a plan built from the
scores directly, with the gap disclosed to the learner.

## Milestone 4 — presentation analytics, testing, deployment

| Task | Status | Evidence |
|---|---|---|
| Presentation analysis engine | Partial | `delivery_graph.py` (transcribe → signals → coach), `speech.py`, `delivery.py`. Pace, fillers, pauses and repeats only; no confidence, engagement, or prosody, and no slides or video |
| Reports and visualization modules | Partial | Verdict delivery section, signal rows, drills, archive CSV, print. No native PDF or Excel export |
| Testing and validations | Done | `ai-backend/tests/` (280 tests) covers the deterministic gates, the agent graphs and the request contracts with deterministic model fakes, so no Ollama is needed; 11 Playwright tests cover the browser paths. `.github/workflows/ci.yml` defines pytest, the fallacy-set check, the typecheck and a build; it has not yet run on a GitHub runner |
| Deploy with Docker and cloud services | Partial | `ai-backend/Dockerfile` (runtime + test stages), `web/Dockerfile` + `nginx.conf`, `docker-compose.yml`, `.env.docker.example`, and hosted OpenAI-compatible routing in `app/providers.py`. **No public deployment exists.** |
| Final documentation and presentation | Partial | `README.md`, `PROGRESS.md`, this file, and `docs/demo.webm`; documentation and a recorded walkthrough exist, but there is no slide deck |

**Verdict: not fully implemented.** The testing and packaging half is done; the deployment half is
not. Earlier runs of this audit verified the compose stack on :8080 with a real model turn over
SSE and a grounded plan. The stream is emitted only after the draft has been generated and
reviewed, so latency must be measured from request to first displayed text; the older first-byte
and delta-count figures described a buffering-free implementation that no longer exists. The
bundled Ollama service and its model-pull sidecar were not started in that run (a 1.5 GB image
plus a 3.4 GB model on a machine that already runs Ollama); the API container was pointed at the
host's Ollama through a `host-gateway` bridge instead. What is still missing: a host, a URL,
monitoring, and native PDF/Excel reports.

## Is the system agentic?

Yes, in the sense the milestone asks for. Five LangGraph graphs and one deterministic reducer
coordinate the work, and the coordination is enforced in code rather than implied by a prompt.
The production opponent turn is `respond_stream` in `agents/debate.py`, which runs the
guard → memory → planner → drafter → verifier → reviser sequence by hand; the compiled debate
graph is a tested reference path, not what the endpoint executes.

| Agent | Module | Runs when | Job |
|---|---|---|---|
| Guard | `agents/guard.py` | every turn, first | routes hard off-motion requests to an in-character redirect with no model call, and routes soft meta requests only when the turn shows no debate evidence |
| Memory | `agents/memory.py` | every turn | reduces stored digests into a private brief for the opponent and the coach |
| Planner | `agents/planner.py` | every other learner turn | names the weakest joint in the transcript |
| Drafter | `agents/debate.py` | every turn | streams one in-persona reply, briefed by memory and planner |
| Verifier | `agents/verifier.py` | after every draft | length, role labels, first-person character breaks, brief leakage, engagement with the latest point (paraphrases allowed); heuristic, so direct address can pass without shared vocabulary; later, plan groundedness |
| Reviser | `agents/verifier.py` | only when the verifier objects | up to two bounded repairs, never an unbounded rewrite loop |
| Fallback | `agents/debate.py` | when repair also fails | neutral on-motion question instead of a refusal or a bad turn |
| Analysis branches | `agents/analysis_graph.py` | on review | rubric, fallacy and counterpoint branches with targeted retries, then a disclosing merge |
| Judge | `agents/judge.py` | on review | deterministic weighted scoring in four branches, no model call |
| Diagnosis | `agents/plan_graph.py` | on plan build | deterministic weak spots with evidence |
| Coach | `agents/plan_graph.py` | on plan build | drills and milestones for those weak spots only |
| Delivery | `agents/delivery_graph.py` | on audio | transcribe → signals → coach |

What the system still does not have, in order of impact: tools (no agent can retrieve a past
transcript or look up a previous plan; everything is prompt-only), a shared step budget or trace
across graphs (each caller decides its own caps), and long-horizon planning beyond one four-week
window. Those are the next architectural steps, not gaps against the milestones.

## Remaining limitations

1. The Plan tab's save path needs `20261010120000_create_learning_plans.sql` applied to the
   Supabase project; without it the tab explains that the plan library is not connected.
2. The arena and verdict views are not hash addressable, so a refresh mid-debate returns to the
   landing page and relies on the resume banner.
3. No deployment exists. Hosted generation works through `OPENAI_API_KEY` with any
   OpenAI-compatible endpoint, but nobody has hosted it, so there is no URL, no monitoring, and
   no public URL. A real local capture is in `docs/demo.webm`, but it was recorded on this machine
   against Ollama, so it is a walkthrough rather than a demo anyone can try. Do not expose the
   guest-mode API publicly.
4. Fallacy recall is weak: 35–45% at 73.7–77.8% precision on 50 author-labelled snippets with one
   local model. The set is small and author-labelled, only one model was measured, and a correct
   label does not prove the quote is the best span. Raw runs are in `ai-backend/evals/`.
5. `ruff check app` still reports 45 long-line findings, concentrated in prompt strings in
   `prompts.py`, `analysis_graph.py` and `presentation.py`. The modules and tests added or
   rewritten here (`providers.py`, `judge.py`, `delivery.py`) pass `ruff check` with no findings.
6. The learner-space screenshot in the README is the seeded browser-test fixture, not a real
   learner's account; its caption says so. The setup, arena, verdict, and demo artifacts come from
   real local runs against `qwen3.5:4b`.
7. The reply verifier is a heuristic, not a fact-check. A draft that addresses the learner
   directly ("you should…") can pass the engagement check without sharing the latest point's
   vocabulary. "Verified" in the room means the deterministic form checks passed; it does not
   mean the argument is sound or the facts are checked.
