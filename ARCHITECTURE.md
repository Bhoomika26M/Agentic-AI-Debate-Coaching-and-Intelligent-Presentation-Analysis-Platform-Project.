# DebateAI — System Architecture & Multi-Agent Specification

## 1. High-Level Architectural Flow

```
[ User Microphone / Text Input ]
            │
            ▼
[ React 18 UI (Vite + Tailwind + Recharts) ]
            │  (REST API / JWT Auth)
            ▼
[ FastAPI Application Gateway ]
            │
  ┌─────────┴────────────────────────┐
  ▼                                  ▼
[ Multi-Agent Debate Engine ]     [ Presentation Analytics Engine ]
  ├─ 1. Topic Agent                ├─ Whisper Transcription
  ├─ 2. Argument Mining Agent       ├─ Words-Per-Minute (WPM) Pacing
  ├─ 3. Fallacy Detection Agent     ├─ Filler Word Detector
  ├─ 4. Counterargument Agent       ├─ Vocal Confidence Estimator
  ├─ 5. Challenge Agent             └─ Clarity & Signposting Scorer
  ├─ 6. Coaching Assistant Agent
  └─ 7. Weighted Scoring Agent
            │
  ┌─────────┴────────────────────────┐
  ▼                                  ▼
[ Relational DB (24 Tables) ]    [ Export Engine (PDF & Excel) ]
```

---

## 2. Multi-Agent Agentic Topology

DebateAI employs a modular multi-agent structure. Each agent possesses a dedicated schema, error handling, and deterministic fallback:

### Agent 1: Topic Agent (`topic_agent.py`)
* **Input**: Motion text, assigned position, format.
* **Responsibility**: Establishes ontological groundings, defines core terms, extracts primary stakeholder tensions, and identifies the dominant framework (Ethical vs. Empirical vs. Policy).

### Agent 2: Argument Mining Agent (`argument_agent.py`)
* **Input**: User speech transcript, current topic, stance.
* **Responsibility**: Separates assertions into Claims (Main, Sub-claims, Conclusions, Assumptions) and Evidence. Evaluates five 0–100 sub-scores: *Clarity, Relevance, Evidence Strength, Logical Consistency, and Persuasiveness*.

### Agent 3: Fallacy Detection Agent (`fallacy_agent.py`)
* **Input**: User argument text.
* **Responsibility**: Scans for 8 canonical fallacies:
  1. *Ad Hominem*
  2. *Straw Man*
  3. *False Dilemma*
  4. *Slippery Slope*
  5. *Appeal to Authority*
  6. *Circular Reasoning*
  7. *Hasty Generalization*
  8. *Red Herring*
* **Output**: Confidence score, flagged snippet, epistemic explanation, correct reasoning, and an exemplary improved statement.

### Agent 4: 5-Tier Counterargument Agent (`counterargument_agent.py`)
* **Input**: User contention, topic, opponent personality.
* **Responsibility**: Generates 5 structured angles of attack:
  1. *Logical Rebuttal* (attacks premises and causal validity)
  2. *Evidence-Based Rebuttal* (cites empirical counter-data)
  3. *Ethical Counterargument* (moral trade-offs, equity, justice)
  4. *Practical Counterargument* (cost, logistics, unintended consequences)
  5. *Policy Counterargument* (regulatory, institutional, enforcement friction)

### Agent 5: Real-Time Challenge Agent (`challenge_agent.py`)
* **Input**: Argument text, motion, difficulty level.
* **Responsibility**: Crafts dynamic Socratic questions, "What if?" edge-case scenarios, and demand for empirical citations.

### Agent 6: Coaching Assistant Agent (`coach_agent.py`)
* **Input**: Round transcripts, detected fallacies, criteria scores.
* **Responsibility**: Generates qualitative, actionable feedback: What you did well, target improvement area, strongest element, and next practice drill.

### Agent 7: Performance Scoring Agent (`scoring_agent.py`)
* **Formula**:
  $$\text{Debate Score} = 0.30 \times \text{Argument Quality} + 0.20 \times \text{Evidence Usage} + 0.20 \times \text{Logical Consistency} + 0.15 \times \text{Rebuttal Effectiveness} + 0.15 \times \text{Communication Skills}$$
* Strictly implements the project specification weights to total 100%.

---

## 3. Database Schema Design (24 Relational Entities)

1. `users`: Core account identity and hashed credentials.
2. `roles`: Role definitions (Learner, Coach, Educator, Admin).
3. `user_profiles`: Experience levels, domains, coaching preferences.
4. `skills`: 11 core competencies catalog.
5. `user_skills`: User skill scores and historical JSON logs.
6. `learning_goals`: Targeted milestones and progress tracking.
7. `debate_topics`: Catalog of resolutions and difficulties.
8. `debate_sessions`: Debate format, rounds, personality, status.
9. `debate_participants`: User or AI participant stance.
10. `debate_rounds`: Turn-by-turn speech transcripts.
11. `arguments`: Extracted argument units and 5-criteria scores.
12. `claims`: Structured claim classifications.
13. `evidence`: Empirical, statistical, and anecdotal evidence entries.
14. `fallacies`: Detected fallacy entries and remediation advice.
15. `counterarguments`: 5-tier rebuttals and strategic suggestions.
16. `debate_scores`: Weighted 30/20/20/15/15 debate scorecards.
17. `presentation_sessions`: Speech recordings and uploads metadata.
18. `presentation_metrics`: WPM, filler word counts, confidence, clarity.
19. `transcripts`: Full speech transcript text.
20. `coaching_feedback`: Qualitative feedback entries.
21. `learning_paths`: Adaptive weekly curriculum paths.
22. `learning_exercises`: Practice drills database.
23. `exercise_attempts`: Submissions and AI grades.
24. `notifications`: Platform alerts and reminders.
