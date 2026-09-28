from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import datetime
from backend.app.database.session import get_db
from backend.app.models.entities import (
    User, DebateSession, DebateRound, Argument, Claim, Evidence,
    Fallacy, Counterargument, DebateScore, DebateTopic
)
from backend.app.schemas.debate import (
    DebateCreate, DebateRoundSubmit, DebateSessionResponse, ArgumentAnalysisResponse
)
from backend.app.auth.dependencies import get_current_active_user
from backend.app.agents.orchestrator import orchestrator
from backend.app.agents.scoring_agent import scoring_agent

router = APIRouter(prefix="/debates", tags=["Debates"])

@router.get("/topics/recommended")
def get_recommended_topics(db: Session = Depends(get_db)):
    topics = db.query(DebateTopic).all()
    return topics

@router.post("", response_model=Dict[str, Any])
async def create_debate(
    debate_in: DebateCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = DebateSession(
        user_id=current_user.id,
        topic=debate_in.topic,
        position=debate_in.position,
        format=debate_in.format,
        difficulty=debate_in.difficulty,
        duration_minutes=debate_in.duration_minutes,
        ai_opponent_personality=debate_in.ai_opponent_personality,
        rounds_count=debate_in.rounds_count,
        current_round=1,
        status="active"
    )
    db.add(session)
    db.flush()

    # Generate initial opening speech from AI opponent
    opening_speech = await orchestrator.generate_opening_argument(
        topic=debate_in.topic,
        user_position=debate_in.position,
        personality=debate_in.ai_opponent_personality,
        format_type=debate_in.format
    )

    first_round = DebateRound(
        session_id=session.id,
        round_number=1,
        user_transcript=None,
        ai_transcript=opening_speech
    )
    db.add(first_round)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "topic": session.topic,
        "position": session.position,
        "format": session.format,
        "difficulty": session.difficulty,
        "duration_minutes": session.duration_minutes,
        "ai_opponent_personality": session.ai_opponent_personality,
        "rounds_count": session.rounds_count,
        "current_round": session.current_round,
        "status": session.status,
        "initial_ai_opening": opening_speech,
        "created_at": session.created_at
    }

@router.get("", response_model=List[Dict[str, Any]])
def list_my_debates(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(DebateSession).filter(DebateSession.user_id == current_user.id).order_by(DebateSession.created_at.desc()).all()
    results = []
    for s in sessions:
        results.append({
            "id": s.id,
            "topic": s.topic,
            "position": s.position,
            "format": s.format,
            "difficulty": s.difficulty,
            "status": s.status,
            "rounds_count": s.rounds_count,
            "current_round": s.current_round,
            "overall_score": s.score.overall_score if s.score else None,
            "created_at": s.created_at
        })
    return results

@router.get("/{id}", response_model=Dict[str, Any])
def get_debate(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    # Check permissions
    if session.user_id != current_user.id and current_user.role not in ["coach", "educator", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view this debate session")

    rounds_data = []
    for r in session.rounds:
        round_args = []
        for a in r.arguments:
            round_args.append({
                "speaker": a.speaker,
                "text": a.raw_text,
                "strength": a.argument_strength_score,
                "clarity": a.clarity_score,
                "relevance": a.relevance_score,
                "evidence": a.evidence_score,
                "consistency": a.consistency_score,
                "persuasiveness": a.persuasiveness_score,
                "improved": a.improved_version,
                "claims": [{"text": c.text, "type": c.claim_type} for c in a.claims],
                "evidence_items": [{"text": e.text, "type": e.evidence_type, "score": e.strength_score} for e in a.evidence],
                "fallacies": [{
                    "name": f.fallacy_name,
                    "confidence": f.confidence,
                    "statement": f.problematic_statement,
                    "explanation": f.explanation,
                    "why_problematic": f.why_problematic,
                    "correct_reasoning": f.correct_reasoning,
                    "suggested_correction": f.suggested_correction,
                    "improved": f.improved_argument
                } for f in a.fallacies]
            })

        rebuttals = []
        for ca in r.counterarguments:
            rebuttals.append({
                "logical": ca.logical_rebuttal,
                "evidence": ca.evidence_rebuttal,
                "ethical": ca.ethical_rebuttal,
                "practical": ca.practical_rebuttal,
                "policy": ca.policy_rebuttal,
                "challenge_questions": json.loads(ca.challenge_questions) if ca.challenge_questions else [],
                "strategy": ca.strategy_suggestions,
                "explanation": ca.explanation
            })

        rounds_data.append({
            "round_number": r.round_number,
            "user_transcript": r.user_transcript,
            "ai_transcript": r.ai_transcript,
            "arguments": round_args,
            "counterarguments": rebuttals
        })

    score_data = None
    if session.score:
        score_data = {
            "argument_quality": session.score.argument_quality,
            "evidence_usage": session.score.evidence_usage,
            "logical_consistency": session.score.logical_consistency,
            "rebuttal_effectiveness": session.score.rebuttal_effectiveness,
            "communication_skills": session.score.communication_skills,
            "overall_score": session.score.overall_score,
            "strongest_argument": session.score.strongest_argument,
            "weakest_argument": session.score.weakest_argument,
            "best_rebuttal": session.score.best_rebuttal,
            "detected_fallacies_count": session.score.detected_fallacies_count,
            "missing_evidence": session.score.missing_evidence,
            "suggested_improvement": session.score.suggested_improvement,
            "coaching_summary": session.score.coaching_summary,
            "next_practice_exercise": session.score.next_practice_exercise
        }

    return {
        "id": session.id,
        "topic": session.topic,
        "position": session.position,
        "format": session.format,
        "difficulty": session.difficulty,
        "duration_minutes": session.duration_minutes,
        "ai_opponent_personality": session.ai_opponent_personality,
        "rounds_count": session.rounds_count,
        "current_round": session.current_round,
        "status": session.status,
        "rounds": rounds_data,
        "score": score_data,
        "created_at": session.created_at
    }

@router.post("/{id}/rounds", response_model=Dict[str, Any])
async def submit_round_argument(
    id: int,
    round_in: DebateRoundSubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Debate session is already completed")

    current_round_num = session.current_round

    # Retrieve history for context
    history = []
    for r in session.rounds:
        if r.user_transcript:
            history.append({"speaker": "user", "text": r.user_transcript})
        if r.ai_transcript:
            history.append({"speaker": "ai", "text": r.ai_transcript})

    # Run Multi-Agent Orchestrator
    orchestration_result = await orchestrator.process_user_turn(
        topic=session.topic,
        user_position=session.position,
        format_type=session.format,
        difficulty=session.difficulty,
        personality=session.ai_opponent_personality,
        user_argument=round_in.argument_text,
        round_number=current_round_num,
        conversation_history=history
    )

    # Save to DebateRound
    current_round_obj = db.query(DebateRound).filter(
        DebateRound.session_id == session.id,
        DebateRound.round_number == current_round_num
    ).first()

    if not current_round_obj:
        current_round_obj = DebateRound(
            session_id=session.id,
            round_number=current_round_num
        )
        db.add(current_round_obj)
        db.flush()

    current_round_obj.user_transcript = round_in.argument_text
    current_round_obj.ai_transcript = orchestration_result["ai_transcript"]

    # Save Argument entity
    arg_analysis = orchestration_result["argument_analysis"]
    arg_entity = Argument(
        round_id=current_round_obj.id,
        speaker="user",
        raw_text=round_in.argument_text,
        argument_strength_score=arg_analysis.get("argument_strength_score", 75.0),
        reasoning_quality_score=arg_analysis.get("reasoning_quality_score", 70.0),
        clarity_score=arg_analysis.get("clarity_score", 75.0),
        relevance_score=arg_analysis.get("relevance_score", 80.0),
        evidence_score=arg_analysis.get("evidence_score", 65.0),
        consistency_score=arg_analysis.get("consistency_score", 75.0),
        persuasiveness_score=arg_analysis.get("persuasiveness_score", 72.0),
        improved_version=arg_analysis.get("improved_version", "")
    )
    db.add(arg_entity)
    db.flush()

    # Save Claims
    for c in arg_analysis.get("claims", []):
        db.add(Claim(argument_id=arg_entity.id, text=c.get("text", ""), claim_type=c.get("claim_type", "Main Claim")))

    # Save Evidence
    for e in arg_analysis.get("evidence", []):
        db.add(Evidence(
            argument_id=arg_entity.id,
            text=e.get("text", ""),
            evidence_type=e.get("evidence_type", "Empirical"),
            relevance_score=e.get("relevance_score", 75.0),
            strength_score=e.get("strength_score", 70.0),
            quality_score=e.get("quality_score", 70.0),
            sufficiency_score=e.get("sufficiency_score", 70.0)
        ))

    # Save Fallacies
    for f in orchestration_result.get("fallacies", []):
        db.add(Fallacy(
            argument_id=arg_entity.id,
            fallacy_name=f.get("fallacy_name", ""),
            confidence=f.get("confidence", 0.8),
            problematic_statement=f.get("problematic_statement", ""),
            explanation=f.get("explanation", ""),
            why_problematic=f.get("why_problematic", ""),
            correct_reasoning=f.get("correct_reasoning", ""),
            suggested_correction=f.get("suggested_correction", ""),
            improved_argument=f.get("improved_argument", "")
        ))

    # Save Counterargument
    ca = orchestration_result.get("counterarguments", {})
    db.add(Counterargument(
        round_id=current_round_obj.id,
        logical_rebuttal=ca.get("logical_rebuttal", ""),
        evidence_rebuttal=ca.get("evidence_rebuttal", ""),
        ethical_rebuttal=ca.get("ethical_rebuttal", ""),
        practical_rebuttal=ca.get("practical_rebuttal", ""),
        policy_rebuttal=ca.get("policy_rebuttal", ""),
        challenge_questions=json.dumps(ca.get("challenge_questions", [])),
        strategy_suggestions=ca.get("strategy_suggestions", ""),
        explanation=ca.get("explanation", "")
    ))

    # Increment round or check completion
    is_final_round = current_round_num >= session.rounds_count
    if not is_final_round:
        session.current_round += 1
    
    db.commit()

    return {
        "round_number": current_round_num,
        "is_final_round": is_final_round,
        "next_round": session.current_round,
        "ai_response": orchestration_result["ai_transcript"],
        "analysis": arg_analysis,
        "fallacies": orchestration_result["fallacies"],
        "counterarguments": orchestration_result["counterarguments"],
        "challenges": orchestration_result["challenges"],
        "coaching": orchestration_result["coaching"],
        "score": orchestration_result["score"]
    }

@router.post("/{id}/end", response_model=Dict[str, Any])
def end_debate(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    session.status = "completed"

    # Compute aggregate scores from all rounds
    round_scores = []
    total_fallacies = 0
    all_arguments = []

    for r in session.rounds:
        for a in r.arguments:
            if a.speaker == "user":
                fallacies_cnt = len(a.fallacies)
                total_fallacies += fallacies_cnt
                word_count = len(a.raw_text.split())
                analysis_dict = {
                    "argument_strength_score": a.argument_strength_score,
                    "relevance_score": a.relevance_score,
                    "evidence_score": a.evidence_score,
                    "consistency_score": a.consistency_score,
                    "persuasiveness_score": a.persuasiveness_score,
                    "clarity_score": a.clarity_score
                }
                r_score = scoring_agent.calculate_round_score(analysis_dict, fallacies_cnt, word_count, session.ai_opponent_personality)
                round_scores.append(r_score)
                all_arguments.append(a.raw_text)

    aggregate = scoring_agent.aggregate_session_scores(round_scores)

    strongest = all_arguments[0] if all_arguments else "Core premise defending primary societal benefit."
    weakest = all_arguments[-1] if len(all_arguments) > 1 else "Rebuttal vulnerable to empirical trade-offs."

    # Save or update DebateScore
    if not session.score:
        score_obj = DebateScore(
            session_id=session.id,
            argument_quality=aggregate["argument_quality"],
            evidence_usage=aggregate["evidence_usage"],
            logical_consistency=aggregate["logical_consistency"],
            rebuttal_effectiveness=aggregate["rebuttal_effectiveness"],
            communication_skills=aggregate["communication_skills"],
            overall_score=aggregate["overall_score"],
            strongest_argument=strongest[:200],
            weakest_argument=weakest[:200],
            best_rebuttal="Targeted deconstruction of opponent's operational feasibility premise.",
            detected_fallacies_count=total_fallacies,
            missing_evidence="Lack of peer-reviewed longitudinal statistical comparisons.",
            suggested_improvement="Provide concrete quantitative benchmarks earlier in the contention phase.",
            coaching_summary=f"Strong performance across {session.rounds_count} rounds. Overall mastery: {aggregate['overall_score']}/100.",
            next_practice_exercise="Fallacy Identification: Straw Man Deconstruction" if total_fallacies > 0 else "Finding Empirical Evidence for Policy Stance"
        )
        db.add(score_obj)
    else:
        session.score.overall_score = aggregate["overall_score"]
        session.score.argument_quality = aggregate["argument_quality"]
        session.score.evidence_usage = aggregate["evidence_usage"]
        session.score.logical_consistency = aggregate["logical_consistency"]
        session.score.rebuttal_effectiveness = aggregate["rebuttal_effectiveness"]
        session.score.communication_skills = aggregate["communication_skills"]

    db.commit()

    return {
        "session_id": session.id,
        "status": "completed",
        "scores": aggregate,
        "strongest_argument": strongest[:200],
        "weakest_argument": weakest[:200],
        "fallacies_detected": total_fallacies,
        "coaching_summary": session.score.coaching_summary if session.score else "Debate completed successfully.",
        "next_exercise": session.score.next_practice_exercise if session.score else "Finding Empirical Evidence for Policy Stance"
    }
