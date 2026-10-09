# MongoDB Collections

## Collections

### `users`

- `_id` MongoDB ObjectId, returned by the API as a string `id`
- `name`
- `email` unique, indexed
- `password_hash`
- `role`: `LEARNER`, `DEBATE_COACH`, `EDUCATOR`, `ADMINISTRATOR`
- `created_at`
- `updated_at`

### `profiles`

- `_id` MongoDB ObjectId, returned by the API as a string `id`
- `user_id` reference to `users._id`, unique
- `experience_level`
- `preferred_debate_topics`
- `presentation_domains`
- `learning_goals`
- `coaching_preferences`
- `created_at`
- `updated_at`

A user has at most one profile. The profile is created automatically during registration.

### `skills`

- `_id` MongoDB ObjectId, returned by the API as a string `id`
- `user_id` reference to `users._id`, unique
- `communication_score`
- `critical_thinking_score`
- `debate_score`
- `presentation_score`
- `created_at`
- `updated_at`

API validation enforces scores between 0 and 100.

### `debate_sessions`

- `_id` MongoDB ObjectId, returned by the API as a string `id`
- `topic`
- `description`
- `format`: `ONE_ON_ONE`, `PARLIAMENTARY`, `OXFORD`, `POLICY`, `PUBLIC_FORUM`, `AI_SIMULATION`
- `scheduled_at`
- `created_by` reference to `users._id`
- `status`: `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- `created_at`
- `updated_at`

### `debate_participants`

- `_id` MongoDB ObjectId, returned by the API as a string `id`
- `debate_id` reference to `debate_sessions._id`
- `user_id` reference to `users._id`
- `position`: `FOR`, `AGAINST`, `NEUTRAL`
- `joined_at`
- unique constraint on (`debate_id`, `user_id`)

## Text ER representation

```text
users 1 -------- 0..1 profiles
users 1 -------- 0..1 skills
users 1 -------- many debate_sessions (created_by)
users 1 -------- many debate_participants

debate_sessions 1 -------- many debate_participants
```

The backend creates unique indexes for emails, profiles, skills, and debate
participants in `backend/app/database/database.py`.
