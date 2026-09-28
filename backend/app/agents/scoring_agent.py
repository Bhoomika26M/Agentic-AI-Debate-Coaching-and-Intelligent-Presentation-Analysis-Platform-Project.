from typing import Dict, Any, List

class ScoringAgent:
    """Agent 7: Performance Scoring Engine - Calculates exact weighted scores per specification (30/20/20/15/15)."""

    def calculate_round_score(
        self,
        argument_analysis: Dict[str, Any],
        fallacies_count: int,
        word_count: int,
        personality: str = "Analytical"
    ) -> Dict[str, float]:
        # Argument Quality (30%)
        arg_strength = argument_analysis.get("argument_strength_score", 75.0)
        relevance = argument_analysis.get("relevance_score", 80.0)
        argument_quality = round((arg_strength * 0.6) + (relevance * 0.4), 1)

        # Evidence Usage (20%)
        evidence_usage = round(argument_analysis.get("evidence_score", 65.0), 1)

        # Logical Consistency (20%)
        consistency_base = argument_analysis.get("consistency_score", 80.0)
        # Deduct 8 points per fallacy detected
        logical_consistency = round(max(40.0, consistency_base - (fallacies_count * 8.0)), 1)

        # Rebuttal Effectiveness (15%)
        persuasiveness = argument_analysis.get("persuasiveness_score", 75.0)
        rebuttal_effectiveness = round((persuasiveness * 0.7) + (arg_strength * 0.3), 1)

        # Communication Skills (15%)
        clarity = argument_analysis.get("clarity_score", 75.0)
        length_bonus = min(10.0, max(0.0, (word_count - 20) / 10.0))
        communication_skills = round(min(98.0, clarity + length_bonus), 1)

        # Weighted calculation strictly following project specs:
        # Argument Quality: 30%
        # Evidence Usage: 20%
        # Logical Consistency: 20%
        # Rebuttal Effectiveness: 15%
        # Communication Skills: 15%
        overall_score = round(
            (argument_quality * 0.30) +
            (evidence_usage * 0.20) +
            (logical_consistency * 0.20) +
            (rebuttal_effectiveness * 0.15) +
            (communication_skills * 0.15),
            1
        )

        return {
            "argument_quality": argument_quality,
            "evidence_usage": evidence_usage,
            "logical_consistency": logical_consistency,
            "rebuttal_effectiveness": rebuttal_effectiveness,
            "communication_skills": communication_skills,
            "overall_score": overall_score
        }

    def aggregate_session_scores(self, round_scores: List[Dict[str, float]]) -> Dict[str, float]:
        if not round_scores:
            return {
                "argument_quality": 75.0,
                "evidence_usage": 70.0,
                "logical_consistency": 75.0,
                "rebuttal_effectiveness": 70.0,
                "communication_skills": 75.0,
                "overall_score": 73.5
            }

        n = len(round_scores)
        aq = round(sum(r["argument_quality"] for r in round_scores) / n, 1)
        eu = round(sum(r["evidence_usage"] for r in round_scores) / n, 1)
        lc = round(sum(r["logical_consistency"] for r in round_scores) / n, 1)
        re = round(sum(r["rebuttal_effectiveness"] for r in round_scores) / n, 1)
        cs = round(sum(r["communication_skills"] for r in round_scores) / n, 1)

        overall = round(
            (aq * 0.30) +
            (eu * 0.20) +
            (lc * 0.20) +
            (re * 0.15) +
            (cs * 0.15),
            1
        )

        return {
            "argument_quality": aq,
            "evidence_usage": eu,
            "logical_consistency": lc,
            "rebuttal_effectiveness": re,
            "communication_skills": cs,
            "overall_score": overall
        }

scoring_agent = ScoringAgent()
