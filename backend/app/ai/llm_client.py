import json
import logging
from typing import Optional, Dict, Any
import httpx
from backend.app.config.settings import settings

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.is_live = bool(self.api_key and len(self.api_key.strip()) > 10)

    async def generate_completion(self, prompt: str, system_prompt: str = "", temperature: float = 0.7) -> Optional[str]:
        if not self.is_live:
            return None
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt or "You are an expert Debate Coach and Argument Analyst."},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"OpenAI API call failed with status {response.status_code}: {response.text}")
                    return None
        except Exception as e:
            logger.warning(f"LLM API request error: {str(e)}. Falling back to deterministic engine.")
            return None

    async def generate_structured_json(self, prompt: str, system_prompt: str = "") -> Optional[Dict[str, Any]]:
        raw_text = await self.generate_completion(prompt, system_prompt)
        if not raw_text:
            return None
        try:
            # Extract JSON block if surrounded by markdown code fences
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception as e:
            logger.warning(f"Failed to parse LLM JSON output: {e}")
            return None

llm_client = LLMClient()
