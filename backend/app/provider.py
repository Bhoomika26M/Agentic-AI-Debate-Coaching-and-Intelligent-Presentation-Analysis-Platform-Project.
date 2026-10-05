"""OpenRouter AI provider boundary with a deterministic local fallback."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .analysis import analyze_transcript
from .config import settings


class GroqProvider:
    name = "groq"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = (api_key or settings.groq_api_key).strip()
        self.model = model or settings.groq_model

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _complete(self, prompt: str) -> str:
        if not self.available:
            raise RuntimeError("Groq is not configured")
        request = Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps({
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
            }).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer " + self.api_key,
            },
            method="POST",
        )
        with urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode())
        return body["choices"][0]["message"]["content"]

    def analyze(self, transcript: str, topic: str, position: str) -> dict:
        prompt = (
            "Analyze this debate transcript. Return valid JSON with keys summary, strengths, "
            "improvements. Keep each value concise. "
            f"Topic: {topic}\nPosition: {position}\nTranscript: {transcript}"
        )
        text = self._complete(prompt).strip()
        try:
            return json.loads(text.removeprefix("```json").removesuffix("```").strip())
        except (json.JSONDecodeError, KeyError, IndexError) as exc:
            raise RuntimeError("Groq returned invalid analysis JSON") from exc

    def debate_response(self, topic: str, position: str, transcript: str, turn_type: str) -> str:
        prompt = (
            "Act as a rigorous, constructive debate coach. Generate one specific response "
            "to move this debate forward. Challenge the user's reasoning without inventing "
            "facts. Return only the response, no labels or markdown. "
            f"Topic: {topic}\nPosition: {position}\nTurn type: {turn_type}\n"
            f"Prior turns: {transcript or '(none)'}"
        )
        return self._complete(prompt).strip()


class OpenRouterProvider(GroqProvider):
    name = "openrouter"

    def __init__(self):
        super().__init__(settings.openrouter_api_key, settings.openrouter_model)

    def _complete(self, prompt: str) -> str:
        if not self.available:
            raise RuntimeError("OpenRouter is not configured")
        request = Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps({"model": self.model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.4}).encode(),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + self.api_key,
                     "HTTP-Referer": settings.openrouter_site_url, "X-Title": settings.openrouter_app_name},
            method="POST",
        )
        with urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode())
        return body["choices"][0]["message"]["content"]


class AnalysisProvider:
    """Use OpenRouter for every AI workflow, with a local fallback."""

    def __init__(self, ai: GroqProvider | None = None):
        self.ai = ai or (OpenRouterProvider() if settings.openrouter_enabled else GroqProvider())

    def _log(self, operation: str, success: bool, error: str = ""):
        from .db import SessionLocal
        from .models import AIUsageLog
        db = SessionLocal()
        try:
            db.add(AIUsageLog(provider=self.ai.name, model=self.ai.model, operation=operation, success=success, error=error[:500]))
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    def analyze(self, transcript: str, topic: str, position: str, weights: dict | None = None) -> dict:
        baseline = analyze_transcript(transcript, topic, position, weights)
        ai = None
        if self.ai.available:
            try:
                ai = self.ai.analyze(transcript, topic, position)
                self._log("analysis", True)
            except (HTTPError, URLError, TimeoutError, RuntimeError, ValueError):
                ai = None
                self._log("analysis", False, "provider request failed")
        baseline["provider"] = self.ai.name if ai else "local"
        if ai:
            baseline["ai_insights"] = ai
        return baseline

    def debate_response(self, topic: str, position: str, transcript: str, turn_type: str) -> tuple[str, str]:
        if self.ai.available:
            try:
                response = self.ai.debate_response(topic, position, transcript, turn_type)
                self._log("debate_turn", True)
                return response, self.ai.name
            except (HTTPError, URLError, TimeoutError, RuntimeError, ValueError):
                self._log("debate_turn", False, "provider request failed")
                pass
        return (
            f"An opponent would challenge your {position} position on {topic}. "
            "What evidence supports your strongest claim, and what trade-off would you accept?",
            "deterministic_fallback",
        )


provider = AnalysisProvider()
