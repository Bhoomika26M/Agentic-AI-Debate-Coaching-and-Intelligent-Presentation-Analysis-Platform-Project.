import re
from app.services.local_ai import generate_ai_response


ALLOWED_STRATEGIES = [
    "Challenge the Assumption",
    "Weigh the Trade-offs",
    "Evidence-Based Counterargument",
    "Question the Supporting Reason",
    "Consider Alternative Solutions",
]


def generate_rebuttal(argument: str) -> dict:
    argument = argument.strip()

    if not argument:
        return {
            "original_argument": "",
            "rebuttal": "",
            "strategy": "No argument provided",
            "analysis_method": "none",
            "limitations": "Provide an argument to generate a response.",
        }

    prompt = f"""
You are DebateIQ, an expert debate coach.

Generate a persuasive, logical, respectful counterargument
to the user's argument.

ORIGINAL ARGUMENT:
{argument}

Choose exactly ONE strategy from this list:
- Challenge the Assumption
- Weigh the Trade-offs
- Evidence-Based Counterargument
- Question the Supporting Reason
- Consider Alternative Solutions

Write a rebuttal that:
1. Identifies the main claim and its supporting reason.
2. Challenges a genuine weakness, assumption, trade-off,
   or missing consideration.
3. Explains why the counterargument matters.
4. Uses clear language suitable for a student debate.
5. Does not invent facts, statistics, research, or citations.
6. Ends with one relevant question for debate.
7. Contains approximately 80-130 words.

Return exactly this format:

STRATEGY: [one exact strategy name from the list]

REBUTTAL: [the complete rebuttal]
"""

    try:
        ai_text = generate_ai_response(prompt)

        if not isinstance(ai_text, str) or not ai_text.strip():
            raise ValueError("Ollama returned an empty response")


        # Find the strategy label, if present.
        strategy_match = re.search(
            r"(?im)^\s*STRATEGY\s*:\s*(.+?)\s*$",
            ai_text,
        )

        strategy_lookup = {
            item.casefold(): item
            for item in ALLOWED_STRATEGIES
        }

        strategy = ""

        if strategy_match:
            suggested_strategy = (
                strategy_match.group(1).strip().rstrip(" .")
            )
            strategy = strategy_lookup.get(
                suggested_strategy.casefold(),
                "",
            )

        # Some models return only the strategy name without its label.
        if not strategy:
            for item in ALLOWED_STRATEGIES:
                if re.search(
                    rf"(?im)^\s*[*#_ -]*{re.escape(item)}[*#_ ]*\s*$",
                    ai_text,
                ):
                    strategy = item
                    break

        if not strategy:
            raise ValueError(
                "Ollama returned an invalid or missing strategy"
            )

        # Prefer the explicitly labelled REBUTTAL section.
        rebuttal_match = re.search(
            r"(?ims)^\s*REBUTTAL\s*:\s*(.+)",
            ai_text,
        )

        if rebuttal_match:
            rebuttal = rebuttal_match.group(1).strip()

        else:
            # Otherwise, remove headings and the strategy name,
            # then use the remaining response as the rebuttal.
            rebuttal = ai_text.strip()

            rebuttal = re.sub(
                r"(?im)^\s*STRATEGY\s*:\s*.+$",
                "",
                rebuttal,
            )

            rebuttal = re.sub(
                r"(?im)^\s*REBUTTAL\s*:\s*",
                "",
                rebuttal,
            )

            rebuttal = re.sub(
                rf"(?im)^\s*[*#_ -]*{re.escape(strategy)}[*#_ ]*\s*$",
                "",
                rebuttal,
            )

            rebuttal = rebuttal.strip()

        # Remove accidental extra sections.
        rebuttal = re.split(
            r"(?im)^\s*(?:STRATEGY|ORIGINAL ARGUMENT)\s*:",
            rebuttal,
            maxsplit=1,
        )[0].strip()

        if not rebuttal:
            raise ValueError("Ollama returned an empty rebuttal")

        return {
            "original_argument": argument,
            "rebuttal": rebuttal,
            "strategy": strategy,
            "analysis_method": "ollama",
            "limitations": (
                "AI-generated rebuttals may contain inaccuracies. "
                "Factual claims have not been independently verified. "
                "Review the response before relying on it."
            ),
        }

    except Exception as error:
        print(f"Ollama failed; using fallback: {error}")

        # Rule-based fallback.
        match = re.search(
            r"\b(because|since|due to)\b",
            argument,
            re.IGNORECASE,
        )

        if match:
            claim = argument[:match.start()].strip(" ,.:;")
            reason = argument[match.end():].strip(" ,.:;")

            rebuttal = (
                f"You argue that {claim.lower()} because {reason}. "
                "However, the reason provided does not automatically "
                "prove that the conclusion is the best solution. "
                "Other relevant factors, possible disadvantages, "
                "and alternative explanations should also be examined. "
                "A stronger conclusion would require considering "
                "those factors rather than relying on one reason alone. "
                "What other factors should be considered before "
                "accepting this conclusion?"
            )

            strategy = "Question the Supporting Reason"

        else:
            rebuttal = (
                f"You argue that: {argument}. However, before "
                "accepting this conclusion, we should examine the "
                "assumptions behind it and consider whether other "
                "explanations or practical limitations exist. "
                "Disagreement alone does not disprove a claim, "
                "so the reasoning should be assessed carefully "
                "and fairly. What assumptions or additional "
                "information would help establish whether "
                "this argument is convincing?"
            )

            strategy = "Challenge the Assumption"

        return {
            "original_argument": argument,
            "rebuttal": rebuttal,
            "strategy": strategy,
            "analysis_method": "rule_based_fallback",
            "limitations": (
                "Ollama was unavailable or returned an unusable "
                "response. A rule-based fallback generated this "
                "rebuttal. The fallback uses basic text patterns "
                "and does not independently verify facts."
            ),
        }
