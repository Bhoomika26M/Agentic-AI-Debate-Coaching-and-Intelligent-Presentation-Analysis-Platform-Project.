# DebateAI — REST API Reference

Base API Path: `/api/v1`

---

## 1. Authentication & User Profile

### `POST /auth/register`
* **Request**:
  ```json
  {
    "email": "learner@debateai.com",
    "password": "Password123!",
    "confirm_password": "Password123!",
    "full_name": "Alex Rivera",
    "experience_level": "Beginner",
    "role": "learner"
  }
  ```
* **Response**: Returns JWT `access_token`, `refresh_token`, and user metadata.

### `POST /auth/login`
* **Request**:
  ```json
  {
    "email": "learner@debateai.com",
    "password": "Password123!"
  }
  ```
* **Response**: Returns JWT token pair.

### `GET /auth/me`
* **Headers**: `Authorization: Bearer <token>`
* **Response**: Authenticated user identity and profile.

### `PUT /auth/me`
* **Request**: Updates user profile preferences, learning goals, and bio.

---

## 2. Debate Simulation & Argument Mining

### `POST /debates`
* **Request**:
  ```json
  {
    "topic": "Should artificial intelligence replace traditional education?",
    "position": "For",
    "format": "Oxford Debate",
    "difficulty": "Intermediate",
    "duration_minutes": 10,
    "ai_opponent_personality": "Analytical",
    "rounds_count": 3
  }
  ```
* **Response**: Creates session, generates initial opening argument from AI opponent.

### `GET /debates/{id}`
* Returns debate session details, all rounds, speech transcripts, arguments, fallacies, counterarguments, and scores.

### `POST /debates/{id}/rounds`
* **Request**:
  ```json
  {
    "argument_text": "AI personalizes pacing to each student's unique cognitive profile."
  }
  ```
* **Response**: Runs the 7-agent pipeline. Returns AI opponent speech, fallacy warnings, 5-tier rebuttals, real-time coaching feedback, and current round score.

### `POST /debates/{id}/end`
* Concludes session, computes aggregate 30/20/20/15/15 weighted scores, and returns scorecard.

---

## 3. Presentation & Speech Analytics

### `POST /presentation/upload`
* Accepts audio/video `multipart/form-data`.
* Extracts speech, measures WPM, detects filler words (`um`, `like`, `basically`), and estimates vocal confidence.

### `POST /presentation/analyze`
* **Request**:
  ```json
  {
    "title": "Clean Energy Keynote",
    "transcript_text": "Good morning everyone. Um, today I want to present...",
    "duration_seconds": 120.0
  }
  ```
* **Response**: Words per minute, pace classification, filler breakdown, confidence score, clarity score, engagement score, timeline pacing.

---

## 4. Reports & Export Engine

### `GET /reports/debate/{id}`
* Returns aggregated scorecard and coaching recommendations.

### `POST /reports/export/pdf`
* Streams binary PDF report (`application/pdf`).

### `POST /reports/export/excel`
* Streams multi-sheet `.xlsx` workbook (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

---

## 5. Health Check

### `GET /health`
* **Response**:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "ai_service": "available"
  }
  ```
