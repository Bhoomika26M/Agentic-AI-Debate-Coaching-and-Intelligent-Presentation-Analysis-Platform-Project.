import re

FILLERS = {"um", "uh", "like", "you know", "basically", "actually",
           "literally", "so", "right", "okay", "well"}

def count_words(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))

def count_fillers(text: str) -> int:
    lower = " " + text.lower() + " "
    count = 0
    for f in FILLERS:
        if " " in f:
            count += lower.count(f" {f} ")
        else:
            count += len(re.findall(rf"\b{re.escape(f)}\b", lower))
    return count

def words_per_minute(word_count: int, duration_seconds: float | None) -> float | None:
    if not duration_seconds or duration_seconds <= 0:
        return None
    return round((word_count / duration_seconds) * 60, 2)