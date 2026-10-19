# Agentic AI Debate Coach & Intelligent Presentation Analysis Platform

An AI-powered web application designed to help learners improve their debating, argumentation, critical thinking, and presentation skills through intelligent feedback and personalized coaching.

## Overview

The **Agentic AI Debate Coach & Intelligent Presentation Analysis Platform** provides an interactive environment where learners can practice debates, analyze arguments, explore counterarguments, and improve their presentation skills.

The platform integrates generative AI with a structured web application to provide feedback on argument quality, evidence, logical reasoning, rebuttals, and communication.

It uses **Google Gemini as the primary AI provider** and supports **NVIDIA NIM as a fallback provider** when Gemini encounters supported availability or rate-limit errors.

The application uses PostgreSQL for persistent data storage and provides role-based access for learners, debate coaches, educators, and administrators.

## Key Features

### 1. AI-Powered Debate Coaching
- Practice debates on different topics.
- Receive AI-generated feedback on arguments and reasoning.
- Explore possible counterarguments and rebuttals.
- Identify weaknesses in arguments and improve debate strategies.
- Support multiple debate formats.

### 2. Multiple Debate Formats
The platform is designed to support the following formats:

- One-on-One Debate
- Oxford-Style Debate
- Parliamentary Debate
- Policy Debate
- Public Forum Debate
- AI-Simulated Debate

### 3. Argument and Fallacy Analysis
- Analyze the structure and clarity of arguments.
- Identify potential logical fallacies.
- Evaluate reasoning and supporting evidence.
- Generate suggestions for improving argument quality.

### 4. AI Opponent and Counterarguments
- Practice against an AI-generated opposing viewpoint.
- Explore alternative perspectives.
- Generate counterarguments to strengthen critical thinking.
- Practice responding to opposing arguments.

### 5. Presentation Analysis
- Analyze presentation content.
- Receive structured feedback and improvement suggestions.
- Evaluate communication and logical organization.
- Support presentation practice workflows implemented in the application.

### 6. Role-Based Dashboards
The application provides role-specific functionality for:

- **Learner:** Practice debates and review learning feedback.
- **Debate Coach:** Support learners and review debate-related information.
- **Educator:** Access educational and learner-related information.
- **Administrator:** Manage administrative information and platform users.

Available actions depend on the user's role and the features implemented in the application.

### 7. Structured Performance Evaluation

The platform uses the following weighted evaluation model:

| Evaluation Criterion | Weight |
|---|---:|
| Argument Quality | 30% |
| Evidence | 20% |
| Logical Reasoning | 20% |
| Rebuttal | 15% |
| Communication | 15% |
| **Total** | **100%** |

These weights provide a structured framework for reviewing debate performance. AI-generated scores and feedback should be treated as coaching guidance rather than definitive judgments.

### 8. Data Visualization and Reports
- Dashboard-based presentation of performance information.
- Visual summaries of relevant evaluation metrics.
- Report generation and export capabilities where implemented.

### 9. AI Provider Resilience
- Google Gemini is the primary AI provider.
- NVIDIA NIM provides a secondary text-generation path for supported Gemini availability and rate-limit failures.
- API credentials are configured on the backend.
- Provider errors can be handled without exposing API keys to the frontend.


## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript |
| Frontend build tool | Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM and database access | SQLAlchemy |
| Database migrations | Alembic |
| Authentication | JWT-based authentication |
| Primary AI provider | Google Gemini |
| Secondary AI provider | NVIDIA NIM |
| NVIDIA API integration | OpenAI-compatible Python client |
| Data visualization | Recharts |
| Backend testing | pytest |
| API communication | REST APIs |

## Prerequisites

Install the following software before running the application:

- Python 3.10 or a compatible version supported by the project dependencies.
- Node.js and npm.
- PostgreSQL.
- Git.
- API credentials for the AI provider or providers you intend to use.

The application is designed to run locally on Windows and does not require Docker or a local GPU for the normal application workflow.

## Installation and Setup

The commands below use Windows PowerShell.

### Step 1: Clone the repository

Clone the repository and enter the project directory.

```powershell
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

Replace the placeholders with the actual repository URL and folder name.

If you already have the repository on your computer, open PowerShell in its root directory instead.

### Step 2: Configure PostgreSQL

Open PostgreSQL using pgAdmin or the PostgreSQL command-line tools.

Create the application database and database user if they do not already exist.

Example SQL:

```sql
CREATE USER debate_user WITH PASSWORD 'YOUR_DATABASE_PASSWORD';

CREATE DATABASE debate_coach_db OWNER debate_user;
```

If the user or database already exists, do not create it again. Configure the existing database as appropriate.

The backend connection string follows this format:

```text
postgresql+psycopg2://debate_user:YOUR_DATABASE_PASSWORD@localhost:5432/debate_coach_db
```

Replace `YOUR_DATABASE_PASSWORD` with your actual local database password.

### Step 3: Configure backend environment variables

Open a PowerShell terminal in the project root and enter the backend directory.

```powershell
cd backend
```

Create a local environment file by copying the example:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and update the configuration:

```dotenv
DATABASE_URL=postgresql+psycopg2://debate_user:YOUR_DATABASE_PASSWORD@localhost:5432/debate_coach_db

JWT_SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash

NVIDIA_API_KEY=YOUR_NVIDIA_API_KEY
NVIDIA_TEXT_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b

FRONTEND_ORIGIN=http://localhost:5173
```

### Step 4: Create a Python virtual environment

From the `backend` directory:

```powershell
python -m venv venv
```

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks script activation, you can use the virtual environment's Python executable directly in the commands below.

### Step 5: Install backend dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

These commands install the backend dependencies, including the packages required for the configured AI integrations.

### Step 6: Run database migrations

With the PostgreSQL service running and `DATABASE_URL` configured, run:

```powershell
alembic upgrade head
```

This applies the available Alembic migrations to the configured database.

If the migration fails, verify the database name, credentials, connection string, and PostgreSQL service before proceeding.

### Step 7: Start the backend server

From the `backend` directory:

```powershell
uvicorn app.main:app --reload
```

The backend should be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

Keep this terminal open while using the application.

### Step 8: Install frontend dependencies

Open a **second PowerShell terminal** in the project root.

```powershell
cd frontend
npm ci
```

`npm ci` installs dependencies using the project's lockfile.

### Step 9: Start the frontend

```powershell
npm run dev
```

Open the local address displayed by Vite, typically:

`http://localhost:5173`

Keep both the backend and frontend terminals running while using the application.

---

## AI Provider Configuration

### Google Gemini — Primary Provider

Gemini is the primary generative AI service used by the platform.

Its configured model is controlled by:

```dotenv
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash
```

Model availability, quotas, and pricing depend on Google's current policies and the account being used.

### NVIDIA NIM — Fallback Provider

The application includes an NVIDIA text-generation service using an OpenAI-compatible API client.

Its configuration is controlled by:

```dotenv
NVIDIA_API_KEY=YOUR_NVIDIA_API_KEY
NVIDIA_TEXT_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
```

The fallback integration is intended to provide a secondary generation path when the primary provider encounters supported availability or rate-limit errors.

Before using the fallback in a demonstration, verify:

1. The NVIDIA API key is valid.
2. The configured model is accessible to your account.
3. The NVIDIA service is reachable.
4. The backend's fallback path works for the specific AI operation being demonstrated.

An available API key does not guarantee that every model or request will succeed.

## Testing

### Run backend tests

From the `backend` directory:

```powershell
python -m pytest -q
```

The tests should complete successfully before the project is demonstrated or submitted.

The backend test suite has previously completed with **9 passed tests** in the development environment. Run the tests again after making changes to confirm the current result.

### Build the frontend

From the `frontend` directory:

```powershell
npm run build
```

Vite generates the production build in the `frontend/dist` directory.

A large-bundle warning may appear during the build. It does not necessarily indicate a failed build, but the bundle can be optimized later through code splitting and lazy loading.


