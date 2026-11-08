"""The local Ollama models a learner can switch between in Settings.

The allowlist is deliberately small and shared by request validation, the
provider transport, and the voice session, so a browser can only ask the API
to run a model the product supports.
"""

from typing import Literal

LocalModel = Literal["qwen3.5:4b", "gemma4:e4b"]
DEFAULT_LOCAL_MODEL = "qwen3.5:4b"
LOCAL_MODELS: tuple[LocalModel, ...] = ("qwen3.5:4b", "gemma4:e4b")


def is_local_model(value: object) -> bool:
    return isinstance(value, str) and value in LOCAL_MODELS
