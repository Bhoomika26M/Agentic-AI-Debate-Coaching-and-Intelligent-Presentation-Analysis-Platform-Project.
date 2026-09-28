import json
import datetime
from sqlalchemy.orm import Session
from backend.app.database.session import SessionLocal, Base, engine
from backend.app.models.entities import (
    Role, User, UserProfile, Skill, UserSkill, LearningGoal,
    DebateTopic, DebateSession, DebateRound, Argument, Claim, Evidence,
    Fallacy, Counterargument, DebateScore, PresentationSession,
    PresentationMetric, Transcript, CoachingFeedback, LearningPath,
    LearningExercise, ExerciseAttempt, Notification, Report
)
from backend.app.auth.security import get_password_hash

SKILL_CATEGORIES = [
    ("Argumentation", "Constructing rigorous, defensible premises and contentions"),
    ("Evidence usage", "Integrating empirical, statistical, and peer-reviewed data"),
    ("Logical reasoning", "Formulating sound deductive and inductive inferences"),
    ("Rebuttal", "Deconstructing and countering opposing contentions effectively"),
    ("Critical thinking", "Questioning assumptions and identifying systemic implications"),
    ("Communication", "Clear, concise, and structured rhetorical delivery"),
    ("Clarity", "Signposting ideas and eliminating syntactic ambiguity"),
    ("Confidence", "Authoritative vocal presence, conviction, and composure"),
    ("Speaking pace", "Optimal delivery speed (130-165 WPM) with strategic pauses"),
    ("Audience engagement", "Rhetorical hooks, compelling analogies, and storytelling"),
    ("Persuasiveness", "Synthesizing logic, ethos, and emotional resonance to persuade")
]

DEFAULT_EXERCISES = [
    {
        "title": "Fallacy Identification: Straw Man Deconstruction",
        "category": "Fallacy",
        "difficulty": "Intermediate",
        "prompt": "An opponent states: 'Our critics want to ban all technology and force students back into the dark ages!' Identify the fallacy and provide a corrected, steel-manned rebuttal.",
        "sample_solution": "Fallacy: Straw Man. The opponent exaggerates sensible regulation into an extreme ban. Corrected response: 'We do not advocate banning technology; we propose targeted screen-time guardrails during formative early childhood development.'"
    },
    {
        "title": "Converting Weak Arguments into Strong Claims",
        "category": "Argument",
        "difficulty": "Beginner",
        "prompt": "Rewrite this weak claim into an evidence-backed contention: 'Social media is obviously bad for teenagers because everyone knows it makes them sad.'",
        "sample_solution": "Improved: 'Longitudinal studies across 12,000 adolescents indicate a statistically significant 24% correlation between unmoderated social media usage exceeding 3 hours daily and elevated indicators of clinical anxiety.'"
    },
    {
        "title": "Finding Empirical Evidence for Policy Stance",
        "category": "Evidence",
        "difficulty": "Advanced",
        "prompt": "Formulate two empirical evidence points supporting the position that universal basic income stimulates local economic velocity.",
        "sample_solution": "1. The Stockton SEED trial demonstrated that participants receiving $500 monthly allocated 80% to basic necessities (food, utilities), stimulating neighborhood retail. 2. Alaska Permanent Fund data confirms sustained maternal labor participation and reduced seasonal poverty."
    },
    {
        "title": "Rebuttal against Economic Infeasibility",
        "category": "Rebuttal",
        "difficulty": "Advanced",
        "prompt": "Your opponent argues: 'Transitioning to renewable energy is impossible because initial capital costs are too high for taxpayers.' Provide a multi-tier rebuttal.",
        "sample_solution": "Rebuttal: 1. Levelized cost of energy (LCOE) for solar and wind has dropped by 88% over the past decade, making new solar cheaper than existing coal. 2. The cost of climate inaction exceeds transition expenditure threefold according to Swiss Re reinsurance catastrophe projections."
    },
    {
        "title": "2-Minute Controlled Pacing & Filler Reduction",
        "category": "Presentation",
        "difficulty": "Intermediate",
        "prompt": "Deliver a 2-minute speech on your favorite scientific breakthrough. Maintain 135-150 WPM and use deliberate silent pauses instead of 'um' or 'like'.",
        "sample_solution": "Use structured 3-part framework: 1. The Hook (problem), 2. The Breakthrough (CRISPR gene editing), 3. Future Horizon (eradicating genetic diseases). Pause 2 seconds after each section."
    }
]

def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            return

        print("Seeding database with production demo accounts and content...")

        # 1. Seed Roles
        roles_data = [
            ("learner", "Debate & presentation student"),
            ("coach", "Debate coach managing students"),
            ("educator", "Institutional teacher/professor"),
            ("admin", "Platform super administrator")
        ]
        for name, desc in roles_data:
            role = Role(name=name, description=desc)
            db.add(role)
        db.commit()

        # 2. Seed Skills
        skills_entities = []
        for name, desc in SKILL_CATEGORIES:
            s = Skill(name=name, category="Core", description=desc)
            db.add(s)
            skills_entities.append(s)
        db.commit()

        # 3. Seed Users
        demo_users_data = [
            ("learner@debateai.com", "Password123!", "Alex Rivera (Demo Learner)", "learner", "Beginner"),
            ("coach@debateai.com", "Password123!", "Elena Vance (Demo Coach)", "coach", "Expert"),
            ("educator@debateai.com", "Password123!", "Prof. Marcus Thorne (Demo Educator)", "educator", "Expert"),
            ("admin@debateai.com", "Password123!", "DebateAI Admin (Demo Admin)", "admin", "Expert")
        ]

        created_users = {}
        for email, pwd, name, role, exp in demo_users_data:
            user = User(
                email=email,
                hashed_password=get_password_hash(pwd),
                full_name=name,
                role=role,
                is_active=True
            )
            db.add(user)
            db.flush()
            created_users[role] = user

            # Profile
            profile = UserProfile(
                user_id=user.id,
                experience_level=exp,
                bio=f"Active {role.capitalize()} on the DebateAI platform.",
                communication_level=75 if role == "learner" else 92,
                debate_level=70 if role == "learner" else 95,
                critical_thinking_level=78 if role == "learner" else 90,
                presentation_level=72 if role == "learner" else 88,
                confidence_level=80 if role == "learner" else 94
            )
            db.add(profile)

            # Assign skills to learner
            if role == "learner":
                for s in skills_entities:
                    score_val = 72.0 if "Evidence" in s.name else 78.0
                    history = json.dumps([
                        {"date": "2026-03-01", "score": score_val - 12},
                        {"date": "2026-03-10", "score": score_val - 6},
                        {"date": "2026-03-20", "score": score_val}
                    ])
                    us = UserSkill(
                        user_id=user.id,
                        skill_id=s.id,
                        current_score=score_val,
                        historical_scores=history
                    )
                    db.add(us)

                # Learning Goals
                g1 = LearningGoal(
                    user_id=user.id,
                    title="Eliminate Straw Man & Ad Hominem Fallacies",
                    target_date="2026-04-15",
                    target_score=90.0,
                    progress=65
                )
                g2 = LearningGoal(
                    user_id=user.id,
                    title="Reach 140 WPM Balanced Speaking Pace with Zero Fillers",
                    target_date="2026-04-30",
                    target_score=88.0,
                    progress=50
                )
                db.add_all([g1, g2])

                # Learning Path
                weekly_mods = [
                    {"week": 1, "topic": "Argument Structure & Claims", "status": "Completed", "score": 85},
                    {"week": 2, "topic": "Evidence Usage & Empirical Grounding", "status": "Completed", "score": 80},
                    {"week": 3, "topic": "Fallacy Identification & Rectification", "status": "In Progress", "score": 75},
                    {"week": 4, "topic": "Counterargument Taxonomy (5-Tier Rebuttals)", "status": "Upcoming", "score": 0},
                    {"week": 5, "topic": "Dynamic Socratic Interrogation", "status": "Upcoming", "score": 0},
                    {"week": 6, "topic": "Advanced Parliamentary & Oxford Debate Mastery", "status": "Upcoming", "score": 0}
                ]
                lp = LearningPath(
                    user_id=user.id,
                    title="Comprehensive Debate & Rhetoric Mastery Path",
                    current_week=3,
                    total_weeks=6,
                    weekly_modules=json.dumps(weekly_mods)
                )
                db.add(lp)

        db.commit()

        # 4. Seed Learning Exercises
        for ex in DEFAULT_EXERCISES:
            exercise = LearningExercise(
                title=ex["title"],
                category=ex["category"],
                difficulty=ex["difficulty"],
                prompt=ex["prompt"],
                sample_solution=ex["sample_solution"]
            )
            db.add(exercise)
        db.commit()

        # 5. Seed Debate Topics
        topics = [
            ("Should artificial intelligence replace traditional education?", "Technology", "Examines personalization vs. pedagogical human connection.", "For, Against, Neutral", "Intermediate"),
            ("Should social media algorithms be legally mandated to be open-source?", "Governance", "Weighs algorithmic accountability against proprietary software IP.", "For, Against", "Advanced"),
            ("Is Universal Basic Income economically viable at a national scale?", "Economics", "Assesses fiscal feasibility, inflation risk, and poverty mitigation.", "For, Against", "Intermediate"),
            ("Should human genetic modification for non-medical enhancement be prohibited?", "Bioethics", "Debates human enhancement ethics vs. equitable access.", "For, Against", "Expert")
        ]
        for t_title, cat, desc, pos, diff in topics:
            db.add(DebateTopic(title=t_title, category=cat, description=desc, suggested_positions=pos, difficulty=diff))
        db.commit()

        # 6. Seed Sample Completed Debate Session for Demo Learner
        learner_id = created_users["learner"].id
        sample_session = DebateSession(
            user_id=learner_id,
            topic="Should artificial intelligence replace traditional education?",
            position="For",
            format="Oxford Debate",
            difficulty="Intermediate",
            duration_minutes=10,
            ai_opponent_personality="Analytical",
            rounds_count=3,
            current_round=3,
            status="completed"
        )
        db.add(sample_session)
        db.flush()

        # Add rounds
        r1 = DebateRound(
            session_id=sample_session.id,
            round_number=1,
            user_transcript="AI-driven adaptive learning systems personalize pacing to each student's unique cognitive profile, drastically reducing achievement gaps in STEM subjects.",
            ai_transcript="While personalization is valuable, traditional education provides critical socio-emotional development and civic empathy that automated algorithms cannot reproduce."
        )
        db.add(r1)
        db.flush()

        # Add Argument, Claim, Evidence, Fallacy, Counterargument
        arg1 = Argument(
            round_id=r1.id,
            speaker="user",
            raw_text=r1.user_transcript,
            argument_strength_score=82.0,
            reasoning_quality_score=78.0,
            clarity_score=85.0,
            relevance_score=90.0,
            evidence_score=72.0,
            consistency_score=80.0,
            persuasiveness_score=81.0,
            improved_version="Empirical pilot programs across 40 school districts demonstrate that AI adaptive tutoring elevates average STEM mastery scores by 1.2 standard deviations while maintaining equalized access across socio-economic strata."
        )
        db.add(arg1)
        db.flush()

        db.add(Claim(argument_id=arg1.id, text="AI personalization reduces STEM achievement gaps.", claim_type="Main Claim"))
        db.add(Evidence(argument_id=arg1.id, text="Cognitive profiling and adaptive pacing references.", evidence_type="Empirical", relevance_score=85.0, strength_score=75.0, quality_score=78.0, sufficiency_score=70.0))
        
        db.add(Counterargument(
            round_id=r1.id,
            logical_rebuttal="The argument presumes academic knowledge acquisition is the sole objective of educational institutions.",
            evidence_rebuttal="Longitudinal UNESCO assessments demonstrate that peer collaboration under human mentorship produces 3x higher community civic engagement.",
            ethical_rebuttal="Automated pedagogical systems risk institutionalizing socio-cultural bias in algorithmic grading.",
            practical_rebuttal="School districts in developing or rural regions lack high-speed connectivity and device infrastructure.",
            policy_rebuttal="Data privacy compliance (FERPA, GDPR) restricts commercial algorithm access to minor pupil behavioral datasets.",
            challenge_questions=json.dumps(["How do you safeguard against algorithmic feedback loops reinforcing student vulnerabilities?", "Who assumes liability when an AI tutor delivers inaccurate curriculum guidance?"]),
            strategy_suggestions="Concede that socio-emotional growth requires human guidance, and frame AI as an augmenting co-pilot rather than total replacement.",
            explanation="Attacks the total replacement framing while preserving the benefits of technological acceleration."
        ))

        # Add weighted score (30%, 20%, 20%, 15%, 15%)
        # AQ=80 * 0.3 = 24.0
        # EU=72 * 0.2 = 14.4
        # LC=82 * 0.2 = 16.4
        # RE=76 * 0.15 = 11.4
        # CS=84 * 0.15 = 12.6
        # Total = 78.8
        score = DebateScore(
            session_id=sample_session.id,
            argument_quality=80.0,
            evidence_usage=72.0,
            logical_consistency=82.0,
            rebuttal_effectiveness=76.0,
            communication_skills=84.0,
            overall_score=78.8,
            strongest_argument="Articulation of adaptive pacing reducing disparities in individual student learning curves.",
            weakest_argument="Neglect of the socio-emotional development counter-contention raised by the opponent.",
            best_rebuttal="Framework distinguishing cognitive training from moral mentorship.",
            detected_fallacies_count=0,
            missing_evidence="Lack of peer-reviewed comparative longitudinal study metrics on teacher retention.",
            suggested_improvement="Incorporate OECD education benchmarks into your opening contentions.",
            coaching_summary="Impressive rhetorical poise and logical structure. Boost your evidence score by integrating specific quantitative studies.",
            next_practice_exercise="Finding Empirical Evidence for Policy Stance"
        )
        db.add(score)

        # 7. Seed Sample Presentation Session
        pres_session = PresentationSession(
            user_id=learner_id,
            title="The Future of Autonomous Transportation (Practice)",
            media_filename="autonomous_tech_pitch.mp3",
            media_type="audio",
            duration_seconds=115.0,
            status="completed"
        )
        db.add(pres_session)
        db.flush()

        # Transcript
        transcript = Transcript(
            presentation_id=pres_session.id,
            text="Good afternoon everyone. Um, today I want to present, you know, our vision for autonomous urban mobility. Basically, over eighty percent of urban vehicular accidents are caused by human distraction. Like, if we implement coordinated autonomous transit networks, we can eliminate almost sixty percent of traffic gridlock. So, our platform bridges this gap effectively.",
            timestamps_json="[]"
        )
        db.add(transcript)

        # Presentation Metric
        p_metric = PresentationMetric(
            session_id=pres_session.id,
            words_per_minute=144.0,
            pace_classification="Balanced",
            filler_words_count=5,
            filler_words_breakdown=json.dumps({"um": 1, "you know": 1, "basically": 1, "like": 1, "so": 1}),
            confidence_score=78.0,
            clarity_score=82.0,
            engagement_score=76.0,
            speaking_score=79.0,
            overall_score=78.5,
            pace_timeline=json.dumps([
                {"time_label": "0s - 30s", "wpm": 138.0},
                {"time_label": "30s - 60s", "wpm": 148.0},
                {"time_label": "60s - 90s", "wpm": 142.0},
                {"time_label": "90s - 115s", "wpm": 146.0}
            ]),
            confidence_explanation="Confidence estimated at 78/100. Balanced tempo (144 WPM) and clear articulation, tempered slightly by 5 filler words in early segments.",
            strengths="Steady speaking pace throughout the entire 2 minutes. Strong opening hook citing accident statistics.",
            weaknesses="Hesitation fillers ('um', 'you know', 'basically') occurred before introducing key technological claims.",
            recommended_improvements="Replace transitional filler words with deliberate 1.5-second silent pauses to command greater authority."
        )
        db.add(p_metric)

        # 8. Seed Notifications
        notifications = [
            Notification(
                user_id=learner_id,
                title="Debate Evaluation Ready",
                message="Your Oxford debate on 'AI in Education' scored 78.8/100. View your detailed breakdown.",
                notification_type="feedback",
                is_read=False,
                link=f"/learner/debates/{sample_session.id}"
            ),
            Notification(
                user_id=learner_id,
                title="Weekly Practice Streak Milestone",
                message="Congratulations! You have maintained an active practice streak of 7 consecutive days.",
                notification_type="milestone",
                is_read=False,
                link="/learner/dashboard"
            ),
            Notification(
                user_id=learner_id,
                title="New Drill Assigned by Coach",
                message="Coach Elena Vance recommended: '2-Minute Controlled Pacing & Filler Reduction'.",
                notification_type="feedback",
                is_read=True,
                link="/learner/exercises"
            )
        ]
        db.add_all(notifications)

        db.commit()
        print("Database initialized successfully with rich production demo data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
