import re
from collections import Counter


def _analyses(session):
    return [
        turn.analysis.get('analysis', turn.analysis)
        for turn in session.turns.filter(speaker='USER').order_by('turn_number')
        if turn.analysis
    ]


def _mean(analyses, key):
    values = [item.get('scores', {}).get(key) for item in analyses]
    values = [value for value in values if isinstance(value, (int, float))]
    return round(sum(values) / len(values)) if values else None


def _dimension_text(dimension, score):
    labels = {
        'clarity': 'Clarity',
        'relevance': 'Relevance to the topic',
        'evidence': 'Evidence usage',
        'logic': 'Logical consistency',
        'persuasiveness': 'Persuasiveness',
    }
    return labels[dimension], score


def build_debate_evaluation(session):
    analyses = _analyses(session)
    if not analyses:
        return {
            'overall_score': None,
            'scores': {},
            'strengths': [],
            'weaknesses': [],
            'recommendations': [
                'Submit at least one argument turn to receive an evidence-based debate evaluation.'
            ],
            'fallacies': [],
            'rebuttal_effectiveness': None,
            'method': 'unavailable',
            'limitations': 'No user argument turns were available to score.',
        }

    dimensions = ('clarity', 'relevance', 'evidence', 'logic', 'persuasiveness')
    scores = {key: _mean(analyses, key) for key in dimensions}
    turn_scores = [
        turn.turn_score
        for turn in session.turns.filter(speaker='USER', turn_score__isnull=False)
    ]
    overall = round(sum(turn_scores) / len(turn_scores)) if turn_scores else None

    scored_dimensions = sorted(
        ((key, value) for key, value in scores.items() if value is not None),
        key=lambda pair: pair[1],
        reverse=True,
    )
    strengths = [
        f"{_dimension_text(key, value)[0]} was a relative strength ({value}/100 average)."
        for key, value in scored_dimensions[:2]
    ]
    weaknesses = [
        f"{_dimension_text(key, value)[0]} is a priority to improve ({value}/100 average)."
        for key, value in scored_dimensions[-2:]
        if value < 75
    ]

    fallacy_counts = Counter(
        fallacy.get('type', 'Unspecified')
        for analysis in analyses
        for fallacy in analysis.get('fallacies', [])
    )
    fallacies = [
        {'type': name, 'count': count}
        for name, count in fallacy_counts.most_common()
    ]

    recommendations = []
    for analysis in analyses:
        recommendations.extend(analysis.get('recommendations', []))
    if fallacies:
        recommendations.extend(
            f"Review the {name} example(s) and address the specific correction in the next round."
            for name, _count in fallacy_counts.most_common(2)
        )
    if not recommendations:
        recommendations.append("Support each claim with checkable evidence and explain the reasoning link.")
    recommendations = list(dict.fromkeys(recommendations))[:6]

    user_turns = list(session.turns.filter(speaker='USER').order_by('turn_number'))
    overlap_values = []
    for user_turn in user_turns:
        previous_ai = session.turns.filter(
            speaker='AI',
            turn_number__lt=user_turn.turn_number,
        ).order_by('-turn_number').first()
        if previous_ai is None:
            continue
        ai_terms = {
            word for word in re.findall(r'[a-z]{4,}', previous_ai.transcript.lower())
            if word not in {'that', 'this', 'with', 'from', 'your', 'their', 'would', 'could'}
        }
        user_terms = {
            word for word in re.findall(r'[a-z]{4,}', user_turn.transcript.lower())
            if word not in {'that', 'this', 'with', 'from', 'your', 'their', 'would', 'could'}
        }
        overlap_values.append(
            min(100, 40 + len(ai_terms & user_terms) * 8) if ai_terms else 40
        )
    rebuttal_effectiveness = (
        round(sum(overlap_values) / len(overlap_values)) if overlap_values else None
    )

    methods = {
        analysis.get('analysis_method')
        for analysis in analyses
        if analysis.get('analysis_method')
    }
    method = 'gemini' if methods == {'gemini'} else 'rule_based'

    return {
        'overall_score': overall,
        'scores': scores,
        'strengths': strengths,
        'weaknesses': weaknesses,
        'recommendations': recommendations,
        'fallacies': fallacies,
        'rebuttal_effectiveness': rebuttal_effectiveness,
        'method': method,
        'limitations': (
            'Rebuttal responsiveness is a lexical-overlap estimate, not a semantic judgment. '
            'Scores summarize the argument-analysis engine and do not independently verify evidence.'
        ),
    }
