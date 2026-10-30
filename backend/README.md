# Debate Coach & Presentation Intelligence Backend

FastAPI backend powered by Python 3.11+, SQLAlchemy 2.0, Alembic migrations, JWT authentication, and multimodal Google Gemini integrations for the **Agentic AI Debate Coach & Presentation Analysis Platform** (Infosys Springboard Internship Project).

---

## Key Features & Services

- **Authentication & Access Control**: Simple learner registration defaulting automatically and securely to `learner`; client privilege escalation prevented; JWT bearer tokens (HS256) guarding endpoints with internal administrative authorization.
- **Debate Sparring Service**: Turn-ordered multi-turn debate simulation with automated AI opponent generation and idempotency protection.
- **Argument & Fallacy Engine**: Detection of 8 formal/informal fallacies and 5-dimensional counterargument generation (*Logical, Empirical, Ethical, Practical, Policy*).
- **Speech & Presentation Analytics**: Direct audio processing via `gemini-3.5-transcribe` with auto-calculated Words Per Minute (WPM), filler disfluency counters, acoustic duration, and an in-place retry engine (`POST /presentations/{id}/retry`).
- **5-Category Weighted Rubric**: Evaluates Argument Quality (30%), Evidence (20%), Logic (20%), Rebuttals (15%), and Clarity (15%).
- **Proprietary Export Engine**: Pure-Python binary PDF-1.4 generator and Microsoft Excel SpreadsheetML XML exporter without external binary dependencies.
- **Security Hardening**: Header-authenticated LLM requests (`x-goog-api-key`) with multi-layer credential and error message sanitization.

---

## Quickstart

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## Database Configuration

- **SQLite (Default for Local Development)**:
  ```env
  DATABASE_URL=sqlite:///./debate_coach.db
  ```
  The server automatically verifies table schemas and legacy compatibility on startup.

- **PostgreSQL (Production / Staging)**:
  ```env
  DATABASE_URL=postgresql://postgres:password@localhost:5432/debate_coach
  ```

---

## Running Database Migrations

```powershell
alembic current
alembic upgrade head
```

---

## Running the Automated Test Suite

From the `backend` directory:

```powershell
$env:PYTHONPATH="."
pytest tests -v
```

The test suite (49 tests) covers:
- Registration with default learner role and privilege escalation prevention
- User authentication, JWT expiration, and password strength
- Competency performance scoring (null defaults, zero score fabrication, audio modality isolation)
- Argument analysis and claim extraction
- 8-type logical fallacy detection
- 5-type counterargument generation engine
- AI opponent turn serialization, deduplication, and retry logic
- 5-weight rubric scoring mathematics
- Presentation audio duration and speaking rate calculation
- In-place retry logic for presentation records
- Binary PDF-1.4 and Excel SpreadsheetML export generation
- Access control enforcement and administrative permissions
