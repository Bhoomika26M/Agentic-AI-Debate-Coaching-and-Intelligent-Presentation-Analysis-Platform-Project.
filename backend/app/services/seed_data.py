from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserProfile, UserSkill, Subscription
from app.models.debate import (
    DebateSession,
    DebateParticipant,
    DebateMessage,
    DebateEvaluation,
    DebateFormat,
    DebateStatus,
    DebatePosition,
)
from app.models.argument import ArgumentAnalysis, FallacyDetection, Counterargument
from app.models.presentation import PresentationAnalysis
from app.models.coaching import CoachingRecommendation
from app.models.notification import Notification

def seed_database(db: Session):
    # Check if admin user already exists
    existing_admin = db.query(User).filter(User.email == "admin@justitalk.com").first()
    if existing_admin:
        return

    print("Seeding initial JustiTalk database with rich data...")

    # 1. Create Default Users for all 4 Roles
    hashed_pwd = get_password_hash("password123")

    admin_user = User(
        email="admin@justitalk.com",
        hashed_password=hashed_pwd,
        full_name="Admin",
        role=UserRole.ADMINISTRATOR,
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        is_active=True
    )
    db.add(admin_user)

    learner_user = User(
        email="learner@justitalk.com",
        hashed_password=hashed_pwd,
        full_name="Alex Rivera",
        role=UserRole.LEARNER,
        avatar_url="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
        is_active=True
    )
    db.add(learner_user)

    coach_user = User(
        email="coach@justitalk.com",
        hashed_password=hashed_pwd,
        full_name="Dr. Eleanor Vance",
        role=UserRole.DEBATE_COACH,
        avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
        is_active=True
    )
    db.add(coach_user)

    educator_user = User(
        email="educator@justitalk.com",
        hashed_password=hashed_pwd,
        full_name="Prof. Marcus Sterling",
        role=UserRole.EDUCATOR,
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        is_active=True
    )
    db.add(educator_user)
    db.commit()
    db.refresh(admin_user)
    db.refresh(learner_user)

    # 2. Add Profiles & Subscriptions
    # Admin Profile matching EXACT UI screenshot metrics
    admin_profile = UserProfile(
        user_id=admin_user.id,
        experience_level="Master",
        bio="Lead platform administrator and competitive debate adjudicator.",
        institution="World Debate Institute",
        total_debates=7,
        debates_won=1,
        rooms_hosted=41,
        followers_count=0,
        following_count=2,
    )
    db.add(admin_profile)

    admin_sub = Subscription(
        user_id=admin_user.id,
        plan_name="Pro Plan",
        status="Active",
        current_period_end=datetime.utcnow() + timedelta(days=365)
    )
    db.add(admin_sub)

    # Learner Profile
    learner_profile = UserProfile(
        user_id=learner_user.id,
        experience_level="Intermediate",
        bio="Collegiate speaker focusing on public policy and tech ethics.",
        institution="Stanford Debate Society",
        total_debates=12,
        debates_won=7,
        rooms_hosted=18,
        followers_count=24,
        following_count=15,
    )
    db.add(learner_profile)

    learner_sub = Subscription(
        user_id=learner_user.id,
        plan_name="Pro Plan",
        status="Active",
        current_period_end=datetime.utcnow() + timedelta(days=180)
    )
    db.add(learner_sub)

    # 3. Add Skills for Admin & Learner
    skills_data = [
        ("Argumentation", 84),
        ("Critical Thinking", 88),
        ("Communication", 79),
        ("Confidence", 82),
        ("Rebuttal Skills", 76),
        ("Presentation Skills", 85)
    ]
    for name, score in skills_data:
        db.add(UserSkill(user_id=admin_user.id, skill_name=name, score=score))
        db.add(UserSkill(user_id=learner_user.id, skill_name=name, score=score - 5))

    # 4. Add Initial Debate Sessions & Messages
    now = datetime.utcnow()
    sample_debates = [
        {
            "title": "Artificial Intelligence in Legal Adjudication",
            "topic": "This House would replace human judges with artificial intelligence in commercial civil disputes.",
            "format": DebateFormat.AI_SIMULATION,
            "difficulty": "Master",
            "user_pos": DebatePosition.FOR,
            "ai_pos": DebatePosition.AGAINST,
            "winner": "Side B Wins", # Matching the donut chart slice in reference UI!
            "created_at": now - timedelta(days=4),
            "ended_at": now - timedelta(days=4, hours=-1),
            "status": DebateStatus.COMPLETED
        },
        {
            "title": "Universal Basic Income and Automation",
            "topic": "Resolved: National governments should fund universal basic income through an automation dividend.",
            "format": DebateFormat.AI_SIMULATION,
            "difficulty": "Intermediate",
            "user_pos": DebatePosition.FOR,
            "ai_pos": DebatePosition.AGAINST,
            "winner": "Tie", # Matching the donut chart slice in reference UI!
            "created_at": now - timedelta(days=2),
            "ended_at": now - timedelta(days=2, hours=-1),
            "status": DebateStatus.COMPLETED
        },
        {
            "title": "Social Media Algorithmic Transparency",
            "topic": "This House would mandate public inspection of social media recommendation codebases.",
            "format": DebateFormat.PARLIAMENTARY,
            "difficulty": "Advanced",
            "user_pos": DebatePosition.FOR,
            "ai_pos": DebatePosition.AGAINST,
            "winner": "Tie",
            "created_at": now - timedelta(days=1),
            "ended_at": now - timedelta(days=1, hours=-1),
            "status": DebateStatus.COMPLETED
        }
    ]

    for d_info in sample_debates:
        debate = DebateSession(
            creator_id=admin_user.id,
            title=d_info["title"],
            topic=d_info["topic"],
            format=d_info["format"],
            difficulty=d_info["difficulty"],
            user_position=d_info["user_pos"],
            ai_position=d_info["ai_pos"],
            winner=d_info["winner"],
            created_at=d_info["created_at"],
            ended_at=d_info["ended_at"],
            status=d_info["status"],
            current_round=4,
            max_rounds=4
        )
        db.add(debate)
        db.commit()
        db.refresh(debate)

        # Add sample messages for realism
        db.add(DebateMessage(
            debate_id=debate.id,
            round_number=1,
            sender_type="user",
            sender_name="Admin",
            content="Automated adjudication eliminates cognitive fatigue, procedural bias, and socioeconomic sentencing disparities. When algorithms apply transparent statutes consistently, equal justice under law becomes a measurable reality.",
            timestamp=d_info["created_at"]
        ))
        db.add(DebateMessage(
            debate_id=debate.id,
            round_number=1,
            sender_type="ai",
            sender_name="Pro AI",
            content="While algorithmic consistency sounds appealing, judicial reasoning requires human contextual empathy and constitutional equity. Code cannot weigh unquantifiable human intent or evolving moral norms.",
            timestamp=d_info["created_at"] + timedelta(minutes=2),
            instant_critique={
                "score": 82.0,
                "punchline": "Assertive premise, though susceptible to questions regarding black-box algorithm accountability.",
                "coaching_tip": "Cite technical audits or empirical studies on judicial variance."
            }
        ))

        # Add evaluation matching weighted formula
        db.add(DebateEvaluation(
            debate_id=debate.id,
            user_id=admin_user.id,
            argument_quality=84.0,
            evidence_usage=72.0,
            logical_consistency=80.0,
            rebuttal_effectiveness=76.0,
            communication_skills=85.0,
            total_score=79.6,
            winner=d_info["winner"],
            summary="A high-intensity dialectic encounter showcasing rigorous procedural logic. The speaker held their ground effectively under rigorous AI cross-examination.",
            strengths=[
                "Articulate opening thesis framing",
                "Strong defense of institutional consistency",
                "Concise speech delivery"
            ],
            weaknesses=[
                "Did not fully resolve black-box auditability concerns",
                "Underutilized empirical precedents from small-claims automated pilot trials"
            ],
            actionable_feedback=[
                "Incorporate technical explainability standards into your policy mechanism.",
                "Directly confront the opponent's strongest moral objection in round 2."
            ]
        ))

    # 5. Add Sample Argument Analysis, Fallacy Detection, and Counterarguments
    db.add(ArgumentAnalysis(
        user_id=admin_user.id,
        topic="Algorithmic Sentencing",
        input_argument="We must immediately transition to AI judges because humans are inherently biased and code never gets tired or emotional.",
        main_claim="AI judges should replace human judges to eliminate bias and emotional fatigue.",
        supporting_arguments=[
            "Human judges exhibit cognitive fatigue and subjective bias.",
            "Algorithmic execution is continuous, objective, and unemotional."
        ],
        evidence_assessment="Relies on intuitive claims regarding judicial inconsistency; lacks empirical data on training dataset bias.",
        strengths=["Clear, punchy thesis statement", "Direct contrast between human fallibility and algorithmic stamina"],
        weaknesses=["Oversimplifies algorithm neutrality; models inherit training data bias", "Disregards the discretionary role of constitutional jurisprudence"],
        missing_evidence="Peer-reviewed studies on recidivism prediction algorithm disparities across demographic groups.",
        suggestions=["Acknowledge algorithmic bias and advocate for human-in-the-loop oversight.", "Cite empirical studies such as Danziger et al. on judicial fatigue."],
        clarity_score=88.0,
        relevance_score=92.0,
        evidence_strength_score=64.0,
        logical_consistency_score=75.0,
        persuasiveness_score=78.0,
        overall_score=77.8
    ))

    db.add(FallacyDetection(
        user_id=admin_user.id,
        input_text="Either we switch entirely to artificial intelligence in government today, or society will plunge into total bureaucratic collapse. Anyone who disagrees is simply an ignorant technophobe who wants corruption to flourish.",
        has_fallacies=True,
        credibility_impact="High",
        summary="Detected 2 acute fallacy patterns: False Dilemma and Ad Hominem.",
        fallacies=[
            {
                "name": "False Dilemma",
                "sentence": "Either we switch entirely to artificial intelligence in government today, or society will plunge into total bureaucratic collapse.",
                "explanation": "Presents an artificial either-or choice between total AI takeover and complete societal collapse, ignoring hybrid governance models.",
                "problematic_reasoning": "Ignores gradual, measured, or hybrid digital modernization options.",
                "corrected_version": "Accelerating public sector AI adoption can streamline administrative friction and reduce backlogs while preserving necessary human checks.",
                "improvement_tips": "Present digital transformation as an iterative roadmap rather than an existential binary."
            },
            {
                "name": "Ad Hominem",
                "sentence": "Anyone who disagrees is simply an ignorant technophobe who wants corruption to flourish.",
                "explanation": "Dismisses opponents by insulting their intelligence and accusing them of supporting corruption instead of addressing valid caution.",
                "problematic_reasoning": "Attacking character does not disprove concerns about data security, bias, or safety.",
                "corrected_version": "While skepticism regarding technology exists, addressing valid concerns on security and oversight will build broader consensus.",
                "improvement_tips": "Critique counter-arguments on their merits rather than labeling your opponents."
            }
        ]
    ))

    # 6. Add Sample Presentation Analysis
    db.add(PresentationAnalysis(
        user_id=admin_user.id,
        title="Opening Keynote - Oxford Union Practice",
        duration_seconds=185.0,
        transcription="Ladies and gentlemen, today we stand at the precipice of a technological revolution. Um, as we evaluate the future of governance, we must, you know, ask ourselves whether our institutions are capable of adapting. Like, if we fail to act now, the cost of inaction will far outweigh the frictional cost of change.",
        words_per_minute=138.0,
        speech_pace_label="Optimal / Engaging (110-155 WPM)",
        total_words=425,
        filler_words_count=5,
        filler_words_breakdown={"um": 2, "you know": 2, "like": 1},
        repeated_words=["cost"],
        pauses_detected=14,
        confidence_score=84.0,
        clarity_score=86.0,
        audience_engagement_score=82.0,
        overall_presentation_score=84.2,
        strengths=[
            "Ideal speaking rate of 138 WPM commanding high listener retention.",
            "Resonant vocal projection and clear syntactic signposting."
        ],
        weaknesses=[
            "Mild reliance on conversational fillers ('you know', 'like') during transitional phrases."
        ],
        improvement_recommendations=[
            "Substitute filler phrases with silent 1.5-second pauses to project greater poise.",
            "Amplify rhetorical questions with a noticeable change in vocal pitch."
        ]
    ))

    # 7. Add Notifications matching UI
    db.add(Notification(
        user_id=admin_user.id,
        title="New Comment",
        message="Pro AI commented on your debate: 'Strong opening point on procedural consistency!'",
        type="COACHING",
        is_read=False
    ))
    db.add(Notification(
        user_id=admin_user.id,
        title="Milestone Reached",
        message="Congratulations! You have completed 7 debate rounds this month.",
        type="MILESTONE",
        is_read=True
    ))

    # 8. Add Coaching Recommendations
    db.add(CoachingRecommendation(
        user_id=admin_user.id,
        category="Evidence Mastery",
        title="Empirical Grounding Drill",
        description="Your logical structure is sharp, but your evidentiary backing can be elevated with verified statistics.",
        priority="High",
        recommended_exercises=[
            {"title": "The 3-Stat Scaffold Drill", "type": "Interactive Exercise", "duration": "15 mins"}
        ],
        personalized_learning_plan=[
            "Incorporate 2 cited empirical data points per debate round.",
            "Practice distinguishing correlation from causal warrants."
        ],
        suggested_debate_topics=[
            "This House would mandate open algorithmic models for public services."
        ],
        communication_tips=[
            "State your benchmark data before drawing your policy conclusion."
        ]
    ))

    db.commit()
    print("Database seeding completed successfully!")
