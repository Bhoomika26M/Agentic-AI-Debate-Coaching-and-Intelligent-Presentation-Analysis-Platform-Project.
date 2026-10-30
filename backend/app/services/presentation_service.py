import os
import re
import math
from typing import Dict, Any, List, Optional
from openai import OpenAI
from app.core.config import settings

COMMON_FILLER_WORDS = [
    "um", "uh", "er", "ah", "like", "you know", "basically", 
    "actually", "literally", "sort of", "kind of", "right", "i mean", "so yeah"
]

class PresentationService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY
        self.client = None
        if self.api_key and not self.api_key.startswith("your-") and len(self.api_key) > 10:
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception:
                self.client = None

    def transcribe_audio(self, file_path: str) -> Optional[str]:
        if self.client:
            try:
                with open(file_path, "rb") as audio_file:
                    transcript_obj = self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="text"
                    )
                    return str(transcript_obj).strip()
            except Exception as e:
                print(f"Whisper API transcription failed or unavailable: {e}")
        return None

    def estimate_audio_duration(self, file_path: str) -> float:
        """Estimates duration from file size/metadata safely."""
        try:
            size_bytes = os.path.getsize(file_path)
            # Estimate roughly for typical 128kbps audio: 16000 bytes per second
            approx_duration = max(5.0, size_bytes / 16000.0)
            return round(min(approx_duration, 600.0), 1)
        except Exception:
            return 45.0

    def analyze_speech_content(self, transcription: str, duration_seconds: float) -> Dict[str, Any]:
        """
        Extracts speech pace, filler word frequency, clarity, repetition,
        and transparently labeled inferred metrics (confidence, engagement).
        """
        words = re.findall(r"\b[A-Za-z']+\b", transcription.lower())
        total_words = len(words)
        duration_minutes = max(0.1, duration_seconds / 60.0)
        
        wpm = round(total_words / duration_minutes, 1) if duration_minutes > 0 else 130.0

        # Pacing assessment
        if wpm < 110:
            pace_label = "Deliberate / Slow (<110 WPM)"
        elif 110 <= wpm <= 155:
            pace_label = "Optimal / Engaging (110-155 WPM)"
        elif 156 <= wpm <= 175:
            pace_label = "Brisk (156-175 WPM)"
        else:
            pace_label = "Rushed (>175 WPM)"

        # Filler words analysis
        filler_breakdown: Dict[str, int] = {}
        total_fillers = 0
        raw_text_lower = transcription.lower()

        for filler in COMMON_FILLER_WORDS:
            # Look for exact word boundary matches
            pattern = r'\b' + re.escape(filler) + r'\b'
            matches = len(re.findall(pattern, raw_text_lower))
            if matches > 0:
                filler_breakdown[filler] = matches
                total_fillers += matches

        filler_rate = (total_fillers / max(1, total_words)) * 100

        # Repetition detection (repeated consecutive words or bigrams)
        repeated_words = []
        for i in range(len(words) - 1):
            if words[i] == words[i+1] and len(words[i]) > 2 and words[i] not in repeated_words:
                repeated_words.append(words[i])

        # Pauses detection estimation based on punctuation & structure
        sentence_count = len(re.findall(r'[.!?]+', transcription))
        comma_count = transcription.count(',')
        pauses_detected = max(2, sentence_count + int(comma_count * 0.7))

        # Inferred metrics calculation (clearly designated with scientific transparency)
        # Clarity Score: penalize excessive fillers and extreme WPM
        pace_penalty = abs(wpm - 135) * 0.3
        filler_penalty = min(25.0, filler_rate * 4.0)
        clarity_score = round(max(50.0, min(96.0, 92.0 - pace_penalty - filler_penalty)), 1)

        # Confidence Score (Inferred from pacing consistency, lexical assertiveness)
        assertive_words = ["definitely", "demonstrates", "evidence", "proven", "conclude", "significant", "crucial", "fundamental"]
        assertive_count = sum(1 for w in words if w in assertive_words)
        confidence_score = round(max(52.0, min(95.0, 75.0 + (assertive_count * 2.5) - (filler_penalty * 0.7))), 1)

        # Audience Engagement Score (Inferred from rhetorical pacing, variety, and structure)
        engagement_score = round(max(55.0, min(94.0, (clarity_score * 0.5) + (confidence_score * 0.4) + (8.0 if 120 <= wpm <= 150 else 2.0))), 1)

        overall_score = round((clarity_score * 0.35 + confidence_score * 0.35 + engagement_score * 0.30), 1)

        # Diagnostic Feedback
        strengths = []
        weaknesses = []
        recommendations = []

        if 115 <= wpm <= 150:
            strengths.append(f"Ideal speaking pace ({wpm} WPM) allowing listeners to digest complex ideas effortlessly.")
        elif wpm > 155:
            weaknesses.append(f"Elevated speed ({wpm} WPM) risks losing audience retention on nuanced points.")
            recommendations.append("Insert purposeful 2-second micro-pauses before and after key punchlines.")
        else:
            weaknesses.append(f"Pacing is on the slower end ({wpm} WPM), which may dampen rhetorical urgency.")
            recommendations.append("Gradually elevate cadence during persuasive climaxes to build momentum.")

        if total_fillers <= 2:
            strengths.append(f"Exceptional lexical discipline: only {total_fillers} filler words identified.")
        else:
            weaknesses.append(f"Identified {total_fillers} filler word occurrences ({', '.join(list(filler_breakdown.keys())[:3])}).")
            recommendations.append("Practice the 'Breathe Instead of Fill' technique to replace 'um' with silent confidence pauses.")

        if clarity_score >= 80:
            strengths.append("High articulation clarity with coherent phonetic flow and distinct syntactic division.")
        
        recommendations.append("Vary vocal pitch across topic transitions to sustain higher active audience engagement.")

        return {
            "duration_seconds": duration_seconds,
            "transcription": transcription,
            "words_per_minute": wpm,
            "speech_pace_label": pace_label,
            "total_words": total_words,
            "filler_words_count": total_fillers,
            "filler_words_breakdown": filler_breakdown,
            "repeated_words": repeated_words[:5],
            "pauses_detected": pauses_detected,
            "confidence_score": confidence_score,
            "clarity_score": clarity_score,
            "audience_engagement_score": engagement_score,
            "overall_presentation_score": overall_score,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "improvement_recommendations": recommendations
        }

presentation_service = PresentationService()
