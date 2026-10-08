# Security Notes

This document describes what Verdict protects today and what must happen before public AI access. It is written for anyone reviewing or deploying the project.

## What is enforced now

- **AI stays in Python.** The browser sends debate turns and audio to the FastAPI service. Prompt construction, model calls, transcription, and coaching all happen server side. The browser never talks to a model directly.
- **Explicit trust boundaries.** FastAPI starts only with explicit `WEB_ORIGIN` and `ALLOWED_HOSTS` values. Wildcards are rejected at startup. CORS allows only `GET` and `POST` with `Content-Type` and `Authorization` headers, and the browser client omits cookies.
- **Authentication with least privilege.** Supabase Auth issues the tokens; Python verifies them against the project's JWKS and never sees passwords. Guest mode (`REQUIRE_AUTH=false`) exists for local testing only.
- **Owner scoped data.** Every database table enables row level security and grants access to `authenticated` users scoped to their own `auth.uid()`. The Python service holds no database credential at all, so a compromised API token can burn compute but cannot read another learner's archive.
- **No-store API responses.** Debate and coaching responses carry `no-store` headers. Transcripts live in browser memory for guests and in the owner's Supabase rows for signed-in learners.
- **Bounded inputs.** Pydantic limits topic, turn, and history sizes. Debate audio is capped at 10MB and 180 seconds, validated by content sniffing (not just MIME labels) before transcription.
- **Conservative AI defaults.** Jailbreak and off-motion turns are pattern-routed to an in-character redirect with no model call. Learner text is wrapped as data, never instructions, in every prompt. Coaching reports are validated against strict schemas with targeted retries.
- **Private by default.** Contact details are redacted from saved coaching reports. Recorded audio is discarded immediately unless the learner explicitly opts into retention, in which case it lands in a private per-owner storage bucket. Categorical emotion recognition is local only and opt in; hosted review uses delivery proxies labeled as estimates.
- **Abuse surface limits.** Simultaneous model streams are capped per process (`MAX_ACTIVE_STREAMS=2`, HTTP 429 beyond it). Static hosting applies content security, framing, MIME, referrer, and caching headers.

## Required before public AI access

- Set `REQUIRE_AUTH=true` with Supabase JWKS configured; never serve the guest mode API publicly.
- Implement the hosted provider key path (designed, with transient-only handling specified; the code currently rejects provider keys). Keep user keys out of logs, persistence, and all `VITE_` browser variables.
- Narrow `connect-src` from broad HTTPS to the exact API and Supabase origins, and retest the policy against the deployed origins and OAuth callbacks.
- Add distributed rate limiting and abuse monitoring if more than one API instance serves traffic.
- Exercise the full credential-backed path end to end (auth, archive, profiles, retention, dashboard) against the production Supabase project before inviting real learners.

## Never do

- Put service-role keys, OAuth client secrets, or model provider keys in `VITE_` variables. They ship inside browser files where anyone can read them.
- Use a project-owned paid AI key or add paid fallback. The project runs on free tiers and learner-supplied keys only.
- Persist provider keys, log request bodies containing keys, or retain audio without explicit opt-in.
