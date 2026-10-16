import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, Profile, UserSkill, LearningGoal, UserRole
from app.models.debate import DebateTopic, DebateSession, SessionParticipant, DebateTurn, DebateFormat, SessionStatus
from app.models.analysis import PerformanceScore, DebateFeedbackReport, LearningPlan
from app.core.security import hash_password

logger = logging.getLogger(__name__)

def seed_database():
    """Seeds the database with required demo users, topics, sessions, scores, and plans."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        if db.query(User).count() > 0:
            print("[SEED] Database already contains records. Skipping seed.")
            return

        print("[SEED] Seeding DebateIQ initial demo data...")

        # 1. Demo Users
        users_data = [
            {
                "email": "learner@debateiq.ai",
                "full_name": "Alex Rivera",
                "role": UserRole.LEARNER,
                "xp": 450,
                "level": 2,
                "badges": ["Rookie Debater", "Fallacy Hunter", "Clash Master"],
                "streak": 5,
            },
            {
                "email": "coach@debateiq.ai",
                "full_name": "Dr. Marcus Vance",
                "role": UserRole.COACH,
                "xp": 1200,
                "level": 5,
                "badges": ["Master Adjudicator", "Socratic Guide"],
                "streak": 14,
            },
            {
                "email": "educator@debateiq.ai",
                "full_name": "Prof. Elena Rostova",
                "role": UserRole.EDUCATOR,
                "xp": 950,
                "level": 4,
                "badges": ["Curriculum Architect", "Oxford Fellow"],
                "streak": 9,
            },
            {
                "email": "admin@debateiq.ai",
                "full_name": "System Administrator",
                "role": UserRole.ADMIN,
                "xp": 2000,
                "level": 8,
                "badges": ["Platform Sentinel", "Agent Orchestrator"],
                "streak": 30,
            },
        ]

        created_users = {}
        for u in users_data:
            user = User(
                email=u["email"],
                hashed_password=hash_password("password123"),
                full_name=u["full_name"],
                role=u["role"],
            )
            db.add(user)
            db.flush()
            created_users[u["email"]] = user

            # Profile
            profile = Profile(
                user_id=user.id,
                experience_level="Intermediate" if u["role"] == UserRole.LEARNER else "Champion",
                preferred_topics=["AI & Technology", "Ethics", "Economics"],
                presentation_domains=["Oxford Debate", "Keynote Address"],
                coaching_preferences="Socratic & Challenging",
                debater_xp=u["xp"],
                debater_level=u["level"],
                badges=u["badges"],
                streak_days=u["streak"],
                bio=f"{u['full_name']} - Active DebateIQ {u['role']}.",
            )
            db.add(profile)

            # Skills
            skills = UserSkill(
                user_id=user.id,
                clarity_score=78.5,
                reasoning_score=82.0,
                evidence_score=74.0,
                rebuttal_score=71.5,
                delivery_score=80.0,
                total_debates_count=6,
                total_speeches_count=18,
                average_wpm=138.0,
                filler_words_per_min=1.2,
                confidence_index=84.0,
            )
            db.add(skills)

            # Goals for learner
            if u["role"] == UserRole.LEARNER:
                goal1 = LearningGoal(
                    user_id=user.id,
                    title="Master Fallacy Refutation",
                    description="Eliminate False Dilemma and Straw Man occurrences in sparring matches.",
                    target_score=90.0,
                    current_score=76.0,
                    category="Critical Thinking",
                )
                goal2 = LearningGoal(
                    user_id=user.id,
                    title="Empirical Evidence Density",
                    description="Incorporate at least 2 peer-reviewed empirical statistics per constructive speech.",
                    target_score=85.0,
                    current_score=74.0,
                    category="Evidence Usage",
                )
                db.add(goal1)
                db.add(goal2)

        # 2. Curated Debate Topics
        topics_data = [
            {
                "title": "Frontier AI Safety Mandates",
                "motion_text": "This House Would mandate algorithmic explainability and third-party audit clearance for all frontier AI models prior to public release.",
                "category": "AI & Technology",
                "difficulty": "Intermediate",
                "proposition_summary": "Protects systemic stability and prevents opaque societal bias.",
                "opposition_summary": "Inhibits competitive pace, damages open-source development, and creates regulatory capture.",
            },
            {
                "title": "Universal Basic Income via Automation Dividends",
                "motion_text": "This House Would fund a guaranteed federal Universal Basic Income through a targeted capital tax on autonomous robotic deployment.",
                "category": "Economics",
                "difficulty": "Advanced",
                "proposition_summary": "Safeguards human dignity during hyper-automation transitions.",
                "opposition_summary": "Disincentivizes technological capital upgrades and triggers structural capital flight.",
            },
            {
                "title": "Adolescent Social Media Algorithmic Restrictions",
                "motion_text": "This House Would prohibit recommender algorithm feeds for users under the age of 18 on social media networks.",
                "category": "Ethics",
                "difficulty": "Novice",
                "proposition_summary": "Halts documented mental health deterioration and attentional fragmentation in youth.",
                "opposition_summary": "Infringes on free information exchange and constitutes state overreach into family governance.",
            },
        ]

        created_topics = []
        for t in topics_data:
            topic = DebateTopic(
                title=t["title"],
                motion_text=t["motion_text"],
                category=t["category"],
                difficulty=t["difficulty"],
                proposition_summary=t["proposition_summary"],
                opposition_summary=t["opposition_summary"],
                is_curated=True,
                created_by=created_users["educator@debateiq.ai"].id,
            )
            db.add(topic)
            db.flush()
            created_topics.append(topic)

        # 3. Seed Sample Debate Session for Learner
        learner = created_users["learner@debateiq.ai"]
        primary_topic = created_topics[0]

        session = DebateSession(
            topic_id=primary_topic.id,
            format=DebateFormat.AI_SIMULATION,
            status=SessionStatus.COMPLETED,
            current_round=2,
            turn_timer_seconds=120,
            active_speaker_position="proposition",
            ai_opponent_difficulty="Intermediate",
            ai_persona="Socratic Questioner",
            created_by=learner.id,
        )
        db.add(session)
        db.flush()

        # Participants
        p1 = SessionParticipant(
            session_id=session.id,
            user_id=learner.id,
            is_ai=False,
            position="proposition",
            speaker_order_index=1,
        )
        p2 = SessionParticipant(
            session_id=session.id,
            user_id=None,
            is_ai=True,
            ai_persona="Socratic Questioner",
            position="opposition",
            speaker_order_index=2,
        )
        db.add(p1)
        db.add(p2)

        # Turns
        t1 = DebateTurn(
            session_id=session.id,
            speaker_id=learner.id,
            speaker_position="proposition",
            round_number=1,
            turn_type="speech",
            speech_text=(
                "Mr. Speaker, we stand firmly for the resolution. When autonomous models make life-altering decisions "
                "in healthcare, judicial sentencing, and financial lending, opacity is not merely a technical limitation—it "
                "is a fundamental violation of due process. According to a 2023 MIT study, unexplained black-box systems "
                "exhibited an 18% false-positive disparity across vulnerable demographics. We cannot trade civil rights "
                "for commercial expediency."
            ),
            wpm=136.0,
            filler_word_count=1,
        )
        t2 = DebateTurn(
            session_id=session.id,
            speaker_id=None,
            speaker_position="opposition",
            round_number=1,
            turn_type="ai_rebuttal",
            speech_text=(
                "While the proposition speaks movingly of fairness, their solution would dismantle the very innovation "
                "saving lives today. Requiring mathematical explainability for deep transformer models is physically impossible "
                "under our current understanding of high-dimensional parameter spaces. Imposing an outright moratorium simply "
                "shifts research to jurisdictions with zero ethical safeguards, destroying domestic safety leadership."
            ),
            wpm=144.0,
            filler_word_count=0,
        )
        db.add(t1)
        db.add(t2)

        # 4. Performance Score (Exact Weighted Formula applied: 82.5 overall)
        perf_score = PerformanceScore(
            session_id=session.id,
            user_id=learner.id,
            overall_score=82.5,
            argument_quality_score=85.0,
            evidence_score=82.0,
            logical_consistency_score=84.0,
            rebuttal_score=78.0,
            communication_score=82.0,
            critical_thinking_score=84.5,
        )
        db.add(perf_score)

        # 5. Feedback Report
        report = DebateFeedbackReport(
            session_id=session.id,
            user_id=learner.id,
            executive_summary=(
                "Outstanding Proposition opening. High empirical warrant strength with MIT study citation. "
                "Maintained dialectical composure and avoided canonical fallacies."
            ),
            overall_performance_score=82.5,
            credibility_index=94.0,
            key_strengths=[
                "Explicit empirical warrant linking algorithmic opacity to concrete civil liberty costs.",
                "Excellent structural cadence with 136 WPM speech rate.",
            ],
            critical_vulnerabilities=[
                "Vulnerable to opposition counter-arguments regarding the technical infeasibility of parameter introspection.",
            ],
            coaching_drills_prescribed=[
                "Speed Fallacy Hunting Drill",
                "The 60-Second Rebuttal Pivot",
            ],
        )
        db.add(report)

        # 6. Learning Plan
        plan = LearningPlan(
            user_id=learner.id,
            title="Tournament Championship Track",
            target_skill="Rebuttal & Clash",
            focus_areas=["Syllogistic Bridge Building", "Cross-Examination Tactics", "Statistical Evidence Density"],
            milestone_goals=[
                "Reach Level 3 Debater (600 XP)",
                "Achieve 85+ score in Oxford Debate format",
                "Complete 5 AI Opponent sparring rounds without fallacies",
            ],
            prescribed_drills=[
                {"title": "Speed Fallacy Hunting Drill", "duration": 10},
                {"title": "Syllogism Bridge Builder", "duration": 15},
            ],
            status="active",
            progress_percentage=45.0,
        )
        db.add(plan)

        db.commit()
        print("[SEED] Seeding successfully completed!")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Failed to seed database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
