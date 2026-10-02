# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Verdict serves students and self-directed learners who want to practice debate and improve their presentation skills. The product is learner-facing; v1 has no instructor, judge, or staff account role.

## Product Purpose

Verdict helps learners rehearse live debates with an AI opponent and improve through argument analysis and presentation feedback. Success means a learner can complete an engaging practice session and leave with understandable, useful next steps.

## Positioning

Learners can choose a curated or custom motion, their side, an opponent persona, challenge level, and session length. The AI opponent responds as a debate participant, with replies streamed into the session. After the core debate path, Verdict adds feedback on argument quality and presentation delivery so learners can practice and review in one place.

## Operating Context

- Development and the first demo run locally in a browser, with a Python API and Ollama handling inference on the developer's machine.
- The first demo presents a guided product walkthrough before a streamed AI debate. Learner accounts and secondary coaching modules are not required for that demo.
- The full learner showcase is planned for October 12, 2026. It adds learner accounts, saved sessions, analysis, presentation coaching, and progress features.
- Desktop receives the strongest visual polish, while core flows remain usable on mobile.
- The frontend is React, TypeScript, and Vite. AI and ML orchestration stays in Python 3.12 with FastAPI and `uv`.

## Capabilities and Constraints

- V1 supports learner accounts and AI Debate Simulation only. Other account roles and debate formats are out of scope.
- Debate setup supports curated and custom topics, user-selected session duration, personas, and difficulty levels.
- Planned learner features include email/password sign-up and sign-in with validation, Google OAuth, saved transcripts, argument and fallacy analysis, rebuttals, presentation feedback, scoring, recommendations, a learner dashboard, reports, and in-app milestones.
- Local inference uses Ollama. A deployed AI feature must use a provider key supplied by the learner, handled transiently by Python. Do not persist or log provider keys, expose them to browser code, use a project-owned paid key, or fall back to paid inference.
- The project must use free tools and hosting tiers. Supabase Free and Vercel or Render free hosting are candidates; confirm service limits and streaming behavior before choosing the final deployment path.
- Recorded audio is discarded immediately by default. Retention is available only through an explicit learner setting.
- Keep AI decisions and model calls in Python. Keep Python modules focused, code readable, and comments minimal.
- The local demo has no authentication or transcript persistence. The public AI service is not ready until learner authentication, authorization, and BYOK are implemented.
- First local demo target: October 5, 2026. Full showcase target: October 12, 2026.
- Keyboard and reduced-motion refinements are deferred for the current demo.
- Auth provider and final free-tier hosting provider remain to be confirmed before integration and deployment.

## Brand Commitments

- The product name is Verdict.
- The debate area should feel characterful, game-like, and engaging. The user cited Persona, Danganronpa, and Ace Attorney as aesthetic references; create original work and do not reproduce their screens or assets.
- The experience should make the learner feel as if they are debating a distinct opponent, rather than chatting with a generic assistant.

## Evidence on Hand

- The repository contains a runnable React/Vite frontend and a Python/FastAPI service that streams responses from a local Ollama model.
- The local demo has been exercised with the Qwen3.5 4B model and a streamed debate exchange, as recorded in `PROGRESS.md`.
- The original project specification and planning references are in the local, untracked `.references/` directory. The source specification is `.references/AI_Debate Coach & Presentation Analysis Platform (1)-1.pdf`.
- No learner research, validated coaching outcomes, testimonials, or comparative benchmarks are recorded. Do not invent or imply them.

## Product Principles

- Make practice engaging, then make feedback useful and understandable.
- Keep learner choices central: topic, side, opponent style, challenge level, and time belong to the learner.
- Keep AI behavior explainable and isolated in Python.
- Protect learner content, audio, and provider credentials with clear, conservative defaults.
- Keep the project free to operate and honest about what has and has not been implemented.

## Accessibility & Inclusion

The current demo does not have additional product-specific accessibility requirements. Keyboard access and reduced-motion refinements are deferred, and should be addressed in a later pass.
