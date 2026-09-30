# Security Notes

## Current demo boundary

- The browser sends debate requests to the Python API. Prompt construction and model calls stay in Python.
- Local demo transcripts remain in browser memory and are sent to the local Ollama service through FastAPI.
- The demo has no account authentication or database persistence. Keep its API private to local development.
- `VITE_API_BASE_URL` is public build-time configuration. Do not put credentials or provider keys in `VITE_` variables.

## Deployment controls

- Vercel and Render static-site configuration sets a Content Security Policy, frame and MIME protections, referrer policy, HTTPS transport policy, and caching for fingerprinted assets.
- The policy restricts scripts and resources to the app and HTTPS. Once the Python API hostname is chosen, narrow `connect-src` to that exact host in the static host config.
- FastAPI uses explicit `WEB_ORIGIN` and `ALLOWED_HOSTS` allowlists. Wildcard hosts are rejected.
- API responses are marked `no-store`; model streaming has a configurable per-process concurrency cap.
- Pydantic bounds topic, turn, and history sizes before prompt construction.

## Required before public AI access

- Require authenticated learner access and authorize every persisted session by owner.
- Add the Python BYOK provider adapter. Keep user keys transient, redact them from logs, and never persist them by default.
- Add distributed rate limiting and abuse monitoring if multiple API instances are deployed.
- Test the final CSP against the selected API origin and OAuth callback origins.
