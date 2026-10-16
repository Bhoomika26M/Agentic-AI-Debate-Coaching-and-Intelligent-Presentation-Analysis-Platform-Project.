# DebateIQ: User Guide & Feature Manual

## 1. Demo User Personas
The platform is pre-seeded with 4 distinct personas (Password for all: `password123`):

| Persona | Email | Role | Focus & Responsibilities |
|---|---|---|---|
| **Alex Rivera** | `learner@debateiq.ai` | **Learner** | Practicing competitive debate, XP progression, AI sparring, fallacy elimination. |
| **Dr. Marcus Vance** | `coach@debateiq.ai` | **Debate Coach** | Reviewing student performance, recalibrating skill scores, managing tournaments. |
| **Prof. Elena Rostova** | `educator@debateiq.ai` | **Educator** | Class analytics, cohort rankings, curriculum debate resolution management. |
| **System Admin** | `admin@debateiq.ai` | **Administrator** | User role promotion, system telemetry, AI provider gateway management. |

---

## 2. Core Feature Walkthroughs

### 1. Debate Arena (Live AI Opponent Sparring)
- **Split-View Arena**: Proposition (blue) vs. Opposition (rose) side-by-side view.
- **Turn Timer Ring**: Visual countdown for formal debate rounds.
- **Dynamic Momentum Bar**: Visual meter showing real-time dialectical advantage based on argument strength.
- **AI Opponent Selector**: Choose difficulty (*Beginner, Intermediate, Expert*) and persona (*Logical Professor, Aggressive Politician, Socratic Questioner*).
- **Coach Whisper Panel**: Live tactical prompts and refutation hints given during the match.
- **Speech Input**: Type speech text or click the mic button to capture your speech via the browser's Web Speech API.

### 2. Argument Lab & "Argument X-Ray"
- Input any debate contention or speech paragraph.
- Click **Analyze Argument Structure** to activate the **Argument X-Ray**:
  - Highlights Claims, Premises, and Evidence in distinct semantic colors.
  - Generates an interactive argument tree graph.
  - Scores the argument across the 5 rubric criteria (Clarity, Relevance, Evidence Strength, Logical Consistency, Persuasiveness).

### 3. Logical Fallacy Detection & Defense
- Scans text for the 8 canonical fallacies: *Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring*.
- Inline highlighting with color-coded tooltips.
- Plain-language explanation of the inferential error.
- Actionable guided rewrite demonstrating how to articulate the argument objectively.
- Credibility rating penalty deduction.

### 4. Counterargument Matrix (5 Strategic Tabs)
Switch between 5 strategic rebuttal angles against any contention:
1. **Logical Rebuttal**: Attacking false syllogisms and deductive leaps.
2. **Evidence-Based Rebuttal**: Countering with empirical studies and statistical variance.
3. **Ethical Rebuttal**: Analyzing moral duties, human rights, and utilitarian impacts.
4. **Practical Rebuttal**: Exposing implementation hurdles and cost overruns.
5. **Policy Rebuttal**: Presenting alternative policy counterplans.

### 5. Role-Specific Dashboards
- **Learner Dashboard**: Skill radar chart, XP level, badges, streak counter, debate history, improvement trend lines, and recommended drills.
- **Coach Dashboard**: Student cohort progress monitoring, rubric evaluations, skill gap matrix.
- **Educator Dashboard**: Class-wide analytics, distribution percentiles, debate assignments.
- **Admin Dashboard**: Active sessions, user management, LLM provider routing and usage statistics.
