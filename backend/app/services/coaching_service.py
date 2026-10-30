from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User, UserSkill
from app.models.debate import DebateEvaluation
from app.models.presentation import PresentationAnalysis
from app.models.coaching import CoachingRecommendation

class CoachingService:
    @staticmethod
    def generate_recommendations_for_user(db: Session, user: User) -> List[CoachingRecommendation]:
        # Fetch user's debate evaluations & presentations
        evaluations = db.query(DebateEvaluation).filter(DebateEvaluation.user_id == user.id).all()
        presentations = db.query(PresentationAnalysis).filter(PresentationAnalysis.user_id == user.id).all()

        # Compute averages or identify lowest scoring dimensions
        avg_evidence = sum(e.evidence_usage for e in evaluations) / len(evaluations) if evaluations else 65.0
        avg_logic = sum(e.logical_consistency for e in evaluations) / len(evaluations) if evaluations else 70.0
        avg_rebuttal = sum(e.rebuttal_effectiveness for e in evaluations) / len(evaluations) if evaluations else 68.0
        
        avg_fillers = sum(p.filler_words_count for p in presentations) / len(presentations) if presentations else 6.0
        avg_pace = sum(p.words_per_minute for p in presentations) / len(presentations) if presentations else 135.0

        recommendations_to_create = []

        # 1. Evidence-Based Logic Weakness
        if avg_evidence < 75.0:
            recommendations_to_create.append({
                "category": "Evidence Mastery",
                "title": "Empirical Grounding & Factual Substantiation Drill",
                "description": f"Your average evidence score is {round(avg_evidence, 1)}/100. Debates are won on indisputable empirical warrants. Transition your arguments from qualitative assertions to cited data points.",
                "priority": "High",
                "recommended_exercises": [
                    {"title": "The 3-Stat Scaffold Drill", "type": "Interactive Exercise", "duration": "15 mins", "objective": "Support 3 controversial claims with statistical corroboration."},
                    {"title": "Peer-Reviewed Source Extraction", "type": "Research Module", "duration": "20 mins", "objective": "Practice identifying credible baseline metrics for tech ethics motions."}
                ],
                "personalized_learning_plan": [
                    "Week 1: Memorize 5 versatile meta-analyses on governance & AI.",
                    "Week 2: Practice stating claim -> warrant -> data -> impact in under 45 seconds.",
                    "Week 3: Complete 2 AI Debate matches requiring at least two cited studies per turn."
                ],
                "suggested_debate_topics": [
                    "Resolved: Governments should mandate open-source AI weights for safety transparency.",
                    "This House would impose strict liability on autonomous software manufacturers."
                ],
                "communication_tips": [
                    "Cite the institution and publication year (e.g. 'According to Stanford HAI 2025...').",
                    "Do not merely cite numbers; explain the causal mechanism behind the trend."
                ]
            })

        # 2. Rebuttal & Refutation Weakness
        if avg_rebuttal < 78.0:
            recommendations_to_create.append({
                "category": "Rebuttal Strategy",
                "title": "4-Step Refutation & Turn-around Technique",
                "description": f"Your rebuttal score averages {round(avg_rebuttal, 1)}/100. Rather than simply restating your original point, systematically neutralize your opponent's primary warrant before pivoting.",
                "priority": "Medium",
                "recommended_exercises": [
                    {"title": "Turn-the-Table Drill", "type": "Tactical Drill", "duration": "10 mins", "objective": "Take 3 opponent arguments and turn their own impact against them."},
                    {"title": "Counterargument Rapid Fire", "type": "Speed Adjudication", "duration": "12 mins", "objective": "Generate 3 counter-perspectives within 60 seconds."}
                ],
                "personalized_learning_plan": [
                    "Master the 4-step refutation formula: 'They said X, We say Y, Because of Z, Therefore our impact dominates.'",
                    "Target the link rather than the impact whenever an opponent exaggerates outcomes."
                ],
                "suggested_debate_topics": [
                    "This House would replace traditional patent systems with state prize funds.",
                    "Resolved: Universal Basic Income reduces labor market dynamism."
                ],
                "communication_tips": [
                    "Use signposting: 'First on their premise of cost, second on their assumption of timeline.'",
                    "Concede minor points gracefully to concentrate firepower on decisive clash points."
                ]
            })

        # 3. Speech & Presentation Fillers / Pacing
        if avg_fillers > 3.0 or avg_pace > 155.0:
            recommendations_to_create.append({
                "category": "Speech & Delivery",
                "title": "Vocal Cadence & Filler Elimination Protocol",
                "description": f"Presentation analytics identified an average of {round(avg_fillers, 1)} filler words per speech and pace of {round(avg_pace, 1)} WPM. Eliminating fillers elevates perceived authority by up to 34%.",
                "priority": "High" if avg_fillers > 5 else "Medium",
                "recommended_exercises": [
                    {"title": "The Silent Pause Challenge", "type": "Vocal Drill", "duration": "8 mins", "objective": "Speak for 2 minutes with zero filler words using deliberate 1.5s pauses."},
                    {"title": "Metronome Cadence Training", "type": "Pacing Drill", "duration": "10 mins", "objective": "Deliver a motion speech at a steady 130 WPM rhythm."}
                ],
                "personalized_learning_plan": [
                    "Practice swallowing or breathing in instead of uttering 'um' or 'like'.",
                    "Record a 90-second debate rebuttal daily and review the transcript."
                ],
                "suggested_debate_topics": [
                    "This House believes algorithmic feeds undermine democratic discourse.",
                    "Resolved: Space exploration expenditures should be reallocated to climate mitigation."
                ],
                "communication_tips": [
                    "A pause communicates thoughtfulness and commands audience anticipation.",
                    "Plant your feet firmly and take a diaphragmatic breath before answering tough questions."
                ]
            })

        # Ensure at least 1-2 active recommendations exist
        existing = db.query(CoachingRecommendation).filter(CoachingRecommendation.user_id == user.id).all()
        if not existing and not recommendations_to_create:
            recommendations_to_create.append({
                "category": "Advanced Oratory",
                "title": "Mastery Pathway: Synthesis & World Championship Adjudication",
                "description": "Your baseline skills are balanced. Elevate your debating from competent argumentation to master-level synthesis and framing.",
                "priority": "Medium",
                "recommended_exercises": [
                    {"title": "Whip Speech Synthesis", "type": "Advanced Framing", "duration": "15 mins", "objective": "Condense a 6-turn debate into two clear adjudicative voting issues."}
                ],
                "personalized_learning_plan": [
                    "Study world championship debate finals for structural signposting.",
                    "Engage in Master-difficulty AI simulations."
                ],
                "suggested_debate_topics": [
                    "This House would abolish judicial lifetime appointments.",
                    "Resolved: Central bank digital currencies infringe upon civil liberties."
                ],
                "communication_tips": [
                    "End your speeches with a clear comparative: 'Even if the other side is right on X, we still win on Y.'"
                ]
            })

        saved_recs = []
        for r_data in recommendations_to_create:
            rec = CoachingRecommendation(
                user_id=user.id,
                category=r_data["category"],
                title=r_data["title"],
                description=r_data["description"],
                priority=r_data["priority"],
                recommended_exercises=r_data["recommended_exercises"],
                personalized_learning_plan=r_data["personalized_learning_plan"],
                suggested_debate_topics=r_data["suggested_debate_topics"],
                communication_tips=r_data["communication_tips"]
            )
            db.add(rec)
            saved_recs.append(rec)
        
        if saved_recs:
            db.commit()
            for r in saved_recs:
                db.refresh(r)
        
        return db.query(CoachingRecommendation).filter(CoachingRecommendation.user_id == user.id).all()

coaching_service = CoachingService()
