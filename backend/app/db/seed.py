import asyncio
from datetime import datetime, timedelta
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.models import (
    User, Profile, Skill, UserSkill, LearningGoal,
    DebateTopic, DebateSession, SessionParticipant, SessionRecording
)
from app.models.enums import (
    UserRole, ExperienceLevel, SkillCategory, GoalStatus,
    TopicDifficulty, DebateFormat, SessionStatus, ParticipantPosition, RecordingType
)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

DEFAULT_PASSWORD = "Password123!"

USERS_DATA = [
    {
        "id": "u-admin-01",
        "email": "admin@arena.ai",
        "full_name": "Eleanor Vance (Admin)",
        "role": UserRole.ADMIN,
        "bio": "Platform chief administrator and debate society steward.",
        "level": ExperienceLevel.ADVANCED,
        "topics": ["Policy & Ethics", "Global Governance", "Artificial Intelligence"],
        "domains": ["Keynote Speeches", "Competitive Debating"],
        "coaching_style": "Analytical & Direct",
        "goals": "Ensure system integrity and top-tier debate standard adherence."
    },
    {
        "id": "u-coach-01",
        "email": "coach@arena.ai",
        "full_name": "Marcus Aurelius (Coach)",
        "role": UserRole.DEBATE_COACH,
        "bio": "Former national parliamentary debate champion with 12 years of coaching experience.",
        "level": ExperienceLevel.ADVANCED,
        "topics": ["Constitutional Law", "Economics", "Philosophical Inquiry"],
        "domains": ["Parliamentary Debate", "Rebuttal Workshops"],
        "coaching_style": "Socratic & Rigorous",
        "goals": "Train champions in refutation and syllogistic argument construction."
    },
    {
        "id": "u-educator-01",
        "email": "educator@arena.ai",
        "full_name": "Dr. Sophia Chen (Educator)",
        "role": UserRole.EDUCATOR,
        "bio": "Professor of Rhetoric & Communications, directing high school and collegiate forensics leagues.",
        "level": ExperienceLevel.ADVANCED,
        "topics": ["Bioethics", "Education Policy", "Environmental Technology"],
        "domains": ["Academic Presentations", "Oxford Debating"],
        "coaching_style": "Constructive & Formative",
        "goals": "Foster respectful deliberation and critical reasoning skills across cohorts."
    },
    {
        "id": "u-learner-01",
        "email": "learner1@arena.ai",
        "full_name": "Alexander Hayes (Learner)",
        "role": UserRole.LEARNER,
        "bio": "Undergraduate student preparing for regional British Parliamentary tournaments.",
        "level": ExperienceLevel.INTERMEDIATE,
        "topics": ["Technology Ethics", "Free Speech", "Geopolitics"],
        "domains": ["Competitive Debating", "Impromptu Speeches"],
        "coaching_style": "Direct & Fast-Paced",
        "goals": "Master structural points of information and rapid fallacy refutation."
    },
    {
        "id": "u-learner-02",
        "email": "learner2@arena.ai",
        "full_name": "Maya Patel (Learner)",
        "role": UserRole.LEARNER,
        "bio": "High school debater aiming for national qualifiers in Lincoln-Douglas debates.",
        "level": ExperienceLevel.BEGINNER,
        "topics": ["Healthcare Rights", "Climate Justice", "Education Reform"],
        "domains": ["Public Speaking", "Value Debates"],
        "coaching_style": "Encouraging & Step-by-Step",
        "goals": "Overcome stage anxiety and refine pacing and vocal inflection."
    },
    {
        "id": "u-learner-03",
        "email": "learner3@arena.ai",
        "full_name": "Julian Sterling (Learner)",
        "role": UserRole.LEARNER,
        "bio": "Corporate management consultant seeking to sharpen persuasion and board presentations.",
        "level": ExperienceLevel.INTERMEDIATE,
        "topics": ["Capital Allocation", "AI Governance", "Future of Work"],
        "domains": ["Executive Briefings", "Persuasive Pitches"],
        "coaching_style": "Analytical & High-Impact",
        "goals": "Synthesize complex data into undeniable logical assertions."
    }
]

SKILLS_DATA = [
    {"name": "Argument Structure & Claims", "category": SkillCategory.ARGUMENTATION, "desc": "Constructing clear claims with Toulmin warrants and evidence backing."},
    {"name": "Fallacy Refutation", "category": SkillCategory.REASONING, "desc": "Detecting and dissecting fallacies including Straw Man, Ad Hominem, and False Dilemma."},
    {"name": "Vocal Delivery & Modulation", "category": SkillCategory.DELIVERY, "desc": "Controlling pitch, pace, pauses, and projection to command chamber presence."},
    {"name": "Empirical Evidence & Synthesis", "category": SkillCategory.RESEARCH, "desc": "Deploying verified statistics, case studies, and citations persuasively."},
    {"name": "Logical Consistency & Coherence", "category": SkillCategory.CRITICAL_THINKING, "desc": "Maintaining non-contradictory stances under intense cross-examination."},
    {"name": "Rebuttal Agility", "category": SkillCategory.REBUTTAL, "desc": "Rapidly breaking down opponent arguments in multi-turn clash exchanges."},
    {"name": "Rhetorical Framing & Ethos", "category": SkillCategory.ARGUMENTATION, "desc": "Setting the debate paradigm and establishing undeniable credibility."},
    {"name": "Pace & Filler Word Control", "category": SkillCategory.DELIVERY, "desc": "Eliminating vocal hesitations, verbal crutches, and managing speech rate."},
    {"name": "Cross-Examination & Point of Information", "category": SkillCategory.REASONING, "desc": "Formulating sharp, unavoidable questions during opponent speaking time."},
    {"name": "Counterargument Anticipation", "category": SkillCategory.REBUTTAL, "desc": "Proactively inoculating arguments against obvious opposing responses."}
]

TOPICS_DATA = [
    {
        "title": "Autonomous AI Systems Should Have Legal Personhood",
        "description": "Examine accountability, intellectual property ownership, and liability in autonomous synthetic intelligence agents.",
        "category": "Technology & Law",
        "difficulty": TopicDifficulty.ADVANCED
    },
    {
        "title": "Universal Basic Income is Essential in the Post-Automation Economy",
        "description": "Deliberate fiscal sustainability, human motivation, and poverty alleviation amidst artificial intelligence disruption.",
        "category": "Economics & Society",
        "difficulty": TopicDifficulty.INTERMEDIATE
    },
    {
        "title": "Gene Editing in Human Embryos Should Be Universally Banned",
        "description": "Ethical and generational considerations surrounding CRISPR germline editing versus the cure of hereditary illnesses.",
        "category": "Bioethics",
        "difficulty": TopicDifficulty.ADVANCED
    },
    {
        "title": "Social Media Algorithms Should Be Open-Sourced by Law",
        "description": "Balancing intellectual property rights with democratic resilience, algorithmic bias, and mental health transparency.",
        "category": "Digital Policy",
        "difficulty": TopicDifficulty.INTERMEDIATE
    },
    {
        "title": "Nuclear Energy Must Be the Backbone of Zero-Emission Grids",
        "description": "Energy security, waste containment, and capital deployment speed comparing fission with renewables.",
        "category": "Energy & Climate",
        "difficulty": TopicDifficulty.INTERMEDIATE
    },
    {
        "title": "Standardized Testing in Collegiate Admissions Does More Harm Than Good",
        "description": "Assess meritocracy, socio-economic disparities, and predictive validity in higher education access.",
        "category": "Education Policy",
        "difficulty": TopicDifficulty.BEGINNER
    },
    {
        "title": "Space Colonization Should Precede Terrestrial Environmental Remediation",
        "description": "Long-term existential risk hedging versus immediate biosphere restoration resource allocation.",
        "category": "Space & Philosophy",
        "difficulty": TopicDifficulty.BEGINNER
    },
    {
        "title": "Central Bank Digital Currencies Threaten Financial Privacy",
        "description": "Programmable sovereign currency benefits in systemic stability versus citizen surveillance risks.",
        "category": "Finance & Privacy",
        "difficulty": TopicDifficulty.ADVANCED
    },
    {
        "title": "Remote Work Significantly Diminishes Long-Term Organizational Innovation",
        "description": "Serendipitous collaboration and mentorship against employee autonomy and asynchronous throughput.",
        "category": "Workplace & Culture",
        "difficulty": TopicDifficulty.BEGINNER
    },
    {
        "title": "Democratic Nations Should Implement Compulsory Voting",
        "description": "Civic obligation versus personal liberty in representative governance and election turnouts.",
        "category": "Governance",
        "difficulty": TopicDifficulty.INTERMEDIATE
    }
]

async def seed_data():
    async with AsyncSessionLocal() as session:
        # 1. Create Users & Profiles
        users_map = {}
        for u in USERS_DATA:
            user = await session.get(User, u["id"])
            if not user:
                user = User(
                    id=u["id"],
                    email=u["email"],
                    password_hash=get_password_hash(DEFAULT_PASSWORD),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                session.add(user)
                await session.flush()
                
                profile = Profile(
                    user_id=user.id,
                    avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user.id}",
                    bio=u["bio"],
                    experience_level=u["level"],
                    preferred_topics=u["topics"],
                    presentation_domains=u["domains"],
                    coaching_style=u["coaching_style"],
                    learning_goals=u["goals"]
                )
                session.add(profile)
            users_map[u["id"]] = user

        # 2. Create Skills
        skills_map = {}
        for s in SKILLS_DATA:
            skill = await session.execute(
                User.metadata.tables["skills"].select().where(User.metadata.tables["skills"].c.name == s["name"])
            )
            existing_skill = skill.first()
            if not existing_skill:
                new_skill = Skill(
                    name=s["name"],
                    category=s["category"],
                    description=s["desc"]
                )
                session.add(new_skill)
                await session.flush()
                skills_map[s["name"]] = new_skill
            else:
                s_obj = await session.get(Skill, existing_skill.id)
                skills_map[s["name"]] = s_obj

        # 3. Assign User Skills & Goals to Learners
        for learner_id, base_level in [("u-learner-01", 72), ("u-learner-02", 45), ("u-learner-03", 68)]:
            learner = users_map.get(learner_id)
            if learner:
                for idx, skill in enumerate(skills_map.values()):
                    # check if already exists
                    usk = await session.get(UserSkill, (learner.id, skill.id))
                    if not usk:
                        offset = ((idx * 7) % 25) - 10
                        lvl = max(20, min(95, base_level + offset))
                        user_skill = UserSkill(
                            user_id=learner.id,
                            skill_id=skill.id,
                            level=lvl,
                            updated_at=datetime.utcnow()
                        )
                        session.add(user_skill)

                # Add sample goal
                goal = LearningGoal(
                    user_id=learner.id,
                    title="Deliver a 5-minute Oxford rebuttal without logical fallacies",
                    target_date=datetime.utcnow() + timedelta(days=14),
                    status=GoalStatus.IN_PROGRESS,
                    progress=60
                )
                session.add(goal)

        # 4. Create Debate Topics
        topics_created = []
        coach = users_map["u-coach-01"]
        for t in TOPICS_DATA:
            topic_record = await session.execute(
                User.metadata.tables["debate_topics"].select().where(User.metadata.tables["debate_topics"].c.title == t["title"])
            )
            existing_t = topic_record.first()
            if not existing_t:
                topic = DebateTopic(
                    title=t["title"],
                    description=t["description"],
                    category=t["category"],
                    difficulty=t["difficulty"],
                    created_by=coach.id,
                    created_at=datetime.utcnow()
                )
                session.add(topic)
                await session.flush()
                topics_created.append(topic)
            else:
                topics_created.append(await session.get(DebateTopic, existing_t.id))

        # 5. Create Sample Sessions
        if topics_created:
            # Session 1: Upcoming Scheduled 1-on-1
            s1 = DebateSession(
                id="session-seed-01",
                topic_id=topics_created[0].id,
                format=DebateFormat.ONE_ON_ONE,
                status=SessionStatus.SCHEDULED,
                scheduled_at=datetime.utcnow() + timedelta(days=1, hours=2),
                duration_min=45,
                created_by=coach.id,
                coach_id=coach.id
            )
            session.add(s1)
            await session.flush()

            session.add(SessionParticipant(
                session_id=s1.id,
                user_id="u-learner-01",
                position=ParticipantPosition.PROPOSITION,
                speaker_order=1
            ))
            session.add(SessionParticipant(
                session_id=s1.id,
                user_id="u-learner-02",
                position=ParticipantPosition.OPPOSITION,
                speaker_order=2
            ))

            # Session 2: Completed Oxford session with recording metadata
            s2 = DebateSession(
                id="session-seed-02",
                topic_id=topics_created[1].id,
                format=DebateFormat.OXFORD,
                status=SessionStatus.COMPLETED,
                scheduled_at=datetime.utcnow() - timedelta(days=2),
                duration_min=60,
                created_by=coach.id,
                coach_id=coach.id
            )
            session.add(s2)
            await session.flush()

            session.add(SessionParticipant(
                session_id=s2.id,
                user_id="u-learner-03",
                position=ParticipantPosition.PROPOSITION,
                speaker_order=1
            ))
            session.add(SessionParticipant(
                session_id=s2.id,
                user_id="u-learner-01",
                position=ParticipantPosition.OPPOSITION,
                speaker_order=2
            ))

            session.add(SessionRecording(
                id="rec-seed-01",
                session_id=s2.id,
                file_url="/uploads/recordings/sample_debate_01.webm",
                type=RecordingType.AUDIO,
                created_at=datetime.utcnow() - timedelta(days=2)
            ))

        await session.commit()
        print("Database successfully seeded!")

if __name__ == "__main__":
    asyncio.run(seed_data())
