
def generate_personalized_coaching(
    argument_score: int,
    rebuttal_score: int,
    presentation_score: int,
    clarity_score: int,
):
    """Generate coaching recommendations from debate performance scores."""

    scores = {
        "Argument quality": argument_score,
        "Rebuttal effectiveness": rebuttal_score,
        "Presentation delivery": presentation_score,
        "Structure and clarity": clarity_score,
    }

    overall_score = round(sum(scores.values()) / len(scores), 1)

    strongest_area = max(scores, key=scores.get)
    weakest_area = min(scores, key=scores.get)

    recommendations = {
        "Argument quality": (
            "Support your claims with reliable evidence and explain "
            "why that evidence supports your conclusion."
        ),
        "Rebuttal effectiveness": (
            "Identify assumptions in opposing arguments and respond "
            "with evidence and logical reasoning."
        ),
        "Presentation delivery": (
            "Practice speaking at a steady pace, using purposeful "
            "pauses, and maintaining natural eye contact."
        ),
        "Structure and clarity": (
            "Organize your speech into an introduction, main points, "
            "supporting evidence, and a clear conclusion."
        ),
    }

    exercises = {
        "Argument quality": (
            "Write one claim supported by two reasons and one "
            "reliable piece of evidence."
        ),
        "Rebuttal effectiveness": (
            "Write an opposing argument and respond with one "
            "counterclaim and two supporting reasons."
        ),
        "Presentation delivery": (
            "Record a one-minute speech and review your pace, "
            "pauses, and eye contact."
        ),
        "Structure and clarity": (
            "Prepare a two-minute speech with an introduction, "
            "three main points, and a conclusion."
        ),
    }

    if scores[weakest_area] < 50:
        priority = "High"
    elif scores[weakest_area] < 75:
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "overall_score": overall_score,
        "category_scores": scores,
        "strongest_area": strongest_area,
        "weakest_area": weakest_area,
        "priority": priority,
        "recommendation": recommendations[weakest_area],
        "practice_exercise": exercises[weakest_area],
        "message": (
            "Practice consistently. Focus on one improvement area "
            "at a time and track your progress."
        ),
    }
