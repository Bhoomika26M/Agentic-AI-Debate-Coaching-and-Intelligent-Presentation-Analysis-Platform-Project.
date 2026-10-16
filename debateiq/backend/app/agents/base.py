import json
import logging
from typing import Type, TypeVar, Optional, Dict, Any
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class BaseSpecialistAgent:
    """
    Abstract base class for all DebateIQ Specialist Agents.
    Encapsulates system prompts, LLM gateway access (Gemini / Mock),
    JSON parsing, Pydantic validation, and deterministic mock fallbacks.
    """
    def __init__(self, name: str, prompt_file: Optional[str] = None):
        self.name = name
        self.system_prompt = self._load_prompt(prompt_file) if prompt_file else ""

    def _load_prompt(self, filepath: str) -> str:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as e:
            logger.warning(f"Could not load prompt file {filepath}: {e}")
            return f"You are {self.name}, an expert AI debate and communication specialist."

    def _call_gemini_api(self, prompt: str) -> Optional[str]:
        """Calls Gemini API via google-genai if configured."""
        if not settings.GEMINI_API_KEY or settings.LLM_PROVIDER.lower() == "mock":
            return None
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=f"{self.system_prompt}\n\nUser Request:\n{prompt}",
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API call failed for {self.name}: {e}. Falling back to deterministic mock.")
            return None

    def execute(self, user_input: str, response_schema: Type[T]) -> T:
        """
        Executes agent reasoning pipeline:
        1. Attempt LLM Provider (if enabled).
        2. Validate JSON with Pydantic.
        3. If unavailable or invalid, execute deterministic mock implementation.
        """
        raw_text = self._call_gemini_api(user_input)
        if raw_text:
            try:
                # Extract JSON block if wrapped in markdown
                clean_json = raw_text
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0].strip()
                parsed = json.loads(clean_json)
                return response_schema.model_validate(parsed)
            except Exception as parse_err:
                logger.warning(f"Failed to parse LLM response for {self.name}: {parse_err}. Using mock fallback.")

        # Deterministic Mock Fallback
        mock_data = self.generate_mock_output(user_input)
        return response_schema.model_validate(mock_data)

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        """To be implemented by each specialist agent."""
        raise NotImplementedError("Specialist agent must implement generate_mock_output")
