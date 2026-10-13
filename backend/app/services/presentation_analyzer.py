
import re


FILLER_WORDS = [
    "um",
    "uh",
    "basically",
    "actually",
    "literally",
    "you know",
    "I mean",
    "kind of",
    "sort of",
]


def analyze_presentation(text: str) -> dict:
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return {
            "word_count": 0,
            "sentence_count": 0,
            "estimated_speaking_time_minutes": 0,
            "filler_words": {},
            "presentation_score": 0,
            "score_notes": [
                "Enter a presentation script to calculate a score."
            ],
            "feedback": [
                "Enter a presentation script to receive feedback."
            ],
            "analysis_method": "rule_based",
            "limitations": (
                "This version analyzes text only. It does not "
                "evaluate voice, pronunciation, body language, "
                "or actual delivery."
            ),
        }

    # Count words and sentences.
    words = re.findall(r"\b[\w'-]+\b", text)
    word_count = len(words)

    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text)
        if sentence.strip()
    ]

    sentence_count = len(sentences)

    # Estimate speaking time using 130 words per minute.
    speaking_time = round(word_count / 130, 1)

    # Detect common filler words and phrases.
    filler_counts = {}

    for filler in FILLER_WORDS:
        pattern = (
            r"(?<!\w)"
            + re.escape(filler)
            + r"(?!\w)"
        )

        matches = re.findall(
            pattern,
            text,
            re.IGNORECASE,
        )

        if matches:
            filler_counts[filler] = len(matches)

    total_fillers = sum(filler_counts.values())

    # Calculate a simple rule-based script score.
    # This does not measure real speaking ability.
    score = 100
    score_notes = []

    if word_count < 100:
        score -= 15
        score_notes.append(
            "Short script: -15 points."
        )
    elif word_count > 1000:
        score -= 10
        score_notes.append(
            "Very long script: -10 points."
        )
    else:
        score_notes.append(
            "Script length is within the preferred range: "
            "no deduction."
        )

    average_sentence_length = (
        word_count / sentence_count
        if sentence_count
        else 0
    )

    if average_sentence_length > 30:
        score -= 15
        score_notes.append(
            "Long average sentence length: -15 points."
        )
    elif average_sentence_length > 25:
        score -= 10
        score_notes.append(
            "Some sentences may be too long: -10 points."
        )
    else:
        score_notes.append(
            "Average sentence length is manageable: "
            "no deduction."
        )

    filler_penalty = min(total_fillers * 5, 20)
    score -= filler_penalty

    if filler_penalty:
        score_notes.append(
            f"Detected filler words: -{filler_penalty} points."
        )
    else:
        score_notes.append(
            "No common filler words detected: no deduction."
        )

    score = max(0, min(100, score))

    # Generate coaching feedback.
    feedback = []

    if word_count < 100:
        feedback.append(
            "Your script is relatively short. Add examples "
            "or explanations if you need a longer presentation."
        )
    elif word_count > 1000:
        feedback.append(
            "Your script is quite long. Consider shortening "
            "it to keep the audience engaged."
        )
    else:
        feedback.append(
            "Your script has a moderate length. Practice aloud "
            "to check whether it fits your allotted time."
        )

    if average_sentence_length > 25:
        feedback.append(
            "Some sentences may be long. Break complex "
            "sentences into shorter, clearer statements."
        )
    else:
        feedback.append(
            "Your average sentence length is manageable. "
            "Use clear transitions to connect your ideas."
        )

    if total_fillers > 0:
        feedback.append(
            f"Found {total_fillers} possible filler word "
            "occurrence(s). Review them and replace unnecessary "
            "fillers with pauses."
        )
    else:
        feedback.append(
            "No common filler words were detected. Remember "
            "that text analysis cannot measure spoken delivery."
        )

    feedback.append(
        "Strengthen your opening, organize the main points, "
        "and finish with a clear conclusion."
    )

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "estimated_speaking_time_minutes": speaking_time,
        "filler_words": filler_counts,
        "presentation_score": score,
        "score_notes": score_notes,
        "feedback": feedback,
        "analysis_method": "rule_based",
        "limitations": (
            "The score is a simple heuristic based on script "
            "length, average sentence length, and detected filler "
            "words. It is not a validated measure of presentation "
            "quality. Speaking time is estimated, and actual "
            "delivery, confidence, pronunciation, voice, and body "
            "language are not measured."
        ),
    }
