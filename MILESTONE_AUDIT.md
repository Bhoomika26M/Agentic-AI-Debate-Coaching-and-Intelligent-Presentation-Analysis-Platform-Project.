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

**Verdict: complete**, with the role exclusion recorded as a product decision, not a defect.

## Milestone 2 — argument analysis and fallacy detection

| Task | Status | Evidence |
|---|---|---|
| Argument analysis engine | Done | `app/agents/analysis_graph.py` (fan-out branches, bounded schema repair) |
| Fallacy detection workflows | Done | `fallacy_node`, quote grounding against learner text |
| Reasoning evaluation models | Done | Rubric branch over five named criteria, judge graph |
| Argument scoring systems | Done | `app/agents/judge.py`, weighted 30/20/20/15/15 |
| Debate feedback reports | Done | Verdict view, CSV export, print report |

**Verdict: complete.**

## Milestone 3 — AI debate simulation and coaching

| Task | Status | Evidence |
|---|---|---|
| AI debate simulation engine | Done | `app/agents/debate.py`: guard → memory → planner → drafter (streamed) → verifier → reviser, with an in-character fallback instead of a discarded turn |
| Counterargument generation workflows | Done | `counter_node`, five kinds enforced exactly once each |
| Coaching recommendation engine | Done | `app/agents/memory.py` diagnosis over the learner's own digests, drilled by `app/agents/plan_graph.py` |
| Personalized learning plans | Done | `POST /api/coach/plan`, `learning_plans` table, Plan tab in the learner space |
| Performance dashboards | Done | Trends tab (sessions, streaks, averages, filler direction) plus the plan's four-week rhythm |

**Verdict: complete.** The plan is grounded by construction: the deterministic diagnosis names
the weak spots, the model may only coach those, and `verifier.inspect_plan` rejects invented
weaknesses, invented scores, invented session counts and a next-session line that says nothing.
One repair attempt is allowed; a draft that still fails is replaced by a plan built from the
scores directly, with the gap disclosed to the learner.

## Milestone 4 — presentation analytics, testing, deployment

| Task | Status | Evidence |
|---|---|---|
| Presentation analysis engine | Done | `delivery_graph.py` (transcribe → signals → coach), `speech.py`, `delivery.py` |
| Reports and visualization modules | Done | Verdict delivery section, signal rows, drills, print/CSV |
| Testing and validations | Done | `ai-backend/tests/` — 96 pytest tests over the deterministic gates, the agent graphs and the request contracts, with deterministic model fakes so no Ollama is needed |
| Deploy with Docker and cloud services | Done | `ai-backend/Dockerfile` (runtime + test stages), `web/Dockerfile` + `nginx.conf`, `docker-compose.yml`, `.env.docker.example` |
| Final documentation and presentation | Done | `README.md`, `PROGRESS.md`, this file |

**Verdict: complete.** Verified in this repository: the compose stack serves the app on :8080,
proxies `/api/health` to the API container, streams a real opponent turn over SSE (first byte
0.05 s, 74 deltas), and returns a grounded plan from the real model. The bundled Ollama service
and its model-pull sidecar were not started (a 1.5 GB image plus a 3.4 GB model on a machine that
already runs Ollama); the API container was instead pointed at the host's Ollama through a
`host-gateway` bridge. That link is the one part of the compose file exercised only by
configuration, not by a running pull.

## Is the system agentic?

Yes, in the sense the milestone asks for. Seven LangGraph graphs and one deterministic reducer
coordinate, and the coordination is enforced in code rather than implied by a prompt:

| Agent | Module | Runs when | Job |
|---|---|---|---|
| Guard | `agents/guard.py` | every turn, first | routes prompt injection and off-motion tasks to an in-character refusal with no model call |
| Memory | `agents/memory.py` | every turn | reduces stored digests into a private brief for the opponent and the coach |
| Planner | `agents/planner.py` | every other learner turn | names the weakest joint in the transcript |
| Drafter | `agents/debate.py` | every turn | streams one in-persona reply, briefed by memory and planner |
| Verifier | `agents/verifier.py` | after every draft | length, role labels, character breaks, brief leakage, engagement with the latest point; later, plan groundedness |
| Reviser | `agents/verifier.py` | only when the verifier objects | one bounded repair, never a rewrite loop |
| Fallback | `agents/debate.py` | when repair also fails | in-character substitution instead of shipping a bad turn |
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
3. Hosted provider key routing is designed but not implemented, so deployed generation is not
   possible. Do not expose the guest-mode API publicly.
4. `ruff check app` still reports pre-existing long-line findings in files this change did not
   touch; the new modules and tests are clean.
