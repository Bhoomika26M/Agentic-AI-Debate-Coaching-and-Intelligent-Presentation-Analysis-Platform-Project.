import os
from django.conf import settings
from .base import BaseAIService
from .gemini_service import GeminiAIService
from .mock_service import MockAIService

_ai_instance = None

def get_ai_service() -> BaseAIService:
    """
    Factory function providing an interchangeable singleton AI Service.
    Configured via settings.AI_PROVIDER ('gemini' or 'mock')
    and settings.GEMINI_API_KEY.
    """
    global _ai_instance
    if _ai_instance is None:
        provider = getattr(settings, 'AI_PROVIDER', 'gemini')
        api_key = getattr(settings, 'GEMINI_API_KEY', os.getenv('GEMINI_API_KEY', ''))

        if provider == 'gemini' and api_key:
            _ai_instance = GeminiAIService(api_key=api_key)
        else:
            _ai_instance = MockAIService()
            
    return _ai_instance
