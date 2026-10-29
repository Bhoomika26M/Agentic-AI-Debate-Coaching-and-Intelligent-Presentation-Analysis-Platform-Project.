"""
Agentic AI Reasoning Engine
===========================
This module provides the core Agentic AI intelligence for DebateCoach AI.
It leverages Large Language Models (LLMs) to perform:
 1. Argument Mining & Nuanced Claim Extraction
 2. 8-Fallacy Detection with contextual explanations and corrections
 3. Persona-driven Multi-turn Debate Sparring on ANY arbitrary topic
 4. 5-Type Structured Counterargument Generation
 5. Socratic Coaching and Curriculum Synthesis

Supported Providers:
 - Google Gemini API (gemini-1.5-flash, gemini-2.5-flash, gemini-1.5-pro)
 - OpenAI API & Compatible endpoints (gpt-4o-mini, Groq, Ollama, OpenRouter)
 - Graceful Heuristic Fallback: Automatically delegates to offline rule-based
   heuristics when no API key is supplied or when offline.
"""

import json
import logging
import re
from typing import Any, Optional

try:
    import httpx
except ImportError:
    httpx = None

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

# Supported fallacies recognized by the platform specification
SUPPORTED_FALLACY_NAMES = [
    "Ad Hominem",
    "Straw Man",
    "False Dilemma",
    "Slippery Slope",
    "Appeal to Authority",
    "Circular Reasoning",
    "Hasty Generalization",
    "Red Herring",
]


class AIAgentService:
    """
    Central Agentic AI Orchestrator.
    Handles communication with external LLM APIs, structured prompt crafting,
    JSON response extraction, and fallback orchestration.
    """

    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY.strip()
        self.openai_key = settings.OPENAI_API_KEY.strip()
        self.provider_pref = settings.AI_PROVIDER.lower().strip()
        self.gemini_model = settings.GEMINI_MODEL
        self.openai_model = settings.OPENAI_MODEL
        self.openai_base_url = settings.OPENAI_BASE_URL.rstrip("/")

    def get_status(self, api_key_override: Optional[str] = None) -> dict[str, Any]:
        """
        Reports active AI engine status, active provider, and configured models.
        Useful for UI badges and diagnostics.
        """
        active_key = api_key_override or self.gemini_key or self.openai_key
        has_key = bool(active_key)

        provider = "heuristic"
        if has_key:
            if api_key_override:
                # Detect provider based on key format
                if api_key_override.startswith("AIzaSy"):
                    provider = "gemini"
                else:
                    provider = "openai"
            elif self.provider_pref == "gemini" and self.gemini_key:
                provider = "gemini"
            elif self.provider_pref == "openai" and self.openai_key:
                provider = "openai"
            elif self.gemini_key:
                provider = "gemini"
            elif self.openai_key:
                provider = "openai"

        return {
            "active": provider != "heuristic",
            "provider": provider,
            "model": self.gemini_model if provider == "gemini" else (self.openai_model if provider == "openai" else "Local Heuristic Engine"),
            "has_gemini_key": bool(self.gemini_key),
            "has_openai_key": bool(self.openai_key),
            "mode": "Agentic LLM" if provider != "heuristic" else "Offline Heuristic Fallback",
        }

    # ── LLM Request Dispatcher ────────────────────────────────────────────────

    def _call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key_override: Optional[str] = None,
        timeout_seconds: float = 20.0,
    ) -> Optional[dict[str, Any]]:
        """
        Sends structured prompt to configured LLM (Gemini or OpenAI) with JSON mode.
        Returns parsed JSON dict or None on failure/fallback.
        """
        status = self.get_status(api_key_override)
        if not status["active"]:
            logger.info("AIAgent: No API key configured. Using local heuristic engine.")
            return None

        provider = status["provider"]
        key = api_key_override or (self.gemini_key if provider == "gemini" else self.openai_key)

        try:
            if provider == "gemini":
                return self._call_gemini(key, system_prompt, user_prompt, timeout_seconds)
            else:
                return self._call_openai(key, system_prompt, user_prompt, timeout_seconds)
        except Exception as e:
            logger.warning(f"AIAgent: LLM call to {provider} failed: {e}. Falling back to heuristic engine.")
            return None

    def _call_gemini(
        self,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        timeout: float,
    ) -> Optional[dict[str, Any]]:
        """Invokes Google Gemini REST API with JSON response format."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={api_key}"
        combined_prompt = f"{system_prompt}\n\nStrict JSON Requirement: Output ONLY a valid JSON object matching the requested schema. No conversational preamble, no markdown quotes.\n\nInput Task:\n{user_prompt}"

        payload = {
            "contents": [{"parts": [{"text": combined_prompt}]}],
            "generationConfig": {
                "temperature": 0.25,
                "responseMimeType": "application/json",
            },
        }

        if httpx:
            with httpx.Client(timeout=timeout) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
        else:
            import urllib.request
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = json.loads(response.read().decode("utf-8"))

        # Extract text from Gemini candidates
        candidates = data.get("candidates", [])
        if not candidates:
            return None
        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return self._clean_and_parse_json(text)

    def _call_openai(
        self,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        timeout: float,
    ) -> Optional[dict[str, Any]]:
        """Invokes OpenAI / Compatible chat completions endpoint with JSON mode."""
        url = f"{self.openai_base_url}/chat/completions"
        payload = {
            "model": self.openai_model,
            "messages": [
                {"role": "system", "content": f"{system_prompt}\nEnsure the output is strictly valid JSON."},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.25,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        if httpx:
            with httpx.Client(timeout=timeout) as client:
                res = client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                data = res.json()
        else:
            import urllib.request
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = json.loads(response.read().decode("utf-8"))

        raw_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return self._clean_and_parse_json(raw_text)

    def _clean_and_parse_json(self, text: str) -> Optional[dict[str, Any]]:
        """Safely extracts JSON from model text even if wrapped in markdown codeblocks."""
        if not text:
            return None
        cleaned = text.strip()
        # Remove markdown codeblock markers if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except Exception as e:
            logger.warning(f"AIAgent: JSON parse error: {e}. Text snippet: {cleaned[:120]}")
            return None

    # ── High-Level Agent Capabilities ─────────────────────────────────────────

    def analyze_argument(
        self,
        text: str,
        topic: Optional[str] = None,
        position: Optional[str] = None,
        context: Optional[str] = None,
        api_key_override: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Agentic Argument Mining & Fallacy Detection:
        Performs deep semantic argument extraction, scans for all 8 supported fallacies,
        evaluates against the 5 criteria, and scores with the weighted performance rubric.
        """
        system_prompt = (
            "You are an expert Debate Adjudicator and Argument Mining Agent. "
            "Your task is to analyze debate speech or argument text with high critical precision.\n"
            "Supported Fallacies (ONLY detect if genuinely present):\n"
            "1. Ad Hominem: Attacking the person rather than the argument substance\n"
            "2. Straw Man: Caricaturing or exaggerating opposing position\n"
            "3. False Dilemma: Artificial either/or dichotomy ignoring middle ground\n"
            "4. Slippery Slope: Unsubstantiated claims of catastrophic chain reaction\n"
            "5. Appeal to Authority: Citing irrelevant or unqualified authority\n"
            "6. Circular Reasoning: Presupposing the conclusion in the premise\n"
            "7. Hasty Generalization: Broad universal claim from isolated anecdotal instance\n"
            "8. Red Herring: Irrelevant tangent introduced to divert debate focus\n\n"
            "Return JSON matching EXACT schema:\n"
            "{\n"
            '  "central_claim": "One sentence summary of the core claim",\n'
            '  "claim_type": "policy" | "factual" | "value" | "causal",\n'
            '  "premises": ["premise 1", "premise 2", ...],\n'
            '  "evidence_points": ["evidence 1", "evidence 2", ...],\n'
            '  "evidence_strength_rating": "weak" | "moderate" | "strong",\n'
            '  "conclusions": ["conclusion statement"],\n'
            '  "fallacies": [\n'
            '    {\n'
            '      "fallacy_type": "Ad Hominem" | "Straw Man" | "False Dilemma" | "Slippery Slope" | "Appeal to Authority" | "Circular Reasoning" | "Hasty Generalization" | "Red Herring",\n'
            '      "quote": "exact quote from text",\n'
            '      "explanation": "Why this is a fallacy",\n'
            '      "correction_suggestion": "How to repair this argument",\n'
            '      "severity": "low" | "medium" | "high",\n'
            '      "credibility_impact": "Impact on argument persuasive power"\n'
            '    }\n'
            '  ],\n'
            '  "criteria": {\n'
            '    "clarity": 0-100,\n'
            '    "relevance": 0-100,\n'
            '    "evidence_strength": 0-100,\n'
            '    "logical_consistency": 0-100,\n'
            '    "persuasiveness": 0-100\n'
            '  },\n'
            '  "weighted_scores": {\n'
            '    "argument_quality": 0-100,\n'
            '    "evidence_usage": 0-100,\n'
            '    "logical_consistency": 0-100,\n'
            '    "rebuttal_effectiveness": 0-100,\n'
            '    "communication_skills": 0-100\n'
            '  },\n'
            '  "executive_summary": "Crisp 2-3 sentence overview of debate performance",\n'
            '  "key_strengths": ["strength 1", "strength 2"],\n'
            '  "areas_for_improvement": ["area 1", "area 2"],\n'
            '  "actionable_recommendations": ["recommendation 1", "recommendation 2"]\n'
            "}"
        )

        user_prompt = (
            f"DEBATE TOPIC: {topic or 'Open Topic'}\n"
            f"SPEAKER POSITION: {position or 'Unspecified'}\n"
            f"FORMAT / CONTEXT: {context or 'Competitive Debate'}\n\n"
            f"SPEECH TEXT TO EVALUATE:\n\"\"\"{text}\"\"\""
        )

        parsed = self._call_llm(system_prompt, user_prompt, api_key_override)
        if not parsed:
            return None

        # Sanitize and ensure fallacies match valid types
        valid_fallacies = []
        for f in parsed.get("fallacies", []):
            ft = f.get("fallacy_type", "")
            # Match against supported list
            matched_name = next((sf for sf in SUPPORTED_FALLACY_NAMES if sf.lower() == ft.lower()), None)
            if matched_name:
                valid_fallacies.append({
                    "fallacy_type": matched_name,
                    "quote": f.get("quote", text[:60]),
                    "explanation": f.get("explanation", "Reasoning flaw detected."),
                    "correction_suggestion": f.get("correction_suggestion", "Strengthen inferential link with empirical backing."),
                    "severity": f.get("severity", "medium") if f.get("severity") in ("low", "medium", "high") else "medium",
                    "credibility_impact": f.get("credibility_impact", "Weakens overall persuasive authority."),
                })
        parsed["fallacies"] = valid_fallacies
        return parsed

    def generate_opponent_turn(
        self,
        topic: str,
        user_speech: str,
        persona: dict[str, Any],
        turn_number: int,
        user_position: str,
        history: Optional[list[dict[str, Any]]] = None,
        api_key_override: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Agentic Sparring Opponent:
        Adopts the assigned persona (scholar, aggressive debater, philosopher, pragmatist, etc.)
        and generates a contextual rebuttal directly addressing the user's points on ANY topic,
        along with a piercing cross-examination challenge question and constructive coaching critique.
        """
        system_prompt = (
            f"You are {persona.get('name', 'AI Opponent')} competing in a formal debate.\n"
            f"Your Style: {persona.get('style', 'methodical and sharp')}.\n"
            f"Your Behavioral Traits: {', '.join(persona.get('traits', ['cites evidence', 'challenges premises']))}.\n"
            "Task: Directly dissect and refute the user's latest speech on the specified motion.\n"
            "You must respond in character, directly addressing the specific arguments, facts, or claims they made.\n\n"
            "Return JSON matching EXACT schema:\n"
            "{\n"
            '  "ai_speech": "2-3 paragraphs of sharp, eloquent, in-character counter-speech directly tackling their points",\n'
            '  "challenge_question": "One piercing Socratic cross-examination question demanding empirical or logical defense",\n'
            '  "coaching_critique": "A constructive 1-2 sentence coach feedback analyzing how well the user framed their argument",\n'
            '  "turn_score": 60-95\n'
            "}"
        )

        history_summary = ""
        if history:
            history_summary = "PREVIOUS TURNS SUMMARY:\n" + "\n".join(
                f"- {turn.get('speaker', 'Speaker')}: {turn.get('speech', '')[:120]}..."
                for turn in history[-4:]
            ) + "\n\n"

        user_prompt = (
            f"MOTION: {topic}\n"
            f"USER POSITION: {user_position}\n"
            f"TURN NUMBER: {turn_number}\n\n"
            f"{history_summary}"
            f"USER'S LATEST SPEECH:\n\"\"\"{user_speech}\"\"\""
        )

        return self._call_llm(system_prompt, user_prompt, api_key_override)

    def generate_counterarguments(
        self,
        topic: Optional[str],
        argument_text: str,
        num_counters: int = 3,
        api_key_override: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Agentic Counterargument Engine:
        Generates 5 distinct counterargument types tailored specifically to the user's argument:
         1. Logical Rebuttals (inferential defects)
         2. Evidence-Based Rebuttals (contrary empirical studies)
         3. Ethical Counterarguments (moral/human rights implications)
         4. Practical Counterarguments (execution reality & cost-benefit)
         5. Policy Counterarguments (unintended consequences & alternatives)
        """
        system_prompt = (
            "You are a Senior Debate Strategist. Generate structured, typed counterarguments "
            "to comprehensively refute the user's argument on any topic.\n"
            "Generate distinct counterarguments across these exact types:\n"
            "- logical_rebuttal\n"
            "- evidence_rebuttal\n"
            "- ethical_counterargument\n"
            "- practical_counterargument\n"
            "- policy_counterargument\n\n"
            "Return JSON matching EXACT schema:\n"
            "{\n"
            '  "counterarguments": [\n'
            '    {\n'
            '      "type": "logical_rebuttal" | "evidence_rebuttal" | "ethical_counterargument" | "practical_counterargument" | "policy_counterargument",\n'
            '      "title": "Short descriptive title of this counterpoint",\n'
            '      "counterargument": "2-3 sentences of persuasive, concrete counter-argumentation",\n'
            '      "challenge_question": "A challenge question to put opponent on defense",\n'
            '      "debate_strategy": "Tactical advice on when and how to deploy this point"\n'
            '    }\n'
            '  ],\n'
            '  "recommended_strategy": "High level strategic advice on the strongest angle to win this resolution"\n'
            "}"
        )

        user_prompt = (
            f"DEBATE RESOLUTION / TOPIC: {topic or 'Open Motion'}\n"
            f"REQUESTED COUNTERARGUMENT COUNT: {num_counters}\n\n"
            f"ARGUMENT TO REFUTE:\n\"\"\"{argument_text}\"\"\""
        )

        return self._call_llm(system_prompt, user_prompt, api_key_override)

    def generate_coaching_recommendations(
        self,
        scores: dict[str, float],
        user_level: str = "intermediate",
        focus_areas: Optional[list[str]] = None,
        api_key_override: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Agentic Socratic Coach:
        Synthesizes personalized coaching guidance and drill priorities based on
        the student's 5-factor scoring rubric.
        """
        system_prompt = (
            "You are a Master Debate Coach. Given a student's rubric scores across 5 debate dimensions "
            "(argument_quality, evidence_usage, logical_consistency, rebuttal_effectiveness, communication_skills), "
            "generate personalized coaching recommendations and 4-week growth milestones.\n"
            "Return JSON matching EXACT schema:\n"
            "{\n"
            '  "overall_assessment": "1-2 paragraph encouraging assessment of their debate capabilities",\n'
            '  "priority_focus": "The single highest-leverage skill to improve first",\n'
            '  "recommendations": [\n'
            '    {\n'
            '      "skill": "skill name",\n'
            '      "priority": "high" | "medium" | "low",\n'
            '      "score": number,\n'
            '      "recommendation": "Clear coaching advice",\n'
            '      "targeted_exercise": "Concrete drill to practice this week"\n'
            '    }\n'
            '  ],\n'
            '  "suggested_topics": ["Debate Topic 1", "Debate Topic 2", "Debate Topic 3"]\n'
            "}"
        )

        user_prompt = (
            f"STUDENT EXPERIENCE LEVEL: {user_level}\n"
            f"RUBRIC SCORES: {json.dumps(scores)}\n"
            f"FOCUS AREAS: {focus_areas or 'General improvement'}"
        )

        return self._call_llm(system_prompt, user_prompt, api_key_override)


# Singleton instance shared across services
ai_agent = AIAgentService()

