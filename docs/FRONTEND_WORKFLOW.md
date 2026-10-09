# Frontend Workflow

The current React workflow is:

```text
REGISTER
  -> LOGIN
  -> DASHBOARD
  -> PROFILE
  -> SKILLS
  -> DEBATES
  -> CREATE DEBATE
  -> DEBATE DETAILS
  -> JOIN DEBATE
```

Public routes are `/login` and `/register`. All workspace routes are protected by `ProtectedRoute`; missing or invalid authentication redirects to `/login`.

## Role navigation

- `LEARNER`: Dashboard, Profile, My Skills, Debates
- `DEBATE_COACH`: Dashboard, Profile, Debates, Students
- `EDUCATOR`: Dashboard, Profile, Class Debates, Students
- `ADMINISTRATOR`: Dashboard, Profile, Platform Debates, Users

Navigation is role-aware, but the backend remains the authority. The API independently enforces current-user ownership and administrator permissions.

## API services

- `services/api.js`: Axios client, base URL, Bearer token, common error messages
- `services/auth.js`: registration, login, current user
- `services/profile.js`: user and profile requests
- `services/skills.js`: skill retrieval and update
- `services/debates.js`: debate CRUD, joining, and participants

All API-driven pages render loading, error, and empty states. AI insights and analytics are intentionally absent from this milestone.
