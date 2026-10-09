# Week 1-2 Architecture

## Runtime flow

```text
React + React Router
        |
      Axios
        |
FastAPI REST API (/api)
        |
Authentication + role dependencies + service logic
        |
PyMongo database dependency
        |
MongoDB
```

The frontend keeps the JWT access token in browser storage for the current development milestone. Axios attaches it as a Bearer token to protected requests. FastAPI validates the token, loads the current user, and applies reusable role dependencies before the route reaches database logic.

## Authentication flow

1. `POST /api/auth/register` validates the request, hashes the password with Argon2, creates a user, profile, and initial skill record.
2. `POST /api/auth/login` verifies the password and returns a short-lived JWT plus safe user information.
3. Axios sends `Authorization: Bearer <token>` on protected requests.
4. `get_current_user` decodes the JWT, checks expiry, and loads the user from MongoDB.
5. Role dependencies return `403 Forbidden` when a role is not authorized.

The bearer dependency uses FastAPI's OAuth2-compatible security scheme, while the login body remains JSON-compatible with the existing React client. An OAuth2 provider can be added later without changing protected route dependencies.

## Core workflows

### Profile

`GET /api/profiles/me` loads only the authenticated user's profile. `PUT /api/profiles/me` updates that same record; no user id is accepted from the client.

### Skills

`GET /api/skills/me` and `PUT /api/skills/me` operate on the authenticated user's single skill record. Pydantic validation and database check constraints both enforce scores from 0 through 100.

### Debate creation

The authenticated user creates a scheduled session through `POST /api/debates`. The creator id is taken from the JWT, never from the request body. Creators and administrators can update or delete sessions.

### Debate joining

An authenticated user posts a position to `/api/debates/{id}/join`. Application-level reference checks and a unique compound index prevent invalid
or duplicate participation. Participants are returned with their safe public
user information.

## Deterministic debate analysis (Milestone 2)

`POST /api/debates/{id}/analysis` accepts a transcript and stores a generated
report in the `analysis_reports` MongoDB collection. The analysis service uses
sentence extraction and stable lexical rules for argument structure, evidence,
reasoning, seven supported fallacy categories, counterargument prompts, and a
weighted score. `GET` returns the latest report. Access is limited to debate
participants, the creator, and administrators; no external model or provider
is required.

## Extension boundary

Speech processing, presentation analytics, agents, retrieval, and richer model
recommendations can be added as services and routers without changing the
authentication or core domain boundaries.
