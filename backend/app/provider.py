"""Configured AI transport, specialist-agent orchestration and local fallbacks."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .agents import orchestrator
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
        """Backward-compatible general analysis method."""
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
        """Backward-compatible debate turn method."""
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
    """Route work to specialist agents, retaining explainable local fallbacks."""

    def __init__(self, ai: GroqProvider | None = None):
        self.ai = ai or (OpenRouterProvider() if settings.openrouter_enabled else GroqProvider())

    @property
    def agent_registry(self) -> list[dict[str, str]]:
        return orchestrator.registry

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

    def run_agent(self, task: str, payload: dict):
        """Run one validated specialist task; return None when unavailable or invalid."""
        if not self.ai.available:
            return None
        try:
            result = orchestrator.run(task, self.ai._complete, payload)
            self._log(task, True)
            return result
        except Exception as exc:
            self._log(task, False, f"{type(exc).__name__}: {exc}")
            return None

    def analyze(self, transcript: str, topic: str, position: str, weights: dict | None = None) -> dict:
        baseline = analyze_transcript(transcript, topic, position, weights)
        context = {"transcript": transcript, "topic": topic, "position": position}
        review = self.run_agent("argument_analysis", context)
        fallacy_review = self.run_agent("fallacy_detection", context)
        baseline["provider"] = self.ai.name if review or fallacy_review else "local"
        if review:
            baseline["ai_insights"] = review
        if fallacy_review:
            baseline["ai_fallacy_review"] = fallacy_review["fallacies"]
        return baseline

    def debate_response(self, topic: str, position: str, transcript: str, turn_type: str) -> tuple[str, str]:
        response = self.run_agent("debate_opponent", {
            "topic": topic, "position": position, "transcript": transcript, "turn_type": turn_type,
        })
        if isinstance(response, str):
            return response, self.ai.name
        return (
            f"An opponent would challenge your {position} position on {topic}. "
            "What evidence supports your strongest claim, and what trade-off would you accept?",
            "deterministic_fallback",
        )


provider = AnalysisProvider()
