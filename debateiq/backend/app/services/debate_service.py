import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.debate_repo import DebateRepository
from app.models.debate import DebateTopic, DebateSession, DebateTurn, DebateFormat, SessionStatus
from app.agents.planner import agent_planner
from app.schemas.debate import FormatInfoResponse, SessionResponse

DEBATE_FORMATS_CATALOG: Dict[str, Dict[str, Any]] = {
    DebateFormat.AI_SIMULATION: {
        "name": DebateFormat.AI_SIMULATION,
        "description": "Interactive sparring against an autonomous AI opponent with selectable rhetorical persona and difficulty tier.",
        "speaker_order": [
            {"round": 1, "speaker": "User (Proposition Opening)", "duration": 120},
            {"round": 1, "speaker": "AI Opponent (Opposition Rebuttal)", "duration": 120},
            {"round": 2, "speaker": "User (Cross-Examination & Defense)", "duration": 120},
            {"round": 2, "speaker": "AI Opponent (Closing Clash)", "duration": 120},
        ],
        "turn_duration_seconds": 120,
        "total_rounds": 2,
        "prep_time_seconds": 60,
        "rules_summary": [
            "Proposition delivers opening speech establishing resolution definitions and burdens.",
            "AI opponent analyzes arguments and immediately generates targeted rebuttals in persona.",
            "Live momentum bar evaluates clash points and argument quality dynamically.",
        ],
    },
    DebateFormat.ONE_ON_ONE: {
        "name": DebateFormat.ONE_ON_ONE,
        "description": "Traditional single-speaker head-to-head debate focusing on core logical clash and refutation speed.",
        "speaker_order": [
            {"round": 1, "speaker": "Affirmative Constructive", "duration": 180},
            {"round": 1, "speaker": "Negative Constructive", "duration": 180},
            {"round": 2, "speaker": "Affirmative Rebuttal", "duration": 120},
            {"round": 2, "speaker": "Negative Rebuttal", "duration": 120},
        ],
        "turn_duration_seconds": 180,
        "total_rounds": 2,
        "prep_time_seconds": 120,
        "rules_summary": [
            "Affirmative must prove the resolution true on balance.",
            "Negative defends the status quo or offers a counter-advocacy.",
        ],
    },
    DebateFormat.PARLIAMENTARY: {
        "name": DebateFormat.PARLIAMENTARY,
        "description": "British Parliamentary (BP) style featuring Prime Minister, Leader of Opposition, and member clash.",
        "speaker_order": [
            {"round": 1, "speaker": "Prime Minister", "duration": 300},
            {"round": 1, "speaker": "Leader of Opposition", "duration": 300},
            {"round": 2, "speaker": "Deputy Prime Minister", "duration": 300},
            {"round": 2, "speaker": "Deputy Leader of Opposition", "duration": 300},
        ],
        "turn_duration_seconds": 300,
        "total_rounds": 2,
        "prep_time_seconds": 900,
        "rules_summary": [
            "Government defines the motion and proposes a model.",
            "Opposition challenges principle, feasibility, and moral impact.",
            "Points of Information (POIs) allowed during un-protected minutes.",
        ],
    },
    DebateFormat.OXFORD: {
        "name": DebateFormat.OXFORD,
        "description": "Formal Oxford-style debate framed around a motion with pre- and post-debate audience voting.",
        "speaker_order": [
            {"round": 1, "speaker": "For the Motion (Constructive)", "duration": 240},
            {"round": 1, "speaker": "Against the Motion (Constructive)", "duration": 240},
            {"round": 2, "speaker": "Floor Questions & Rebuttals", "duration": 180},
            {"round": 3, "speaker": "Closing Remarks", "duration": 120},
        ],
        "turn_duration_seconds": 240,
        "total_rounds": 3,
        "prep_time_seconds": 300,
        "rules_summary": [
            "The winning side is determined by the percentage delta of votes swung between opening and closing ballots.",
        ],
    },
    DebateFormat.POLICY: {
        "name": DebateFormat.POLICY,
        "description": "Cross-examination policy debate requiring in-depth evidence, plan mandates, and advantage/disadvantage solvency.",
        "speaker_order": [
            {"round": 1, "speaker": "1AC - Affirmative Constructive", "duration": 360},
            {"round": 1, "speaker": "1NC - Negative Constructive", "duration": 360},
            {"round": 2, "speaker": "Cross Examination", "duration": 180},
        ],
        "turn_duration_seconds": 360,
        "total_rounds": 2,
        "prep_time_seconds": 300,
        "rules_summary": [
            "Focuses heavily on inherency, harms, solvency, and net impacts.",
        ],
    },
    DebateFormat.PUBLIC_FORUM: {
        "name": DebateFormat.PUBLIC_FORUM,
        "description": "Accessible, current-events debate format emphasizing clarity, persuasive communication, and crossfire.",
        "speaker_order": [
            {"round": 1, "speaker": "Team A Constructive", "duration": 240},
            {"round": 1, "speaker": "Team B Constructive", "duration": 240},
            {"round": 2, "speaker": "Crossfire Round", "duration": 180},
            {"round": 3, "speaker": "Final Focus", "duration": 120},
        ],
        "turn_duration_seconds": 240,
        "total_rounds": 3,
        "prep_time_seconds": 180,
        "rules_summary": [
            "Geared towards a general citizen audience rather than specialized technical judges.",
        ],
    },
}

class DebateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DebateRepository(db)

    def get_formats(self) -> List[FormatInfoResponse]:
        return [FormatInfoResponse(**f) for f in DEBATE_FORMATS_CATALOG.values()]

    def list_topics(self, category: Optional[str] = None) -> List[DebateTopic]:
        return self.repo.list_topics(category=category)

    def create_topic(self, user_id: str, title: str, motion_text: str, category: str, difficulty: str) -> DebateTopic:
        return self.repo.create_topic(
            title=title,
            motion_text=motion_text,
            category=category,
            difficulty=difficulty,
            is_curated=False,
            created_by=user_id,
        )

    def suggest_topics(self, category: str = "All", difficulty: str = "Intermediate", count: int = 3) -> List[Dict[str, Any]]:
        pool = [
            {
                "title": "Autonomous AI Governance",
                "motion_text": "This House Would mandate explainability standards for all commercial frontier AI models.",
                "category": "AI & Technology",
                "difficulty": "Intermediate",
                "proposition_summary": "Promotes consumer safety and prevents algorithmic discrimination.",
                "opposition_summary": "Stifles open-source innovation and creates insurmountable compliance moats.",
            },
            {
                "title": "Universal Basic Income & Automation",
                "motion_text": "This House Would implement a permanent Universal Basic Income funded by an automation tax.",
                "category": "Economics",
                "difficulty": "Advanced",
                "proposition_summary": "Protects worker security against rapid AI displacement.",
                "opposition_summary": "Disincentivizes labor force participation and induces structural inflation.",
            },
            {
                "title": "Social Media Age Restrictions",
                "motion_text": "This House Would ban access to algorithmically curated social media for individuals under 16.",
                "category": "Ethics",
                "difficulty": "Novice",
                "proposition_summary": "Curtails youth mental health crisis and protects cognitive development.",
                "opposition_summary": "Infringes on youth informational autonomy and privatizes censorship.",
            },
        ]
        return pool[:count]

    def list_sessions(self, user_id: Optional[str] = None, status: Optional[str] = None) -> List[DebateSession]:
        return self.repo.list_sessions(user_id=user_id, status=status)

    def get_session(self, session_id: str) -> DebateSession:
        session = self.repo.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found.")
        return session

    def create_session(
        self,
        user_id: str,
        topic_id: str,
        format_name: str,
        ai_persona: str,
        ai_difficulty: str,
        user_position: str,
        scheduled_at: Optional[Any] = None,
    ) -> DebateSession:
        topic = self.repo.get_topic_by_id(topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate topic does not exist.")

        return self.repo.create_session(
            topic_id=topic_id,
            format_name=format_name,
            created_by=user_id,
            ai_persona=ai_persona,
            ai_difficulty=ai_difficulty,
            user_position=user_position,
            scheduled_at=scheduled_at,
        )

    def submit_user_turn(
        self,
        session_id: str,
        user_id: str,
        speech_text: str,
        round_number: int = 1,
        duration_seconds: int = 60,
    ) -> Dict[str, Any]:
        session = self.get_session(session_id)
        words = len(speech_text.split())
        wpm = round((words / max(1, duration_seconds)) * 60, 1) if duration_seconds > 0 else 135.0

        # Filler words detection
        filler_words = ["um", "uh", "like", "you know", "basically", "literally"]
        filler_count = sum(len(re.findall(r'\b' + re.escape(w) + r'\b', speech_text.lower())) for w in filler_words)

        # 1. Record human turn
        user_turn = self.repo.record_turn(
            session_id=session.id,
            speaker_id=user_id,
            speaker_position=session.active_speaker_position or "proposition",
            round_number=round_number,
            speech_text=speech_text,
            turn_type="speech",
            wpm=wpm,
            filler_word_count=filler_count,
        )

        # 2. If session is AI simulation or One-on-One, trigger opponent turn automatically
        ai_turn = None
        if session.format in [DebateFormat.AI_SIMULATION, DebateFormat.ONE_ON_ONE]:
            motion_text = session.topic.motion_text if session.topic else "Debate Resolution"
            ai_resp = agent_planner.simulate_sparring_turn(
                motion_text=motion_text,
                user_speech=speech_text,
                ai_persona=session.ai_persona or "Socratic Questioner",
                difficulty=session.ai_opponent_difficulty or "Intermediate",
                round_number=round_number,
            )

            opp_pos = "opposition" if session.active_speaker_position == "proposition" else "proposition"
            ai_turn = self.repo.record_turn(
                session_id=session.id,
                speaker_id=None,
                speaker_position=opp_pos,
                round_number=round_number,
                speech_text=ai_resp.response_speech,
                turn_type="ai_rebuttal",
                wpm=145.0,
                filler_word_count=0,
            )

        return {
            "user_turn": user_turn,
            "ai_turn": ai_turn,
        }
