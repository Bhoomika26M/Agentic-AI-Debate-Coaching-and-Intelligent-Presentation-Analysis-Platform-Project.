"""
Coaching Knowledge Base & Curriculum Data
==========================================
Provides the debate skill taxonomy, weekly study syllabi, and exercise drill library.
Covers 5 core debate competency areas:
1. Argument Quality (30% weight)
2. Evidence Usage (20% weight)
3. Logical Consistency (20% weight)
4. Rebuttal Effectiveness (15% weight)
5. Communication Skills (15% weight)
"""

# ── Skill taxonomy ─────────────────────────────────────────────────────────────

SKILL_AREAS = {
    "argument_quality": {
        "label": "Argument Quality",
        "description": "Constructing logically sound, well-structured arguments",
        "weight": 0.30,
        "exercises": [
            "Toulmin Model Exercise: For each claim, explicitly map the data → warrant → backing chain.",
            "Steelmanning Drill: Write the strongest possible version of an opposing argument before rebutting.",
            "Premise Audit: List all premises in your argument and verify each one independently.",
            "3-Point Speech: Practice limiting every speech to exactly three supporting arguments, each fully developed.",
        ],
        "resources": [
            "Read: 'The Art of Argument' by Aaron Larsen",
            "Practice: Write a 3-minute speech on a random topic daily",
            "Watch: TED Talks by expert debaters and analyse argument structure",
        ]
    },
    "evidence_usage": {
        "label": "Evidence Usage",
        "description": "Integrating and citing credible evidence effectively",
        "weight": 0.20,
        "exercises": [
            "Evidence File Building: Maintain a research database of 3 evidence cards per debate topic.",
            "Source Credibility Ranking: For each piece of evidence, rate it on a 1-5 credibility scale and explain why.",
            "Statistic Handling: Practice presenting statistics with full context, sample size, and methodology.",
            "Anecdote vs. Data Drill: Identify when an anecdote suffices and when statistical evidence is required.",
        ],
        "resources": [
            "Use Google Scholar and Semantic Scholar for peer-reviewed sources",
            "Learn APA/MLA citation formats for debate contexts",
            "Practice evaluating source credibility using SIFT framework",
        ]
    },
    "logical_consistency": {
        "label": "Logical Consistency",
        "description": "Maintaining coherent reasoning without internal contradictions",
        "weight": 0.20,
        "exercises": [
            "Fallacy Hunt: Analyse 5 political speeches per week and identify all logical fallacies.",
            "Deductive Validity Test: Convert your arguments to formal if-then structures and test for validity.",
            "Contradiction Check: Have a partner find internal contradictions in your speeches.",
            "Syllogism Practice: Build formal syllogisms for your three main arguments before each debate.",
        ],
        "resources": [
            "Study: Introduction to Logic by Irving M. Copi",
            "Online: Khan Academy — Logical Reasoning module",
            "Tool: Use argument mapping software like Rationale or Kialo",
        ]
    },
    "rebuttal_effectiveness": {
        "label": "Rebuttal Effectiveness",
        "description": "Directly engaging and dismantling opponent arguments",
        "weight": 0.15,
        "exercises": [
            "4-Step Rebuttal Framework: (1) Identify → (2) Question → (3) Counter → (4) Impact. Drill this structure.",
            "Speed Rebuttal: Listen to a 2-minute argument and prepare a rebuttal in under 30 seconds.",
            "Clash Mapping: After each practice round, map every argument raised to its rebuttal — find unaddressed clashes.",
            "Concession Practice: Identify which parts of an opponent's argument you can concede strategically without losing ground.",
        ],
        "resources": [
            "Study British Parliamentary rebuttal structures",
            "Watch World Schools Debate championship rebuttals",
        ]
    },
    "communication_skills": {
        "label": "Communication Skills",
        "description": "Delivery, clarity, persuasion, and engagement",
        "weight": 0.15,
        "exercises": [
            "Pause Training: Record yourself and count filler words (um, uh, like). Eliminate by using deliberate pauses.",
            "Vocal Variety Drill: Practice the same paragraph at 3 different speeds, volumes, and tones.",
            "Eye Contact Exercise: Practise focusing 30% of time on each zone of a three-section audience.",
            "Power Opening Workshop: Draft 5 different openers (question, statistic, story, bold claim, quotation) for the same motion.",
        ],
        "resources": [
            "Read: 'Talk Like TED' by Carmine Gallo",
            "Practice: Toastmasters International sessions",
            "Record and self-evaluate 5 minutes of speaking daily",
        ]
    },
}

# ── Learning plan templates ────────────────────────────────────────────────────

WEEKLY_PLANS = {
    "beginner": [
        {"week": 1, "focus": "Argument Structure Fundamentals", "goal": "Understand Claim-Warrant-Impact framework", "daily_practice": "20 mins"},
        {"week": 2, "focus": "Evidence Research & Citation", "goal": "Build a 10-card evidence file on a chosen topic", "daily_practice": "25 mins"},
        {"week": 3, "focus": "Fallacy Detection", "goal": "Identify all 8 fallacies in sample speeches", "daily_practice": "20 mins"},
        {"week": 4, "focus": "Basic Rebuttals", "goal": "Complete 5 rebuttal exercises using 4-step framework", "daily_practice": "30 mins"},
    ],
    "intermediate": [
        {"week": 1, "focus": "Advanced Argument Mapping", "goal": "Map full debate flows for 3 complex topics", "daily_practice": "30 mins"},
        {"week": 2, "focus": "Speed & Pressure Rebuttals", "goal": "Complete 10 timed rebuttal drills under 45 seconds", "daily_practice": "30 mins"},
        {"week": 3, "focus": "Stakeholder Analysis & Framing", "goal": "Develop 3 framing strategies per debate topic", "daily_practice": "35 mins"},
        {"week": 4, "focus": "Crystallisation & Summary Speeches", "goal": "Deliver 5 polished 2-minute summaries", "daily_practice": "40 mins"},
    ],
    "advanced": [
        {"week": 1, "focus": "Strategic Case Construction", "goal": "Build tournament-level case files for 5 topics", "daily_practice": "45 mins"},
        {"week": 2, "focus": "Cross-Examination & POIs", "goal": "Master Point of Information strategy in 10 simulations", "daily_practice": "45 mins"},
        {"week": 3, "focus": "Adjudication Mindset", "goal": "Adjudicate 5 practice debates and write detailed ballots", "daily_practice": "60 mins"},
        {"week": 4, "focus": "Tournament Preparation", "goal": "Simulate full 6-round tournament with varied motions", "daily_practice": "60 mins"},
    ],
}

DRILL_LIBRARY = [
    {"name": "1-Minute Impromptu", "type": "speaking", "difficulty": "beginner", "description": "Pick a random topic and speak for 60 seconds without preparation."},
    {"name": "Rebuttal Blitz", "type": "rebuttal", "difficulty": "intermediate", "description": "Listen to 3 arguments and rebut each in under 30 seconds."},
    {"name": "Evidence Evaluation", "type": "research", "difficulty": "beginner", "description": "Find 3 sources on a topic and rank them by credibility with justification."},
    {"name": "Fallacy Identification", "type": "logic", "difficulty": "beginner", "description": "Identify all fallacies in a provided sample speech."},
    {"name": "Toulmin Mapping", "type": "argument", "difficulty": "intermediate", "description": "Map claim → data → warrant → backing → qualifier for your main argument."},
    {"name": "Steelmanning Practice", "type": "critical_thinking", "difficulty": "advanced", "description": "Write the strongest possible version of an argument you personally disagree with."},
    {"name": "Flow Practice", "type": "note_taking", "difficulty": "intermediate", "description": "Take a structured flow of a 15-minute practice debate."},
    {"name": "Impact Calculus", "type": "argument", "difficulty": "advanced", "description": "For two competing impacts, write a 90-second comparative analysis explaining which matters more and why."},
    {"name": "Summary Speech Drill", "type": "speaking", "difficulty": "advanced", "description": "Deliver a 2-minute crystallisation speech after observing a debate round."},
    {"name": "Vocabulary Builder", "type": "communication", "difficulty": "beginner", "description": "Learn 5 debate-specific vocabulary words daily (e.g., contention, nexus, concede, warrant)."},
]

