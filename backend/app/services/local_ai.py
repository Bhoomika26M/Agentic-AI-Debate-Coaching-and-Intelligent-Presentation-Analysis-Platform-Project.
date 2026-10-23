import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:3b"


def generate_ai_response(prompt: str) -> str:
    """Generate a response using the local Ollama model."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
            },
            timeout=180,
        )
        response.raise_for_status()
        return response.json()["response"].strip()
    except requests.RequestException as error:
        raise RuntimeError(
            f"Could not connect to Ollama: {error}"
        ) from error
