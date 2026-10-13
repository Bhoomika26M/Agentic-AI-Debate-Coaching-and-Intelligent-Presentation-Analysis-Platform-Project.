# Agentic AI Debate Coaching and Intelligent Presentation Analysis Platform

**DebateIQ** is a web-based debate coaching platform designed to help users analyze arguments, identify possible logical fallacies, generate rebuttals, and improve presentation scripts. It combines a React frontend with a FastAPI backend to provide an interactive coaching workspace.

The current version implements three core features using rule-based text processing and predefined response strategies. It establishes the foundation for future integration with large language models and more advanced presentation analysis.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [API Endpoints](#api-endpoints)
- [Running Automated Tests](#running-automated-tests)
- [Current Limitations](#current-limitations)
- [Future Enhancements](#future-enhancements)

## Project Overview

DebateIQ provides a unified workspace for developing critical thinking and communication skills. Users can submit written arguments for analysis, receive rebuttals to opposing claims, and evaluate presentation scripts using basic linguistic indicators.

The system currently uses Python-based rules and text patterns to process input and return structured results through REST API endpoints. The React frontend presents these results in an interactive dashboard.

## Features

### 1. Argument Analysis

The Argument Analysis module evaluates written arguments using rule-based text processing.

**Implemented functionality:**
- Extracts the main claim and potential supporting reasons.
- Detects selected logical fallacies using predefined patterns.
- Identifies Ad Hominem, Bandwagon Fallacy, Slippery Slope, and False Dilemma patterns.
- Counts sentences.
- Returns feedback about supporting reasons and reasoning.
- Displays possible fallacies with their names, explanations, and evidence.

**Endpoint:** `POST /api/v1/arguments/analyze`

### 2. Rebuttal Generator

The Rebuttal Generator produces responses to opposing arguments using predefined rules and templates.

**Implemented functionality:**
- Accepts an opposing argument as input.
- Recognizes selected argument patterns.
- Provides a context-specific response for certain school-timing arguments.
- Handles selected popularity-based claims and personal attacks.
- Examines arguments containing explicit reason connectors such as "because" and "since".
- Uses a general evidence-based response for other arguments.
- Returns the original argument, generated rebuttal, strategy, and limitations.

**Endpoint:** `POST /api/v1/rebuttals/generate`

### 3. Presentation Coach

The Presentation Coach evaluates written presentation scripts using simple, rule-based metrics.

**Implemented functionality:**
- Counts words and sentences.
- Estimates speaking time using a rate of approximately 130 words per minute.
- Detects selected filler words and phrases, including "um", "uh", "basically", "actually", and "you know".
- Calculates a heuristic presentation score out of 100.
- Explains score deductions.
- Provides feedback on script length, sentence length, filler words, and organization.
- Displays the score using a visual progress meter.

**Endpoint:** `POST /api/v1/presentations/analyze`

The score is an experimental heuristic, not a validated measure of presentation quality.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend development server | Vite |
| Frontend language | JavaScript with JSX |
| Backend | Python |
| Web framework | FastAPI |
| API request validation | Pydantic |
| Backend server | Uvicorn |
| Automated testing | Pytest |
| Version control | Git |
| Remote repository | GitHub |

## System Architecture

The platform follows a frontend-backend architecture.

1. **Frontend:** React provides the DebateIQ dashboard, input forms, feature navigation, loading indicators, error messages, and formatted results.
2. **API layer:** FastAPI exposes endpoints for argument analysis, rebuttal generation, and presentation analysis.
3. **Service layer:** Python service modules process the submitted text using rules, pattern matching, and predefined templates.
4. **Response layer:** The backend returns structured JSON data that the frontend renders as results.

### Request Flow

```text
User
  |
  v
React Frontend (Vite)
  |
  | HTTP POST / JSON
  v
FastAPI Backend
  |
  +---- Argument Analysis API
  |          |
  |          v
  |    Argument Analyzer
  |
  +---- Rebuttal API
  |          |
  |          v
  |    Rebuttal Generator
  |
  +---- Presentation API
             |
             v
       Presentation Analyzer
  |
  v
Structured JSON Response
  |
  v
React Results Dashboard
```

## Project Structure

```text
debate-coach/
|
+-- backend/
|   |
|   +-- app/
|   |   |
|   |   +-- api/
|   |   |   +-- arguments.py
|   |   |   +-- rebuttals.py
|   |   |   +-- presentations.py
|   |   |
|   |   +-- services/
|   |   |   +-- argument_analyzer.py
|   |   |   +-- rebuttal_generator.py
|   |   |   +-- presentation_analyzer.py
|   |   |
|   |   +-- main.py
|   |
|   +-- tests/
|       +-- test_services.py
|
+-- frontend/
|   |
|   +-- public/
|   +-- src/
|   |   +-- assets/
|   |   +-- App.jsx
|   |   +-- App.css
|   |   +-- index.css
|   |   +-- main.jsx
|   |
|   +-- index.html
|   +-- package.json
|   +-- package-lock.json
|   +-- vite.config.js
|
+-- .gitignore
+-- README.md
```

The `.venv/` directory contains the local Python virtual environment and is excluded from version control.

## Prerequisites

Install the following software before running the project:

- Python 3.12 or a compatible supported Python version.
- Node.js and npm.
- Git.
- Visual Studio Code or another code editor.

## Installation and Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd debate-coach
```

Use the repository URL provided by your project owner. The development branch used for the current implementation is `Olivia`.

### 2. Set up the backend

From the project root, run the following commands in Windows Command Prompt:

```cmd
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install fastapi uvicorn pytest
```

If the environment already exists, activate it rather than recreating it.

### 3. Start the backend server

From the project root, run:

```cmd
python -m uvicorn app.main:app --reload --app-dir backend
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/health
```

Keep the backend terminal running while using the frontend.

### 4. Set up the frontend

Open a second terminal and navigate to the frontend directory:

```cmd
cd C:\debate-coach\frontend
npm install
npm run dev
```

Vite will display the local development URL, typically:

```text
http://localhost:5173/
```

Open the URL printed in your terminal.

The frontend currently sends API requests to `http://127.0.0.1:8000`. Ensure the backend is running and its CORS settings permit the frontend origin.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API welcome message and status |
| GET | `/health` | Backend health check |
| GET | `/api/v1/features` | Lists the platform features |
| POST | `/api/v1/arguments/analyze` | Analyzes a written argument |
| POST | `/api/v1/rebuttals/generate` | Generates a rebuttal |
| POST | `/api/v1/presentations/analyze` | Analyzes a presentation script |

### Example: Argument Analysis

**Request**

```json
{
  "text": "Schools should start later because students need enough sleep to concentrate and learn effectively."
}
```

**Example response structure**

```json
{
  "claim": "Schools should start later",
  "supporting_reasons": [
    "students need enough sleep to concentrate and learn effectively."
  ],
  "possible_fallacies": [],
  "sentence_count": 1,
  "feedback": "The text contains possible supporting reasons. Check whether they are relevant and backed by evidence.",
  "analysis_method": "rule_based",
  "limitations": "This initial version uses simple text patterns and may miss fallacies or flag statements incorrectly."
}
```

### Example: Rebuttal Generation

**Request**

```json
{
  "argument": "Schools should start early because students need more time in the afternoon for other activities."
}
```

The response includes the original argument, a generated rebuttal, the selected strategy, and a description of the generator's limitations.

### Example: Presentation Analysis

**Request**

```json
{
  "text": "Good morning everyone. Basically, cybersecurity protects our computers and personal information."
}
```

The response includes word count, sentence count, estimated speaking time, detected filler words, presentation score, score notes, feedback, analysis method, and limitations.

All POST endpoints can be tested interactively through the Swagger UI at `/docs`.

## Running Automated Tests

The backend service tests are located in `backend/tests/test_services.py`.

With the project virtual environment activated, run this command from the repository root:

```cmd
python -m pytest backend\tests\test_services.py -v
```

The current test suite contains six tests covering:

1. Claim and supporting-reason extraction.
2. Ad Hominem fallacy detection.
3. Context-specific rebuttal generation.
4. Empty rebuttal input handling.
5. Presentation scoring and filler-word detection.
6. Empty presentation input handling.

**Current test status:** All 6 tests passed in the latest recorded run.

## Current Limitations

- **Rule-based processing:** Argument analysis relies on predefined text patterns and can miss fallacies or incorrectly flag statements.
- **Template-based rebuttals:** Rebuttal quality is limited by predefined rules and response templates. It does not yet use a connected large language model.
- **Text-only presentation analysis:** The Presentation Coach analyzes written scripts rather than audio or video recordings.
- **Heuristic scoring:** The presentation score is based on script length, average sentence length, and detected filler words. It is not a validated presentation-quality score.
- **Estimated speaking time:** Actual speaking speed may differ from the assumed rate of 130 words per minute.
- **Limited personalization:** User accounts, saved coaching sessions, persistent user history, and personalized learning profiles have not yet been implemented.

## Future Enhancements

Potential improvements include:

- Integrating a large language model for deeper argument evaluation and more nuanced rebuttals.
- Expanding fallacy detection and supporting-reason extraction.
- Adding audio-based speech analysis, pronunciation feedback, and delivery assessment.
- Developing more comprehensive presentation evaluation and progress tracking.
- Adding user authentication, saved sessions, and personalized coaching.
- Expanding automated test coverage and validating API behavior.
- Improving error handling, deployment configuration, and production readiness.

These are planned enhancements and are not represented as completed functionality in the current version.

## Development Status

The current implementation includes a React frontend, a FastAPI backend, three working feature paths, and a basic automated service-test suite.

- Argument Analysis: Implemented.
- Rebuttal Generator: Implemented using rules and templates.
- Presentation Coach: Implemented for written scripts.
- Automated tests: 6 passing.
- Version control: Changes committed and pushed to the `Olivia` development branch.

The platform remains under active development, with real AI integration and advanced speech and presentation analysis identified as future enhancements.

---

**Project:** Agentic AI Debate Coaching and Intelligent Presentation Analysis Platform  
**Interface:** DebateIQ  
**Development branch:** `Olivia`
