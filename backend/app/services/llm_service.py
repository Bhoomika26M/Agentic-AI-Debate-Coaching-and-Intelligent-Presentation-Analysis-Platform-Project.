import base64
import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _mask_url(url: str) -> str:
    """Mask api key parameter in url to avoid leaking secrets in logs."""
    return re.sub(r"key=[^&\s'\"]+", "key=[REDACTED]", str(url))


def sanitize_error_message(message: str | None) -> str:
    """Strip API keys, secret credentials, and raw technical URLs from error messages."""
    if not message:
        return "An unexpected error occurred. Please try again."
    text = str(message)
    # Redact query parameters containing keys
    text = re.sub(r"(?:key|api_key|token|secret)=[^&\s\'\"]+", "key=[REDACTED]", text, flags=re.IGNORECASE)
    # Redact Authorization headers
    text = re.sub(r"Bearer\s+[A-Za-z0-9_\-\.]+", "Bearer [REDACTED]", text, flags=re.IGNORECASE)
    # Redact Google API URLs
    text = re.sub(r"https?://generativelanguage\.googleapis\.com[^\s\'\"]*", "https://generativelanguage.googleapis.com/... [endpoint redacted]", text)
    # Check if this is a known raw client error string and sanitize to a friendly message
    if "400 Bad Request" in text or "JSON mode is not enabled" in text or "API key" in text:
        return "Audio transcription failed. Please try again. If the issue persists, contact support."
    return text[:300]


class LLMAnalysisError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502) -> None:
        safe_message = sanitize_error_message(message)
        super().__init__(safe_message)
        self.status_code = status_code


def _extract_json_payload(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


class LLMService:
    def __init__(self) -> None:
        self.provider = (settings.llm_provider or "disabled").lower().strip()
        if self.provider == "gemini":
            self.api_key = settings.gemini_api_key
            self.model = settings.gemini_model or "gemini-3.8-flash"
            self.base_url = settings.gemini_base_url or "https://generativelanguage.googleapis.com/v1beta"
        else:
            self.api_key = settings.openai_api_key
            self.model = settings.openai_model or "gpt-4o-mini"
            self.base_url = settings.openai_base_url or "https://api.openai.com/v1"
        self.timeout = settings.llm_timeout_seconds

    def _get_gemini_models_to_try(self) -> list[str]:
        # User-configured model is primary; auto-fallback to active, fast flash models
        primary = self.model
        fallbacks = [
            "gemini-3.1-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.8-flash",
            "gemini-3.5-flash",
        ]
        models = [primary]
        for m in fallbacks:
            if m not in models:
                models.append(m)
        return models

    def is_available(self) -> bool:
        if not self.api_key:
            return False
        # Do not treat placeholder as active key
        if "PASTE_YOUR_GEMINI_API_KEY_HERE" in self.api_key or "your_" in self.api_key:
            return False
        if self.provider == "gemini":
            return True
        return self.provider in {"openai", "openrouter", "azure"}

    def get_provider_status(self) -> dict[str, Any]:
        has_key = bool(self.api_key and "PASTE_YOUR_GEMINI_API_KEY_HERE" not in self.api_key and "your_" not in self.api_key)
        is_ready = self.is_available()
        display_name = self.model
        if self.provider == "gemini":
            clean = self.model.replace("models/", "")
            parts = clean.split("-")
            display_name = " ".join(p.capitalize() if not p.replace(".", "").isdigit() else p for p in parts)

        return {
            "provider": self.provider,
            "model": self.model,
            "model_display": display_name,
            "is_configured": has_key,
            "is_ready": is_ready,
            "status": "ready" if is_ready else ("pending_api_key" if self.provider == "gemini" and not has_key else "disabled"),
            "message": (
                f"Google Gemini active with model {self.model}."
                if is_ready and self.provider == "gemini"
                else (
                    "Google Gemini is selected. Paste your Gemini API key in backend/.env to activate live AI."
                    if self.provider == "gemini"
                    else f"AI provider '{self.provider}' is {'ready' if is_ready else 'offline'}."
                )
            ),
        }

    def _clean_debate_rebuttal(self, text: str) -> str:
        cleaned = text.strip()
        # Remove common markdown heading markers, asterisks, or prefix labels
        cleaned = re.sub(
            r"^(?:#{1,6}\s*|\*{1,2}|\[.*?\]\s*)*(?:ai opponent|opponent response|opponent|rebuttal|counterargument|argument)[\s\:\*\-]*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        # Remove outer quotation marks
        cleaned = re.sub(r"^[\"']|[\"']$", "", cleaned).strip()

        # Parse sentences to enforce 2-4 sentences and 40-80 words without mid-sentence cutoff
        sentence_matches = re.findall(r"([^.!?]+[.!?]+)", cleaned)
        if sentence_matches:
            kept = []
            total_words = 0
            for s in sentence_matches:
                w_count = len(s.split())
                # Enforce at most 4 sentences and roughly 85 words maximum
                if (total_words + w_count <= 85 and len(kept) < 4) or len(kept) < 2:
                    kept.append(s.strip())
                    total_words += w_count
                else:
                    break
            if kept:
                return " ".join(kept)

        return cleaned

    def _require_available(self) -> None:
        if not self.is_available():
            if self.provider == "gemini":
                raise LLMAnalysisError(
                    "Google Gemini API key is not configured. Please paste your GEMINI_API_KEY into backend/.env and restart.",
                    503,
                )
            raise LLMAnalysisError("AI analysis is not configured. Set a supported LLM provider and backend API key.", 503)

    def _request_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        response_json: bool = False,
        max_output_tokens: int | None = None,
        temperature: float = 0.35,
    ) -> str:
        contents = [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ]
        system_instruction = {
            "parts": [{"text": system_prompt}]
        }
        generation_config: dict[str, Any] = {
            "temperature": temperature,
            "topK": 40,
            "topP": 0.95,
            # Disable default reasoning/thinking budget to avoid excessive internal latency and latency spikes
            "thinkingConfig": {"thinkingBudget": 0},
        }
        if max_output_tokens is not None:
            generation_config["maxOutputTokens"] = max_output_tokens
        if response_json:
            generation_config["responseMimeType"] = "application/json"

        body = {
            "contents": contents,
            "systemInstruction": system_instruction,
            "generationConfig": generation_config,
        }

        models_to_try = self._get_gemini_models_to_try()
        last_error: Exception | None = None

        # Per-candidate model timeout: cap each candidate attempt at 14s with connect timeout of 4.0s.
        # This prevents hanging indefinitely if an upstream model is stalling.
        candidate_timeout = httpx.Timeout(timeout=min(float(self.timeout), 14.0), connect=4.0)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": str(self.api_key),
        }

        for idx, model_name in enumerate(models_to_try):
            url = f"{self.base_url}/models/{model_name}:generateContent"
            safe_url = _mask_url(url)
            is_last = (idx == len(models_to_try) - 1)

            try:
                response = httpx.post(url, json=body, headers=headers, timeout=candidate_timeout)
                response.raise_for_status()
                data = response.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    if not is_last:
                        logger.warning("Gemini model '%s' returned no candidates; falling back to next model...", model_name)
                        continue
                    raise LLMAnalysisError("Gemini returned no response candidates.", 502)
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    if not is_last:
                        logger.warning("Gemini model '%s' returned empty content; falling back to next model...", model_name)
                        continue
                    raise LLMAnalysisError("Gemini returned empty content.", 502)
                return parts[0].get("text", "").strip()

            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning("Gemini model '%s' timed out (URL: %s).", model_name, safe_url)
                if not is_last:
                    logger.info("Attempting automatic fallback to next available model...")
                    continue
                raise LLMAnalysisError(
                    f"The Gemini API timed out on model '{model_name}'. Spikes in server latency are temporary; please retry in a moment.",
                    504,
                ) from exc

            except httpx.HTTPStatusError as exc:
                last_error = exc
                status_code = exc.response.status_code

                err_detail = ""
                try:
                    err_json = exc.response.json().get("error", {})
                    err_detail = err_json.get("message", "")
                except Exception:
                    err_detail = exc.response.text[:200]

                logger.warning(
                    "Gemini API returned HTTP %d for model '%s': %s (URL: %s)",
                    status_code,
                    model_name,
                    err_detail,
                    safe_url,
                )

                if status_code in {401, 403}:
                    raise LLMAnalysisError(
                        "Invalid or unauthorized Gemini API key. Please check GEMINI_API_KEY in backend/.env.",
                        401,
                    ) from exc

                # If model rejected thinkingConfig as invalid argument (400), retry without thinkingConfig
                if status_code == 400 and "thinking" in err_detail.lower() and "thinkingConfig" in body.get("generationConfig", {}):
                    logger.info("Model '%s' does not accept thinkingConfig; retrying without thinkingConfig...", model_name)
                    retry_body = dict(body)
                    retry_gen_config = dict(body["generationConfig"])
                    retry_gen_config.pop("thinkingConfig", None)
                    retry_body["generationConfig"] = retry_gen_config
                    try:
                        retry_resp = httpx.post(url, json=retry_body, headers=headers, timeout=candidate_timeout)
                        retry_resp.raise_for_status()
                        retry_cand = retry_resp.json().get("candidates", [])
                        if retry_cand:
                            retry_parts = retry_cand[0].get("content", {}).get("parts", [])
                            if retry_parts:
                                return retry_parts[0].get("text", "").strip()
                    except Exception as retry_exc:
                        logger.warning("Retry without thinkingConfig on '%s' failed: %s", model_name, retry_exc)

                if status_code in {429, 404, 500, 502, 503, 504} and not is_last:
                    logger.info(
                        "Gemini HTTP %d on model '%s' (%s); attempting automatic fallback to next available model...",
                        status_code,
                        model_name,
                        err_detail[:100] if err_detail else "error",
                    )
                    continue

                if status_code == 429:
                    raise LLMAnalysisError(
                        "The AI provider is rate limited (Gemini quota exceeded). Please wait a moment before sending another argument.",
                        429,
                    ) from exc

                if status_code == 400:
                    raise LLMAnalysisError(f"Gemini rejected the request format: {err_detail or exc.response.text[:200]}", 400) from exc

                if status_code == 503:
                    raise LLMAnalysisError(
                        f"Gemini is currently experiencing high demand ({err_detail or 'temporary demand spike'}). Please try again in a few seconds.",
                        503,
                    ) from exc

                if status_code == 404:
                    raise LLMAnalysisError(
                        f"Gemini model '{model_name}' was not found or is no longer supported (404). {err_detail}",
                        502,
                    ) from exc

                raise LLMAnalysisError(f"Gemini provider error ({status_code}): {err_detail}", 502) from exc

            except httpx.HTTPError as exc:
                last_error = exc
                logger.warning("Network connection failed to Gemini API: %s (URL: %s)", exc, safe_url)
                if not is_last:
                    continue
                raise LLMAnalysisError("Unable to reach Google Gemini API. Please check your network connection.", 502) from exc

            except Exception as exc:
                if isinstance(exc, LLMAnalysisError):
                    raise
                raise LLMAnalysisError(f"Failed to parse Gemini response: {exc}", 502) from exc

        if last_error:
            raise LLMAnalysisError(f"Gemini request failed across candidate models: {last_error}", 502)
        raise LLMAnalysisError("Gemini service is unavailable.", 502)

    def _request_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        response_json: bool = False,
        max_output_tokens: int | None = None,
        temperature: float = 0.35,
    ) -> str:
        request_payload: dict[str, Any] = {
            "model": self.model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        if max_output_tokens is not None:
            request_payload["max_tokens"] = max_output_tokens
        if response_json:
            request_payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": "Bearer " + str(self.api_key),
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=request_payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            return payload["choices"][0]["message"]["content"].strip()
        except httpx.TimeoutException as exc:
            raise LLMAnalysisError("The AI provider timed out.", 504) from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            message = "The AI provider is rate limited." if status_code == 429 else "The AI provider rejected the request."
            raise LLMAnalysisError(message, status_code) from exc
        except httpx.HTTPError as exc:
            raise LLMAnalysisError("The AI provider is unavailable.", 502) from exc
        except Exception as exc:
            raise LLMAnalysisError("The AI provider returned an invalid response.", 502) from exc

    def _request_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        response_json: bool = False,
        max_output_tokens: int | None = None,
        temperature: float = 0.35,
    ) -> str | None:
        if not self.is_available():
            return None
        if self.provider == "gemini":
            return self._request_gemini(
                system_prompt,
                user_prompt,
                response_json=response_json,
                max_output_tokens=max_output_tokens,
                temperature=temperature,
            )
        return self._request_openai(
            system_prompt,
            user_prompt,
            response_json=response_json,
            max_output_tokens=max_output_tokens,
            temperature=temperature,
        )

    def generate_analysis(self, topic: str, argument_text: str, position: str | None) -> dict[str, Any] | None:
        if not self.is_available():
            return None

        system_prompt = (
            "You are a careful argument coach. Return valid JSON only based on the provided text; do not invent evidence.\n"
            "Keep all explanations short, crisp, and direct (1-2 sentences per section, max 35 words each).\n"
            "Return JSON matching this exact schema:\n"
            "{\n"
            '  "overall_score": float (0-100),\n'
            '  "scores": [\n'
            '    {"criterion": "Clarity", "score": int, "explanation": "1-2 concise sentences"},\n'
            '    {"criterion": "Relevance", "score": int, "explanation": "1-2 concise sentences"},\n'
            '    {"criterion": "Evidence Strength", "score": int, "explanation": "1-2 concise sentences"},\n'
            '    {"criterion": "Logical Consistency", "score": int, "explanation": "1-2 concise sentences"},\n'
            '    {"criterion": "Persuasiveness", "score": int, "explanation": "1-2 concise sentences"}\n'
            '  ],\n'
            '  "claims": [{"claim_type": "main" or "supporting", "text": "1 concise sentence", "position": "for" or "against"}],\n'
            '  "evidence": [{"evidence_text": "...", "supports_claim": "...", "relevance": int, "strength": int, "explicitly_present": true, "notes": "1 concise sentence"}],\n'
            '  "reasoning": {"relationship": "1-2 sentences", "logical_consistency": "1-2 sentences", "gaps": ["1-2 short bullets"], "unsupported_assumptions": ["1-2 short bullets"], "contradictions": [], "suggestions": ["2-3 short bullets"]},\n'
            '  "fallacies": [{"name": "...", "excerpt": "...", "explanation": "1-2 sentences", "confidence": int, "suggestion": "1 sentence"}],\n'
            '  "feedback_report": "2-3 crisp sentences maximum",\n'
            '  "improvement_suggestions": ["2-3 concise actionable tips"]\n'
            "}\n"
            "If no fallacies are present, return an empty array for fallacies: []."
        )
        user_prompt = json.dumps({
            "topic": topic,
            "position": position,
            "argument_text": argument_text,
        })

        try:
            content = self._request_chat_completion(system_prompt, user_prompt, response_json=True, max_output_tokens=1024)
            if not content:
                return None
            return _extract_json_payload(content)
        except (ValueError, TypeError) as exc:
            raise LLMAnalysisError(str(exc)) from exc

    def generate_debate_response(
        self,
        topic: str,
        debate_rules: str | None,
        user_position: str,
        user_argument: str,
        debate_history: list[str],
        ai_position: str,
    ) -> str | None:
        if not self.is_available():
            return None

        # Take relevant conversation history (last 8 turns) to maintain context without token bloat
        history_context = "\n".join(debate_history[-8:]) if debate_history else "No previous turns."

        system_prompt = (
            "You are an expert collegiate debate opponent sparring in a live, fast-paced debate.\n"
            "You must strictly adhere to the following rules for EVERY response:\n"
            "1. LENGTH: Exactly 2 to 4 short sentences (strictly 40 to 80 words total). Never write more than 80 words.\n"
            "2. POSITION INTEGRITY: Vigorously argue the AI opponent's assigned position. Never concede, switch sides, or stay neutral.\n"
            "3. SINGLE FOCUS: Make exactly ONE clear main counterpoint at a time, supported by one concrete reason or example.\n"
            "4. DIRECT REBUTTAL: Directly challenge and rebut the user's latest argument and premise.\n"
            "5. NO REPETITION: Check the conversation history. Never repeat points, arguments, or examples from previous turns.\n"
            "6. NATURAL TONE: Use simple, natural, spoken English suitable for college debaters.\n"
            "7. NO ESSAY FLUFF: Never use headings, bullet points, numbered lists, greetings ('Hello'), or stock transition phrases ('In conclusion', 'Furthermore', 'As an opponent').\n"
            "8. CLOSING CHALLENGE: Conclude with a crisp, punchy counter-question or challenge that keeps the debate moving."
        )
        user_prompt = (
            f"Debate Topic: {topic}\n"
            f"Rules/Format: {debate_rules or 'Standard live debate'}\n"
            f"User Position: {user_position}\n"
            f"AI Opponent Assigned Position: {ai_position}\n\n"
            f"Recent Debate History:\n{history_context}\n\n"
            f"User's Latest Argument to Rebut:\n\"{user_argument}\"\n\n"
            f"Deliver your short, sharp 2-4 sentence rebuttal now:"
        )

        content = self._request_chat_completion(
            system_prompt,
            user_prompt,
            response_json=False,
            max_output_tokens=180,
            temperature=0.4,
        )
        if content is None:
            return None
        return self._clean_debate_rebuttal(content)

    def generate_coaching_feedback(
        self,
        topic: str,
        user_position: str,
        debate_history: list[dict[str, str]],
        previous_feedback: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        if not self.is_available():
            return None

        summary = "\n".join(f"{item['role']}: {item['content']}" for item in debate_history[-20:])
        system_prompt = (
            "You are a constructive debate coach, separate from the opponent. Evaluate only the user's actual debate messages. "
            "Keep all feedback short, crisp, and actionable. "
            "Return JSON with category_scores containing argument_quality, evidence_usage, logical_consistency, rebuttal_effectiveness, "
            "and communication_clarity, each {score: integer 0-100 or null, explanation: string (max 2 sentences)}. Use null and explain when evidence "
            "is insufficient (especially rebuttal effectiveness if no opponent response exists). Also return overall_assessment (2-3 sentences), "
            "strengths (list of 2-3 short bullet points, max 15 words each), weaknesses (list of 2-3 short bullet points, max 15 words each), "
            "improvement_suggestions (list of 2-3 short actionable tips), and improvement_plan with strongest_skills (2-3 short items), "
            "areas_for_improvement (2-3 short items), practice_recommendations (2-3 short items), next_steps (2-3 short items), "
            "measurable_next_debate_goal (1 sentence), and progress_indicators (2-3 short items). Do not write essays or repeat points. "
            "Return valid JSON only."
        )
        user_prompt = json.dumps({
            "topic": topic,
            "user_position": user_position,
            "chronological_debate": summary,
            "previous_feedback_for_personalization": previous_feedback,
            "scoring_weights": {
                "argument_quality": 0.30,
                "evidence_usage": 0.20,
                "logical_consistency": 0.20,
                "rebuttal_effectiveness": 0.15,
                "communication_clarity": 0.15,
            },
            "overall_score_rule": "Weighted mean over all available category scores; if any weighted category score is null, overall score must be null.",
        })

        content = self._request_chat_completion(system_prompt, user_prompt, response_json=True, max_output_tokens=2048)
        if content is None:
            return None
        try:
            return _extract_json_payload(content)
        except (ValueError, TypeError) as exc:
            raise LLMAnalysisError(str(exc)) from exc

    def transcribe_presentation_audio(
        self, audio: bytes, filename: str, mime_type: str
    ) -> dict[str, Any]:
        self._require_available()

        if self.provider == "gemini":
            models_to_try = ["gemini-3.5-transcribe", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"]
            encoded_audio = base64.b64encode(audio).decode("utf-8")
            resolved_mime = mime_type if mime_type and "/" in mime_type else "audio/mp3"

            candidate_timeout = httpx.Timeout(timeout=min(float(self.timeout), 45.0), connect=5.0)
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": str(self.api_key),
            }

            for idx, model_name in enumerate(models_to_try):
                url = f"{self.base_url}/models/{model_name}:generateContent"
                safe_url = _mask_url(url)
                is_last = (idx == len(models_to_try) - 1)

                prompt_text = "Transcribe this speech recording word-for-word accurately. Do not summarize or paraphrase."
                gen_config: dict[str, Any] = {"temperature": 0.1}

                # Specialized transcribe models do not accept responseMimeType="application/json"
                if model_name != "gemini-3.5-transcribe":
                    prompt_text += " Return valid JSON with keys: \"transcript\" (string) and \"duration_seconds\" (float or null)."
                    gen_config["responseMimeType"] = "application/json"

                body = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt_text},
                                {
                                    "inlineData": {
                                        "mimeType": resolved_mime,
                                        "data": encoded_audio,
                                    }
                                },
                            ]
                        }
                    ],
                    "generationConfig": gen_config,
                }

                try:
                    response = httpx.post(url, json=body, headers=headers, timeout=candidate_timeout)
                    response.raise_for_status()
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        if not is_last:
                            continue
                        raise LLMAnalysisError("Gemini returned no response candidates.")
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts:
                        if not is_last:
                            continue
                        raise LLMAnalysisError("Gemini returned empty content.")

                    raw_text = ""
                    for p in parts:
                        if "audioTranscription" in p and isinstance(p["audioTranscription"], dict):
                            raw_text += p["audioTranscription"].get("text", "")
                        elif "text" in p and isinstance(p["text"], str):
                            raw_text += p["text"]

                    raw_text = raw_text.strip()
                    if not raw_text:
                        if not is_last:
                            continue
                        raise LLMAnalysisError("Audio transcription returned an empty transcript.")

                    transcript = raw_text
                    duration = None
                    if raw_text.startswith("{") and raw_text.endswith("}"):
                        try:
                            parsed = _extract_json_payload(raw_text)
                            transcript = parsed.get("transcript", raw_text).strip()
                            duration = parsed.get("duration_seconds")
                        except Exception:
                            transcript = raw_text

                    return {
                        "transcript": transcript,
                        "duration_seconds": float(duration) if duration and duration > 0 else None,
                    }
                except Exception as exc:
                    logger.warning("Gemini transcription failed with model '%s' (status/type: %s)", model_name, type(exc).__name__)
                    if not is_last and isinstance(exc, (httpx.TimeoutException, httpx.HTTPStatusError)):
                        if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in {400, 404, 429, 500, 502, 503, 504}:
                            continue
                    if isinstance(exc, LLMAnalysisError):
                        raise
                    raise LLMAnalysisError("Audio transcription failed. Please try again. If the issue persists, contact support.", 502)

        # Fallback to OpenAI Whisper if configured
        headers = {"Authorization": "Bearer " + str(self.api_key)}
        try:
            response = httpx.post(
                f"{self.base_url}/audio/transcriptions",
                headers=headers,
                data={"model": settings.openai_transcription_model, "response_format": "verbose_json"},
                files={"file": (filename, audio, mime_type)},
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            transcript = payload.get("text")
            if not isinstance(transcript, str) or not transcript.strip():
                raise LLMAnalysisError("The transcription provider returned no transcript.")
            duration = payload.get("duration")
            return {
                "transcript": transcript.strip(),
                "duration_seconds": float(duration) if isinstance(duration, (int, float)) and duration > 0 else None,
            }
        except httpx.TimeoutException as exc:
            raise LLMAnalysisError("The AI provider timed out while transcribing the recording.", 504) from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            message = "The AI provider is rate limited." if status_code == 429 else "The AI provider rejected the transcription request."
            raise LLMAnalysisError(message, status_code) from exc
        except httpx.HTTPError as exc:
            raise LLMAnalysisError("The AI provider is unavailable for transcription.", 502) from exc
        except (ValueError, TypeError, AttributeError) as exc:
            if isinstance(exc, LLMAnalysisError):
                raise
            raise LLMAnalysisError("The transcription provider returned an invalid response.", 502) from exc

    def analyze_presentation(self, transcript: str) -> dict[str, Any]:
        self._require_available()
        system_prompt = (
            "You are a presentation coach. Assess only observable features of this transcript; do not infer gestures, "
            "eye contact, vocal tone, or visual delivery from text. Keep all feedback short, crisp, and actionable. "
            "Return valid JSON with overall_score (0-100 or null), "
            "confidence_score (0-100 or null), clarity_score (0-100 or null), engagement_score (0-100 or null), "
            "strengths (list of 2-3 short bullet points, max 15 words each), "
            "improvement_areas (list of 2-3 short bullet points, max 15 words each), "
            "recommendations (list of 2-3 specific, actionable practice steps, max 20 words each), "
            "delivery_observations (2-3 short transcript-grounded points), and limitations (1-2 brief caveats). "
            "Treat scores as automated estimates, and use null when the transcript does not support a score."
        )
        prompt = json.dumps({"transcript": transcript})
        content = self._request_chat_completion(system_prompt, prompt, response_json=True, max_output_tokens=2048)
        if not content:
            raise LLMAnalysisError("The AI provider returned an empty presentation analysis.")
        try:
            result = _extract_json_payload(content)
        except (ValueError, TypeError) as exc:
            raise LLMAnalysisError("The AI provider returned an invalid presentation analysis.", 502) from exc
        if not isinstance(result, dict):
            raise LLMAnalysisError("The AI provider returned an invalid presentation analysis.", 502)
        return result


llm_service = LLMService()
