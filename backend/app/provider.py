"""AI provider boundary. Gemini is opt-in; local analysis is always available."""
import json
from urllib.parse import quote
from urllib.request import Request, urlopen

from .analysis import analyze_transcript
from .config import settings


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = (api_key or settings.gemini_api_key).strip()
        self.model = model or settings.gemini_model

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def analyze(self, transcript: str, topic: str, position: str) -> dict:
        if not self.available:
            raise RuntimeError("Gemini is not configured")
        prompt = (
            "Analyze this debate transcript. Return JSON with keys: summary, strengths, "
            "improvements. Keep each value concise. Topic: %s Position: %s Transcript: %s"
            % (topic, position, transcript)
        )
        url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s" % (
            quote(self.model), quote(self.api_key)
        )
        request = Request(url, data=json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode(),
                          headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode())
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        try:
            return json.loads(text.strip().removeprefix("```json").removesuffix("```").strip())
        except (json.JSONDecodeError, KeyError, IndexError) as exc:
            raise RuntimeError("Gemini returned an invalid analysis") from exc


class AnalysisProvider:
    """Use Gemini when configured, while preserving deterministic local behavior."""

    def __init__(self, gemini: GeminiProvider | None = None):
        self.gemini = gemini or GeminiProvider()

    def analyze(self, transcript: str, topic: str, position: str, weights: dict | None = None) -> dict:
        baseline = analyze_transcript(transcript, topic, position, weights)
        ai = None
        if self.gemini.available:
            try:
                ai = self.gemini.analyze(transcript, topic, position)
            except Exception:
                ai = None
        baseline["provider"] = self.gemini.name if ai else "local"
        if ai:
            baseline["ai_insights"] = ai
        return baseline

    def debate_response(self, topic: str, position: str, transcript: str, turn_type: str) -> tuple[str, str]:
        """Return a debate response and provider name, falling back safely when Gemini is unavailable."""
        if self.gemini.available:
            try:
                prompt = (f"Respond as a rigorous debate coach. Topic: {topic}. Position: {position}. "
                          f"Turn type: {turn_type}. Prior turns: {transcript}. Return one concise challenge.")
                url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s" % (
                    quote(self.gemini.model), quote(self.gemini.api_key))
                request = Request(url, data=json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode(),
                                  headers={"Content-Type": "application/json"}, method="POST")
                with urlopen(request, timeout=20) as response:
                    body = json.loads(response.read().decode())
                return body["candidates"][0]["content"]["parts"][0]["text"], "gemini"
            except Exception:
                pass
        return (f"An opponent would challenge your {position} position on {topic}. "
                "What evidence supports your strongest claim, and what trade-off would you accept?",
                "deterministic_fallback")


provider = AnalysisProvider()
