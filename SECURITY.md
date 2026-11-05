# Security Notes

This document describes what Verdict protects today and what must happen before public AI access. It is written for anyone reviewing or deploying the project.

## What is enforced now

- **AI stays in Python.** The browser sends debate turns and audio to the FastAPI service. Prompt construction, model calls, transcription, and coaching all happen server side. The browser never talks to a model directly.
- **Explicit trust boundaries.** FastAPI starts only with explicit `WEB_ORIGIN` and `ALLOWED_HOSTS` values. Wildcards are rejected at startup. CORS allows only `GET` and `POST` with `Content-Type` and `Authorization` headers, and the browser client omits cookies.
- **Authentication with least privilege.** Supabase Auth issues the tokens; Python verifies them against the project's JWKS and never sees passwords. Authentication is required by default. The browser gates practice behind sign-in. `REQUIRE_AUTH=false` only opens the API to unauthenticated requests and is for isolated local API development; it does not unlock guest practice in the browser app.
- **Owner scoped data.** Every database table enables row level security and grants access to `authenticated` users scoped to their own `auth.uid()`. The Python service holds no database credential at all, so a compromised API token can burn compute but cannot read another learner's archive.
- **No-store API responses.** Every API response, including server-sent event streams, carries `no-store`; the streaming handler cannot weaken it to `no-cache`. The browser app requires sign-in for debate and saved work. A local client that calls the API directly with `REQUIRE_AUTH=false` is not authenticated and must not send private learner data.
- **Bounded inputs.** Pydantic limits topic, turn, and history sizes. Audio is capped at 10MB and 180 seconds, checked by content sniffing and by the container duration before transcription starts; decoding has its own wall-clock budget. A continued debate sends a bounded history window, and the API condenses older turns before prompting.
- **Conservative AI defaults.** Hard off-motion requests (code, essays, prompt exfiltration) are pattern-routed to an in-character redirect with no model call. Soft meta requests are routed only when the turn shows no debate evidence. This guard is a coarse routing signal, not a complete injection defence; normal debate turns that mention a trigger-like phrase still reach the model. Learner text is wrapped as data, never instructions, in every prompt. Coaching reports are validated against strict schemas with targeted retries.
- **Private by default.** Contact details are redacted from saved coaching reports. Recorded audio is discarded immediately unless the learner explicitly opts into retention, in which case it lands in a private per-owner storage bucket. Categorical emotion recognition is local only and opt in; hosted review uses delivery proxies labeled as estimates.
- **Abuse surface limits.** Simultaneous model streams are capped per process (`MAX_ACTIVE_STREAMS=2`, HTTP 429 beyond it). Per-IP API requests and per-learner model requests are rate limited (`RATE_LIMIT_PER_MINUTE`, `MODEL_RATE_LIMIT_PER_MINUTE`) with `Retry-After`; limits are per process, so a multi-instance deployment needs a shared limiter. Socratic follow-ups are capped at two per learner turn by server-side state, not by the `depth` value a client sends. Static hosting applies content security, framing, MIME, referrer, and caching headers.
- **Public mode is gated at startup.** With `DEPLOYMENT_ENV=public`, the API refuses to start unless `REQUIRE_AUTH=true`, every `WEB_ORIGIN` is `https`, and `ALLOWED_HOSTS` names a real host rather than loopback. Unauthenticated API access is available only as an explicit `local` override.

## Required before public AI access

- Set `DEPLOYMENT_ENV=public` and `REQUIRE_AUTH=true` with Supabase JWKS configured. The startup guard enforces this, but verify the deployed environment variables at the host as well.
- Hosted provider routing is implemented in `app/providers.py` (`LLM_PROVIDER=openai`, or a key with `auto`). Keep `OPENAI_API_KEY` server-side only, out of logs, persistence, and all `VITE_` browser variables.
- Narrow `connect-src` from broad HTTPS to the exact API and Supabase origins, and retest the policy against the deployed origins and OAuth callbacks.
- Add distributed rate limiting and abuse monitoring if more than one API instance serves traffic; the built-in counters are per process.
- Exercise the full credential-backed path end to end (auth, archive, profiles, retention, dashboard) against the production Supabase project before inviting real learners. The repository ships a pgTAP RLS suite in `supabase/tests/rls_test.sql`; run it with `supabase start` then `supabase test db`.

## Never do

- Put service-role keys, OAuth client secrets, or model provider keys in `VITE_` variables. They ship inside browser files where anyone can read them.
- Use a project-owned paid AI key or add paid fallback. The project runs on free tiers and learner-supplied keys only.
- Persist provider keys, log request bodies containing keys, or retain audio without explicit opt-in.
