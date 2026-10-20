# Agentic AI Debate Coach & Presentation Analysis Platform (DebateIQ)

An enterprise-grade, college-level full-stack AI platform built to train users in competitive debating, public speaking, argument construction, logical reasoning, and presentation slide design.

---

## Key Features

1. **Pluggable AI Service Layer**: Abstract provider design (`BaseAIService`) supporting **Gemini API** with rigid Pydantic structured output validation, alongside deterministic **MockAIService** for offline testing.
2. **Toulmin Argument Decomposition**: Dissects arguments into Claim, Grounds, Warrant, and Qualifiers with formal rubric scoring (Logic, Evidence, Persuasiveness, Clarity).
3. **20+ Logical Fallacy Detector**: Automatically spots informal and formal fallacies (Slippery Slope, False Dilemma, Straw Man, Ad Hominem, Circular Reasoning) with excerpt pinpointing and fix suggestions.
4. **Interactive AI Debate Opponent Arena**: Real-time multi-turn debate simulation with adjustable styles (Oxford Parliamentary, Lincoln-Douglas) and Socratic opponent personas. Supports Web Speech API for voice input.
5. **Speech & Verbal Cadence Studio**: Analyzes speaking pace (Words Per Minute), detects filler words ("um", "like", "basically"), and critiques verbal articulation.
6. **Presentation Slide Deck Analyzer**: Upload PDF slide decks to evaluate text density, visual hierarchy, bullet-point overload, and clarity.
7. **Longitudinal Skill Tracking & Analytics**: Interactive Recharts Radar charts, progress trajectory lines, and fallacy frequency breakdowns.
8. **Role-Based Access Control (RBAC)**: Custom workflows for **Learners**, **Debate Coaches**, **Educators**, and **Administrators**.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Axios, Recharts, Lucide Icons.
- **Backend**: Python 3.14, Django 6, Django REST Framework, SimpleJWT, Pydantic, PyPDF, django-cors-headers.
- **AI**: Google Gemini API (`google-genai` SDK) with structured JSON schemas.

---

## Quickstart Guide

### 1. Backend Setup

```bash
cd backend

# Virtual environment is already created at ../venv
# Activate virtual environment (Windows PowerShell)
..\venv\Scripts\Activate.ps1

# Run migrations (already initialized)
python manage.py migrate

# Seed sample users and collegiate debate topics
python seed_data.py

# Run backend development server
python manage.py runserver 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173` and communicate with `http://localhost:8000/api/v1`.

---

## Pre-Seeded Demonstration Accounts

All accounts share the password: `password123` (Admin: `adminpassword123`):

| Role | Username | Password |
| :--- | :--- | :--- |
| **Learner** | `alex_debater` | `password123` |
| **Debate Coach** | `sarah_coach` | `password123` |
| **Educator** | `prof_harrison` | `password123` |
| **Administrator** | `admin` | `adminpassword123` |

---

## Testing

Run the automated backend test suite:

```bash
cd backend
..\venv\Scripts\python.exe manage.py test
```
