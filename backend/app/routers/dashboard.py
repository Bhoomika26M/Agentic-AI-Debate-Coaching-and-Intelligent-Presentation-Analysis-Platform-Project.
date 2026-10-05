import json
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardOut)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    sessions = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.owner_id == current_user.id)
        .all()
    )

    all_analyses = []
    for s in sessions:
        for a in s.arguments:
            if a.analysis:
                all_analyses.append(a.analysis)

    all_analyses.sort(key=lambda x: x.created_at)

    total_arguments = sum(len(s.arguments) for s in sessions)

    if not all_analyses:
        return schemas.DashboardOut(
            total_sessions=len(sessions),
            total_arguments=total_arguments,
            average_overall_score=0.0,
            average_scores_by_criterion={},
            fallacy_frequency={},
            score_trend=[],
            top_recommendations=[],
        )

    def avg(field):
        return round(sum(getattr(a, field) for a in all_analyses) / len(all_analyses), 1)

    avg_scores = {
        "clarity": avg("clarity"),
        "relevance": avg("relevance"),
        "evidence_strength": avg("evidence_strength"),
        "logical_consistency": avg("logical_consistency"),
        "persuasiveness": avg("persuasiveness"),
    }

    fallacy_counter = Counter()
    rec_counter = Counter()
    for a in all_analyses:
        for f in json.loads(a.fallacies_json):
            fallacy_counter[f["type"]] += 1
        for r in json.loads(a.recommendations_json):
            rec_counter[r] += 1

    top_recs = [rec for rec, _ in rec_counter.most_common(5)]

    return schemas.DashboardOut(
        total_sessions=len(sessions),
        total_arguments=total_arguments,
        average_overall_score=avg("overall_score"),
        average_scores_by_criterion=avg_scores,
        fallacy_frequency=dict(fallacy_counter),
        score_trend=[a.overall_score for a in all_analyses],
        top_recommendations=top_recs,
    )
