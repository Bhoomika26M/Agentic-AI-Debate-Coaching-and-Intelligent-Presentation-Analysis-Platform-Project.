
import re


def generate_rebuttal(argument: str) -> dict:
    argument = argument.strip()

    if not argument:
        return {
            "rebuttal": "",
            "strategy": "No argument provided",
            "limitations": "Provide an argument to generate a response.",
        }

    text = argument.lower()

    # Rule 1: Arguments about early school start times.
    if (
        "school" in text
        and any(word in text for word in [
            "start early",
            "starts early",
            "starting early",
            "early start",
            "start earlier",
        ])
        and any(word in text for word in [
            "afternoon",
            "activities",
            "more time",
            "free time",
        ])
    ):
        rebuttal = (
            "You argue that schools should start early to give "
            "students more time in the afternoon for other activities. "
            "However, having more free time later in the day does not "
            "necessarily mean an early school start is the best option. "
            "An early start may reduce sleep for some students and make "
            "it harder for them to concentrate. Schools should consider "
            "students' sleep, learning outcomes, and extracurricular "
            "commitments together. Comparing evidence about these "
            "factors would help determine which schedule is better."
        )
        strategy = "Context-specific counterargument"

    # Rule 2: Arguments based on popularity.
    elif any(phrase in text for phrase in [
        "everyone knows",
        "everybody does it",
        "everyone is doing it",
        "most people believe",
        "everyone believes",
    ]):
        rebuttal = (
            "Your argument relies on what many people believe or do. "
            "However, popularity alone does not establish that a claim "
            "is correct. We should examine reliable evidence and the "
            "reasons behind the claim rather than relying only on how "
            "widely it is accepted. What evidence supports your position?"
        )
        strategy = "Challenge to popularity-based reasoning"

    # Rule 3: Arguments that attack a person.
    elif any(phrase in text for phrase in [
        "you are stupid",
        "you are an idiot",
    ]):
        rebuttal = (
            "Attacking a person does not establish whether their "
            "argument is right or wrong. We should evaluate the claim "
            "on its merits and examine the evidence supporting it. "
            "Please address the person's reasoning rather than "
            "their personal characteristics."
        )
        strategy = "Refocus on the argument"

    # Rule 4: Arguments with an explicit reason.
    elif re.search(r"\b(because|since|due to)\b", text):
        match = re.search(r"\b(because|since|due to)\b", argument,
                          re.IGNORECASE)

        claim = argument[:match.start()].strip(" ,.:;")
        reason = argument[match.end():].strip(" ,.:;")

        rebuttal = (
            f"You argue that {claim.lower()}, because {reason}. "
            "However, the reason provided does not automatically "
            "prove the conclusion. We should check whether the reason "
            "is supported by reliable evidence and whether other "
            "factors could lead to a different conclusion. "
            "Can you provide evidence showing how this reason "
            "supports your claim?"
        )
        strategy = "Examine the supporting reason"

    # Rule 5: General fallback for other arguments.
    else:
        rebuttal = (
            f"You argue that: \"{argument}\". However, a claim needs "
            "reliable supporting evidence before it can be accepted. "
            "We should examine the assumptions behind the argument, "
            "consider alternative explanations, and check whether "
            "the evidence supports the conclusion. What specific "
            "evidence would strengthen your position?"
        )
        strategy = "Evidence-based counterargument"

    return {
        "original_argument": argument,
        "rebuttal": rebuttal,
        "strategy": strategy,
        "limitations": (
            "This version uses predefined rules and text patterns. "
            "It can tailor responses to certain argument types but "
            "does not understand arguments like a trained AI language "
            "model. Some responses may be incomplete or unsuitable "
            "for the context."
        ),
    }
