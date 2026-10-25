import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FillerWordDetail(BaseModel):
    word: str
    count: int

class PresentationMetrics(BaseModel):
    # Core Presentation Metrics specified in Section 6 & 7:
    # Speech Pace, Filler Word Usage, Confidence Score, Clarity Score, Audience Engagement Score
    speech_duration_sec: float
    total_words: int
    words_per_minute: float
    pace_rating: str  # Optimal (130-160 WPM), Slightly Rushed, Too Fast, Deliberate / Slow
    filler_words_count: int
    filler_word_density_percent: float  # (fillers / total_words) * 100
    filler_breakdown: List[FillerWordDetail]
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    clarity_score: float = Field(..., ge=0.0, le=100.0)
    audience_engagement_score: float = Field(..., ge=0.0, le=100.0)
    composite_presentation_score: float = Field(..., ge=0.0, le=100.0)
    delivery_feedback: List[str] = []

class PresentationAnalyticsEngine:
    """
    Engine to evaluate spoken presentation dynamics including pacing (WPM),
    filler word verbal crutches, vocal confidence, clarity, and audience engagement.
    """

    FILLER_WORD_PATTERNS = [
        r"\bum\b", r"\buh\b", r"\ber\b", r"\bah\b",
        r"\blike\b", r"\byou know\b", r"\bbasically\b",
        r"\bactually\b", r"\bliterally\b", r"\bsort of\b",
        r"\bkind of\b", r"\bi mean\b"
    ]

    HEDGING_PATTERNS = [
        r"\bi think maybe\b", r"\bi guess\b", r"\bsort of\b",
        r"\bkind of\b", r"\bprobably\b", r"\bperhaps\b",
        r"\bi'm not an expert but\b", r"\bi might be wrong but\b"
    ]

    ASSERTIVE_PATTERNS = [
        r"\bwe must\b", r"\bdecisively\b", r"\bthe data proves\b",
        r"\bundeniably\b", r"\bit is imperative\b", r"\bwe stand firmly\b",
        r"\bthe evidence confirms\b", r"\bclearly\b"
    ]

    ENGAGEMENT_PATTERNS = [
        r"\bimagine\b", r"\bconsider this\b", r"\bask yourselves\b",
        r"\bwe all know\b", r"\btogether we\b", r"\bwhat does this mean for\b",
        r"\?", r"\blook at\b"
    ]

    def analyze_presentation(
        self,
        text: str,
        audio_duration_sec: Optional[float] = None
    ) -> PresentationMetrics:
        if not text or not text.strip():
            return PresentationMetrics(
                speech_duration_sec=0.0,
                total_words=0,
                words_per_minute=0.0,
                pace_rating="No speech detected",
                filler_words_count=0,
                filler_word_density_percent=0.0,
                filler_breakdown=[],
                confidence_score=50.0,
                clarity_score=50.0,
                audience_engagement_score=50.0,
                composite_presentation_score=50.0,
                delivery_feedback=["Deliver a longer speech round to measure presentation dynamics."]
            )

        words = re.findall(r'\b\w+\b', text)
        total_words = len(words)
        text_lower = text.lower()

        # If duration is not provided, estimate standard speaking duration (avg 140 WPM)
        duration_sec = audio_duration_sec if (audio_duration_sec and audio_duration_sec > 5) else max(10.0, (total_words / 140.0) * 60.0)

        # 1. Pacing & Words Per Minute
        wpm = round((total_words / duration_sec) * 60.0, 1)
        if 130.0 <= wpm <= 165.0:
            pace_rating = "Optimal Debate Cadence (130-165 WPM)"
        elif 110.0 <= wpm < 130.0:
            pace_rating = "Deliberate & Measured"
        elif wpm < 110.0:
            pace_rating = "Too Slow / Disjointed"
        elif 165.0 < wpm <= 190.0:
            pace_rating = "Slightly Rushed"
        else:
            pace_rating = "Too Fast (Inaudible Threshold)"

        # 2. Filler Words Breakdown
        filler_breakdown: List[FillerWordDetail] = []
        total_fillers = 0

        for pattern in self.FILLER_WORD_PATTERNS:
            matches = re.findall(pattern, text_lower)
            if matches:
                count = len(matches)
                word_clean = pattern.replace(r"\b", "").strip()
                filler_breakdown.append(FillerWordDetail(word=word_clean, count=count))
                total_fillers += count

        filler_density = round((total_fillers / max(1, total_words)) * 100.0, 2)

        # 3. Confidence Score Calculation
        hedging_count = sum(len(re.findall(p, text_lower)) for p in self.HEDGING_PATTERNS)
        assertive_count = sum(len(re.findall(p, text_lower)) for p in self.ASSERTIVE_PATTERNS)

        confidence = 75.0 - (hedging_count * 8.0) - (filler_density * 4.0) + (assertive_count * 6.0)
        confidence = max(20.0, min(98.0, round(confidence, 1)))

        # 4. Clarity Score Calculation
        # Evaluates sentence structure and vocabulary balance
        sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 3]
        avg_sentence_len = total_words / max(1, len(sentences))

        clarity = 85.0
        if avg_sentence_len > 28:
            clarity -= 15.0  # Run-on sentences
        elif avg_sentence_len < 6:
            clarity -= 10.0  # Choppy fragments
        clarity -= min(25.0, filler_density * 5.0)
        clarity = max(25.0, min(95.0, round(clarity, 1)))

        # 5. Audience Engagement Score Calculation
        engagement_hits = sum(len(re.findall(p, text_lower)) for p in self.ENGAGEMENT_PATTERNS)
        engagement = min(96.0, max(30.0, 55.0 + (engagement_hits * 7.0)))
        engagement = round(engagement, 1)

        # Composite Presentation Score
        composite = round(
            (confidence * 0.30) +
            (clarity * 0.30) +
            (engagement * 0.25) +
            ((100.0 - min(60.0, filler_density * 10.0)) * 0.15),
            1
        )

        feedback = []
        if wpm > 175.0:
            feedback.append(f"Your pace is {wpm} WPM. Insert intentional pauses between major warrants to allow points to resonate with adjudicators.")
        elif wpm < 115.0:
            feedback.append(f"Your pace is {wpm} WPM. Accelerate delivery cadence to ensure all constructive arguments fit into the allocated round.")
        else:
            feedback.append("Excellent speech pacing maintaining optimal parliamentary intelligibility.")

        if filler_density > 3.0:
            top_fillers = ", ".join([f"'{f.word}' ({f.count}x)" for f in filler_breakdown[:3]])
            feedback.append(f"High vocal crutch density ({filler_density}%). Practice substituting silent pauses instead of {top_fillers}.")
        else:
            feedback.append("Superb verbal discipline with minimal filler word interruptions.")

        if hedging_count > 0:
            feedback.append("Replace hedging statements ('I think', 'maybe') with assertive propositional declarations.")

        return PresentationMetrics(
            speech_duration_sec=round(duration_sec, 1),
            total_words=total_words,
            words_per_minute=wpm,
            pace_rating=pace_rating,
            filler_words_count=total_fillers,
            filler_word_density_percent=filler_density,
            filler_breakdown=filler_breakdown,
            confidence_score=confidence,
            clarity_score=clarity,
            audience_engagement_score=engagement,
            composite_presentation_score=composite,
            delivery_feedback=feedback
        )

presentation_engine = PresentationAnalyticsEngine()
