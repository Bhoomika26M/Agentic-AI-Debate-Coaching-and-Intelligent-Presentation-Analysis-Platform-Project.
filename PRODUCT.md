# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Verdict serves students and self-directed learners who want to practice debate and improve their presentation skills. The product is learner-facing; v1 has no instructor, judge, or staff account role.

## Product Purpose

Verdict helps learners rehearse live debates with an AI opponent and improve through argument analysis and presentation feedback. Success means a learner can complete an engaging practice session and leave with understandable, useful next steps.

## Positioning

Learners can choose a curated or custom motion, their side, an opponent persona, challenge level, and session length. The AI opponent responds as a debate participant, with replies streamed into the session. Verdict pairs that rehearsal with feedback on argument quality and presentation delivery so learners can practice and review in one place.

## Operating Context

- The frontend is React, TypeScript, and Vite. AI and ML orchestration stays in Python 3.12 with FastAPI and `uv`; AI decisions and model calls stay in Python.
- Inference runs through Ollama (`qwen3.5:4b` by default) on the operator's machine or a host they control. Vite forwards `/api` to the API during development.
- Learner accounts and persistence use Supabase Free (confirmed): Supabase Auth for identity, Postgres with row-level security for learner-owned records. Guest practice continues when Supabase is unconfigured or persistence fails.
- Desktop receives the strongest visual polish, while core flows remain usable on mobile.
- The project runs on free tools and hosting tiers: Supabase Free for auth and storage, and the static frontend on Vercel or Render. The API runs on a host that can reach a model endpoint.
- The app behaves as a real product: no placeholder shortcuts, no demo-only copy in product truth.

## Capabilities and Constraints

- Implemented: learner accounts and AI Debate Simulation plus argument intelligence.
- Debate setup supports curated and custom topics, for/against side, personas (`strategist`, `skeptic`, `diplomat`), difficulty (`warm-up`, `challenge`, `cross-examination`), and session duration 2–10 minutes. Replies stream over SSE.
- Account supports email/password sign-up and sign-in with validation (12+ characters with uppercase, lowercase, number), Google OAuth, email verification, password visibility, and a guest route. Passwords are handled by Supabase Auth; Verdict never sees or stores them.
- Saved work is owner-scoped with RLS: debate sessions and turns, completion/resume, learner archive with transcript viewing, and saved argument reviews.
- Argument intelligence reviews the transcript against five named rubric criteria (`clarity`, `relevance`, `evidence_strength`, `logical_consistency`, `persuasiveness`), checks eight documented fallacy types against exact transcript text, and generates five planned counterpoint styles. Incomplete model replies are retried with a repair turn (up to three attempts); a report that stays incomplete ends in a clear error, not a partial review. Limits are stated as text-only.
- Delivery review covers four observable states (rushed, hesitant, flat, tense-voice) with explainable scores, recommendations, the learner dashboard and progress, reports, and in-app milestones. Categorical emotion recognition stays local-only opt-in; hosted review uses delivery proxies only. Other account roles and debate formats are out of scope for v1.
- Local inference uses Ollama. Local speech uses faster-whisper tiny by default (STT_MODEL=tiny|base, optional local install); hosted transcription uses a provider key supplied by the learner, handled transiently by Python. Do not persist or log provider keys, expose them to browser code, use a project-owned paid key, or fall back to paid inference.
- Recorded audio is discarded immediately by default (10MB / 180s caps). Retention is available only through an explicit learner setting.
- Keep Python modules focused, code readable, and comments minimal.
- Backend requires explicit `WEB_ORIGIN` and `ALLOWED_HOSTS`, applies no-store/security response headers, validates request sizes, and caps simultaneous streams (`MAX_ACTIVE_STREAMS=2`). `REQUIRE_AUTH=false` keeps guest practice open; any hosted deployment sets `REQUIRE_AUTH=true` with Supabase JWKS verification.
- Keyboard access, visible focus, and reduced-motion support are implemented across the practice flow.

## Brand Commitments

- The product name is Verdict.
- The debate area should feel characterful, game-like, and engaging. The user cited Persona, Danganronpa, and Ace Attorney as aesthetic references; create original work and do not reproduce their screens or assets.
- The experience should make the learner feel as if they are debating a distinct opponent, rather than chatting with a generic assistant.

## Evidence on Hand

- The repository contains a runnable React/Vite frontend and a Python/FastAPI service that streams responses from a local Ollama model.
- Replies stream from the Qwen3.5 4B model through the API, which is the only component that talks to a model.
- Argument analysis returns all five ratings, all five counterargument kinds, and grounded coaching from a single review request.
- The Supabase schema lives in `supabase/migrations/` (`debate_sessions`, `debate_turns`, `debate_analyses`) with explicit grants and owner-scoped RLS policies. Account and archive flows need the operator's own Supabase credentials to run.
- No learner research, validated coaching outcomes, testimonials, or comparative benchmarks are recorded. Do not invent or imply them.

## Product Principles

- Make practice engaging, then make feedback useful and understandable.
- Keep learner choices central: topic, side, opponent style, challenge level, and time belong to the learner.
- Keep AI behavior explainable and isolated in Python.
- Protect learner content, audio, and provider credentials with clear, conservative defaults.
- Keep the project free to operate and honest about what has and has not been implemented.

## Accessibility & Inclusion

The product has no additional product-specific accessibility requirements yet. Keyboard access and reduced-motion refinements are deferred, and should be addressed in a later pass.
