"""
Presentation Analysis Engine — Milestone 4
Provides:
 - Speech text analysis (pace, filler words, clarity, confidence, engagement)
 - Confidence score estimation from linguistic patterns
 - Clarity and audience engagement scoring
 - Prosody and delivery metrics
 - Improvement recommendations
"""

import re
from typing import Literal

# ── Filler words database ──────────────────────────────────────────────────────

FILLER_WORDS = [
    "um", "uh", "er", "ah", "hmm", "like", "you know", "sort of",
    "kind of", "basically", "literally", "actually", "honestly", "right",
    "okay", "so", "well", "anyway", "I mean", "you see",
]

# ── Power / confidence language markers ───────────────────────────────────────

POWER_WORDS = [
    "clearly", "evidently", "undoubtedly", "definitively", "absolutely",
    "crucially", "fundamentally", "significantly", "remarkably", "importantly",
    "demonstrates", "establishes", "proves", "confirms", "reveals",
    "must", "will", "essential", "critical", "vital",
]

HEDGING_WORDS = [
    "maybe", "perhaps", "possibly", "might", "could", "somewhat",
    "I think", "I believe", "I suppose", "sort of", "kind of",
    "probably", "apparently", "seemingly", "arguably",
]

TRANSITION_WORDS = [
    "firstly", "secondly", "thirdly", "furthermore", "moreover", "additionally",
    "however", "nevertheless", "consequently", "therefore", "thus",
    "in conclusion", "to summarise", "for example", "for instance",
    "in contrast", "on the other hand", "in addition", "as a result",
]

ENGAGEMENT_PHRASES = [
    "consider this", "imagine", "picture", "think about", "ask yourself",
    "you might wonder", "here is the key question", "what if",
    "the evidence shows", "studies reveal", "experts agree",
    "most importantly", "above all", "the crucial point",
]

# ── Improvement recommendations library ───────────────────────────────────────

IMPROVEMENT_TIPS = {
    "filler_words": [
        "Replace filler words with deliberate pauses. A 1-2 second pause is far more powerful than 'um'.",
        "Record yourself and mark every filler word occurrence. Conscious awareness accelerates elimination.",
        "Slow down your delivery. Most filler words appear when speakers rush to fill silence.",
    ],
    "pacing": [
        "Practice reading at 120-160 WPM for presentations. Use a metronome app to calibrate.",
        "Vary pace intentionally: slow for key points, faster for supporting detail.",
        "Record your presentation and count words per minute to benchmark progress.",
    ],
    "confidence": [
        "Adopt power posture for 2 minutes before presenting (research-backed confidence booster).",
        "Replace hedging language ('I think', 'maybe') with assertive statements ('The evidence shows').",
        "Rehearse until you can deliver the opening 30 seconds perfectly without notes.",
    ],
    "engagement": [
        "Open with a question, startling statistic, or story — not 'Today I will talk about...'",
        "Use the rule of three: group ideas in threes for memorable rhythm and structure.",
        "Incorporate direct audience address: 'Consider this from your own experience...'",
    ],
    "clarity": [
        "The KISS principle: Keep it Simple and Specific. One idea per sentence.",
        "Use active voice. 'The policy reduces costs' beats 'Costs are reduced by the policy'.",
        "Summarise your key message in one sentence. If you cannot, your argument needs clarity work.",
    ],
    "structure": [
        "Every presentation needs: Hook → Context → Main Points → Evidence → Call to Action.",
        "Use signposting: 'Moving to my second point...' helps audiences track structure.",
        "Prepare a crisp one-sentence conclusion that captures your entire message.",
    ],
}


class PresentationAnalysisEngine:

    def analyze_speech_text(
        self,
        transcript: str,
        duration_seconds: int | None = None,
        title: str | None = None,
    ) -> dict:
        """Fully analyse a speech transcript and return presentation metrics."""
        text = transcript.strip()
        words = text.split()
        word_count = len(words)
        char_count = len(text)
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        sentence_count = len(sentences) or 1
        avg_words_per_sentence = round(word_count / sentence_count, 1)

        # ── Filler word analysis ──────────────────────────────────────────────
        text_lower = text.lower()
        filler_counts = {}
        total_fillers = 0
        for fw in FILLER_WORDS:
            pattern = r'\b' + re.escape(fw) + r'\b'
            count = len(re.findall(pattern, text_lower))
            if count > 0:
                filler_counts[fw] = count
                total_fillers += count

        filler_rate = round((total_fillers / word_count * 100), 1) if word_count > 0 else 0
        filler_score = max(0, 100 - filler_rate * 10)  # 10 pts per 1% filler rate

        # ── Speaking pace ─────────────────────────────────────────────────────
        if duration_seconds and duration_seconds > 0:
            wpm = round(word_count / (duration_seconds / 60), 0)
        else:
            wpm = None

        # Ideal range: 120-160 WPM
        if wpm:
            if 120 <= wpm <= 160:
                pace_score = 100
            elif wpm < 100 or wpm > 200:
                pace_score = 50
            elif 100 <= wpm < 120 or 160 < wpm <= 200:
                pace_score = 75
            else:
                pace_score = 65
            pace_label = "Ideal" if 120 <= wpm <= 160 else ("Too Fast" if wpm > 160 else "Too Slow")
        else:
            pace_score = None
            wpm = self._estimate_wpm(word_count)
            pace_label = "Estimated (no duration provided)"

        # ── Confidence analysis ───────────────────────────────────────────────
        power_count = sum(1 for pw in POWER_WORDS if re.search(r'\b' + re.escape(pw) + r'\b', text_lower))
        hedge_count = sum(1 for hw in HEDGING_WORDS if re.search(r'\b' + re.escape(hw) + r'\b', text_lower))
        confidence_raw = (power_count - hedge_count * 0.5) / max(1, word_count / 100)
        confidence_score = min(100, max(30, 60 + confidence_raw * 15))

        # ── Clarity analysis ──────────────────────────────────────────────────
        # Long sentences reduce clarity
        long_sentences = [s for s in sentences if len(s.split()) > 30]
        long_sentence_penalty = len(long_sentences) * 5
        # Active voice approximation (avoid passive markers)
        passive_markers = len(re.findall(r'\b(is|are|was|were|been|being)\s+\w+ed\b', text_lower))
        passive_penalty = passive_markers * 3
        clarity_score = max(30, 85 - long_sentence_penalty - passive_penalty)

        # ── Engagement analysis ───────────────────────────────────────────────
        engagement_hits = sum(1 for phrase in ENGAGEMENT_PHRASES
                              if phrase.lower() in text_lower)
        transition_hits = sum(1 for tw in TRANSITION_WORDS
                              if re.search(r'\b' + re.escape(tw) + r'\b', text_lower))
        # Questions are engaging
        question_count = text.count('?')
        engagement_raw = (engagement_hits * 8) + (transition_hits * 5) + (question_count * 4)
        engagement_score = min(100, max(20, 40 + engagement_raw))

        # ── Structure analysis ────────────────────────────────────────────────
        has_opener = any(kw in text_lower[:200] for kw in [
            "today", "i want", "let me", "consider", "imagine", "what if", "question", "story"
        ])
        has_transitions = transition_hits >= 2
        has_conclusion = any(kw in text_lower[-300:] for kw in [
            "conclusion", "in summary", "therefore", "to conclude", "finally", "ultimately", "thus"
        ])
        structure_score = 40 + (20 if has_opener else 0) + (20 if has_transitions else 0) + (20 if has_conclusion else 0)

        # ── Overall presentation score ────────────────────────────────────────
        base_pace = pace_score if pace_score else 70
        overall = round(
            filler_score * 0.20 +
            base_pace * 0.15 +
            confidence_score * 0.25 +
            clarity_score * 0.20 +
            engagement_score * 0.10 +
            structure_score * 0.10,
            1
        )

        grade = self._grade(overall)

        # ── Strengths ─────────────────────────────────────────────────────────
        strengths = []
        if filler_score >= 80:
            strengths.append("Excellent filler word control — your speech flows cleanly.")
        if confidence_score >= 75:
            strengths.append("Strong confident language choices — assertive and authoritative tone.")
        if clarity_score >= 80:
            strengths.append("High clarity — sentences are appropriately concise and direct.")
        if engagement_score >= 70:
            strengths.append("Good audience engagement techniques — you use rhetorical devices effectively.")
        if structure_score >= 80:
            strengths.append("Well-structured presentation with clear opener, body, and conclusion.")
        if not strengths:
            strengths.append("You completed the presentation — that is the first step. Focus on the improvements below.")

        # ── Areas for improvement ─────────────────────────────────────────────
        improvements = []
        priority_tips = []
        if filler_score < 70:
            improvements.append(f"High filler word rate ({filler_rate:.1f}%) — {total_fillers} filler instances detected.")
            priority_tips.extend(IMPROVEMENT_TIPS["filler_words"][:2])
        if confidence_score < 65:
            improvements.append("Hedging language undermines your credibility. Use more assertive phrasing.")
            priority_tips.extend(IMPROVEMENT_TIPS["confidence"][:2])
        if clarity_score < 65:
            improvements.append("Some sentences are overly complex. Aim for an average of under 20 words per sentence.")
            priority_tips.extend(IMPROVEMENT_TIPS["clarity"][:2])
        if engagement_score < 60:
            improvements.append("Limited engagement techniques. Add rhetorical questions, stories, or vivid examples.")
            priority_tips.extend(IMPROVEMENT_TIPS["engagement"][:2])
        if structure_score < 60:
            improvements.append("Structure needs work: ensure a strong opener, clear transitions, and a memorable conclusion.")
            priority_tips.extend(IMPROVEMENT_TIPS["structure"][:2])
        if wpm and wpm > 170:
            improvements.append(f"Speaking pace of ~{wpm} WPM is too fast. Target 120-160 WPM for maximum comprehension.")
            priority_tips.extend(IMPROVEMENT_TIPS["pacing"][:2])

        return {
            "title": title or "Speech Analysis",
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_words_per_sentence": avg_words_per_sentence,
            "estimated_wpm": wpm,
            "pace_label": pace_label,
            "filler_word_count": total_fillers,
            "filler_rate_percent": filler_rate,
            "top_filler_words": sorted(filler_counts.items(), key=lambda x: -x[1])[:5],
            "scores": {
                "filler_control": round(filler_score, 1),
                "pace": round(base_pace, 1),
                "confidence": round(confidence_score, 1),
                "clarity": round(clarity_score, 1),
                "engagement": round(engagement_score, 1),
                "structure": round(structure_score, 1),
                "overall": overall,
            },
            "overall_score": overall,
            "grade": grade,
            "strengths": strengths,
            "improvements": improvements,
            "priority_tips": list(dict.fromkeys(priority_tips))[:6],
            "structure_analysis": {
                "has_strong_opener": has_opener,
                "has_clear_transitions": has_transitions,
                "has_conclusion": has_conclusion,
                "transition_count": transition_hits,
                "question_count": question_count,
            },
            "language_metrics": {
                "power_words_used": power_count,
                "hedging_words_used": hedge_count,
                "engagement_phrases_used": engagement_hits,
                "long_sentences": len(long_sentences),
                "passive_constructions": passive_markers,
            },
        }

    def get_presentation_tips(self, category: str | None = None) -> list[dict]:
        """Return curated presentation improvement tips by category."""
        tips = []
        categories = [category] if category and category in IMPROVEMENT_TIPS else list(IMPROVEMENT_TIPS.keys())
        for cat in categories:
            for tip in IMPROVEMENT_TIPS[cat]:
                tips.append({"category": cat.replace("_", " ").title(), "tip": tip})
        return tips

    def _estimate_wpm(self, word_count: int) -> int:
        """Estimate WPM assuming average speaker speed."""
        return 130  # Average speaker speed

    @staticmethod
    def _grade(score: float) -> str:
        if score >= 90: return "A+"
        if score >= 85: return "A"
        if score >= 80: return "A-"
        if score >= 75: return "B+"
        if score >= 70: return "B"
        if score >= 65: return "B-"
        if score >= 60: return "C+"
        if score >= 55: return "C"
        return "C-"


presentation_engine = PresentationAnalysisEngine()
