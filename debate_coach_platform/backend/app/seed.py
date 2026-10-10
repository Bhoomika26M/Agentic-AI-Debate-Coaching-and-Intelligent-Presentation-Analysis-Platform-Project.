from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.profile import Profile, UserSkill
from app.models.debate import (
    DebateTopic,
    DebateSession,
    SessionParticipant,
    DebateFormat,
    SessionStatus,
    ParticipantPosition,
)
from app.security.hashing import hash_password

def seed_database(db: Session):
    # Only seed if no users exist
    if db.query(User).first():
        return

    print("[SEED] Seeding default users, profiles, skills, topics and sessions...")

    # 1. Demo Users
    users_data = [
        {
            "email": "learner@debatecoach.ai",
            "password": "password123",
            "full_name": "Alex Rivera",
            "role": UserRole.LEARNER,
            "profile": {
                "experience_level": "Intermediate",
                "preferred_topics": ["Ethics", "AI & Technology", "Economics"],
                "presentation_domains": ["Keynote", "Competitive Debate"],
                "learning_goals": "Eliminate hasty generalizations and strengthen cross-examination rebuttal speed.",
                "coaching_preferences": "Direct fallacy identification & Socratic questioning",
                "bio": "Competitive collegiate debater focusing on ethics and technological regulation."
            },
            "skills": {
                "argument_quality": 82.0,
                "evidence_usage": 74.0,
                "logical_consistency": 85.0,
                "rebuttal_effectiveness": 70.0,
                "communication_skills": 78.0,
                "speech_pace_wpm": 138.0,
                "confidence_score": 80.0,
                "debates_completed": 8
            }
        },
        {
            "email": "coach@debatecoach.ai",
            "password": "password123",
            "full_name": "Dr. Marcus Vance",
            "role": UserRole.COACH,
            "profile": {
                "experience_level": "Champion",
                "preferred_topics": ["Law & Governance", "Ethics", "Global Economics"],
                "presentation_domains": ["Academic Lecture", "Parliamentary", "Keynote"],
                "learning_goals": "Coach high-performing speakers in parliamentary debate and rhetoric.",
                "coaching_preferences": "Rigorous syllogistic deconstruction",
                "bio": "Former World Universities Debating Championship (WUDC) finalist and master speech coach."
            },
            "skills": {
                "argument_quality": 95.0,
                "evidence_usage": 92.0,
                "logical_consistency": 96.0,
                "rebuttal_effectiveness": 94.0,
                "communication_skills": 92.0,
                "speech_pace_wpm": 142.0,
                "confidence_score": 96.0,
                "debates_completed": 45
            }
        },
        {
            "email": "educator@debatecoach.ai",
            "password": "password123",
            "full_name": "Prof. Elena Rostova",
            "role": UserRole.EDUCATOR,
            "profile": {
                "experience_level": "Advanced",
                "preferred_topics": ["Education Policy", "Climate Policy", "Healthcare"],
                "presentation_domains": ["Academic Lecture", "TED-Style", "Policy Debate"],
                "learning_goals": "Cultivate critical thinking and evidence verification in student cohorts.",
                "coaching_preferences": "Rubric-based structured feedback",
                "bio": "Professor of Communication Studies and director of university forensics."
            },
            "skills": {
                "argument_quality": 90.0,
                "evidence_usage": 94.0,
                "logical_consistency": 91.0,
                "rebuttal_effectiveness": 88.0,
                "communication_skills": 95.0,
                "speech_pace_wpm": 130.0,
                "confidence_score": 92.0,
                "debates_completed": 30
            }
        },
        {
            "email": "admin@debatecoach.ai",
            "password": "password123",
            "full_name": "System Administrator",
            "role": UserRole.ADMIN,
            "profile": {
                "experience_level": "Advanced",
                "preferred_topics": ["AI & Technology", "Security"],
                "presentation_domains": ["Keynote"],
                "learning_goals": "Platform oversight, model orchestration, and audit control.",
                "coaching_preferences": "Data-driven analytics",
                "bio": "Platform system administrator and AI safety supervisor."
            },
            "skills": {
                "argument_quality": 85.0,
                "evidence_usage": 85.0,
                "logical_consistency": 85.0,
                "rebuttal_effectiveness": 80.0,
                "communication_skills": 80.0,
                "speech_pace_wpm": 135.0,
                "confidence_score": 85.0,
                "debates_completed": 12
            }
        }
    ]

    created_users = {}
    for ud in users_data:
        u = User(
            email=ud["email"],
            hashed_password=hash_password(ud["password"]),
            full_name=ud["full_name"],
            role=ud["role"],
            is_active=True
        )
        db.add(u)
        db.flush()
        created_users[ud["email"]] = u

        prof = Profile(
            user_id=u.id,
            **ud["profile"]
        )
        db.add(prof)

        sk = UserSkill(
            user_id=u.id,
            **ud["skills"]
        )
        db.add(sk)

    # 2. Curated Debate Topics
    coach_id = created_users["coach@debatecoach.ai"].id
    topics_data = [
        {
            "title": "Autonomous AI Liability",
            "motion_text": "This House Would Hold Frontier AI Developers Strictly Liable For Harms Generated by Autonomous Systems.",
            "category": "AI & Technology",
            "difficulty_level": "Advanced",
            "proposition_stance": "Strict liability internalizes negative externalities and compels safety verification prior to open deployment.",
            "opposition_stance": "Strict liability throttles open-source innovation, concentrates power in incumbents, and fails when users jailbreak models.",
            "created_by": coach_id
        },
        {
            "title": "Universal Basic Income & Automation",
            "motion_text": "This House Believes That Universal Basic Income Is Essential in the Age of Generative AI.",
            "category": "Economics",
            "difficulty_level": "Intermediate",
            "proposition_stance": "UBI decouples basic survival from labor market disruption caused by cognitive automation.",
            "opposition_stance": "UBI risks inflationary pressure, fiscal insolvency, and reduces incentives for technological retraining.",
            "created_by": coach_id
        },
        {
            "title": "Carbon Tax vs. Clean Energy Subsidies",
            "motion_text": "This House Would Prioritize Global Carbon Border Taxes Over Domestic Renewable Energy Subsidies.",
            "category": "Climate Policy",
            "difficulty_level": "Intermediate",
            "proposition_stance": "Border adjustment carbon tariffs level the international playing field and penalize carbon leakage directly.",
            "opposition_stance": "Border tariffs trigger retaliatory trade wars and place regressive cost burdens on developing economies.",
            "created_by": coach_id
        },
        {
            "title": "Standardized Testing in Higher Education",
            "motion_text": "This House Would Abolish Standardized Entrance Examinations in University Admissions.",
            "category": "Ethics",
            "difficulty_level": "Beginner",
            "proposition_stance": "Standardized tests reinforce socio-economic privilege and fail to evaluate multidimensional creativity.",
            "opposition_stance": "Standardized testing provides the only objective metric against grade inflation and subjective bias in holistic reviews.",
            "created_by": coach_id
        }
    ]

    created_topics = []
    for td in topics_data:
        topic = DebateTopic(**td)
        db.add(topic)
        db.flush()
        created_topics.append(topic)

    # 3. Seed Scheduled Debate Sessions
    learner_id = created_users["learner@debatecoach.ai"].id
    
    session_1 = DebateSession(
        topic_id=created_topics[0].id,
        debate_format=DebateFormat.OXFORD,
        session_title="Championship Preparation: Oxford Duel on Frontier AI",
        status=SessionStatus.SCHEDULED,
        scheduled_start=datetime.now(timezone.utc) + timedelta(hours=24),
        created_by=coach_id
    )
    db.add(session_1)
    db.flush()

    # Participants for session 1
    p1_a = SessionParticipant(
        session_id=session_1.id,
        user_id=learner_id,
        position=ParticipantPosition.PROPOSITION,
        speaking_order=1
    )
    p1_b = SessionParticipant(
        session_id=session_1.id,
        user_id=coach_id,
        position=ParticipantPosition.OPPOSITION,
        speaking_order=2
    )
    db.add_all([p1_a, p1_b])

    # Session 2: AI Debate Simulation session
    session_2 = DebateSession(
        topic_id=created_topics[1].id,
        debate_format=DebateFormat.AI_SIMULATION,
        session_title="Interactive AI Sparring: Universal Basic Income",
        status=SessionStatus.SCHEDULED,
        scheduled_start=datetime.now(timezone.utc) + timedelta(hours=2),
        created_by=learner_id
    )
    db.add(session_2)
    db.flush()

    p2_learner = SessionParticipant(
        session_id=session_2.id,
        user_id=learner_id,
        position=ParticipantPosition.PROPOSITION,
        speaking_order=1
    )
    db.add(p2_learner)

    db.commit()
    print("[SEED] Seeding successfully completed!")
