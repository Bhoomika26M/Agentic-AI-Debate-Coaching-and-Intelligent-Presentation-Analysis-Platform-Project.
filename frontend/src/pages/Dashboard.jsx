import { useEffect, useState } from "react";
import { api } from "../api";
import ScoreBar from "../components/ScoreBar";

const CRITERION_LABELS = {
  clarity: "Clarity",
  relevance: "Relevance",
  evidence_strength: "Evidence Strength",
  logical_consistency: "Logical Consistency",
  persuasiveness: "Persuasiveness",
};

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="content panel error-text">{error}</div>;
  if (!data) return <div className="content empty-state">Loading your dashboard…</div>;

  const hasData = data.total_arguments > 0;

  return (
    <div className="content">
      <p className="section-title">Learner dashboard</p>
      <p className="sans" style={{ color: "var(--ink-soft)", marginTop: "-0.6rem" }}>
        Welcome back, {user.full_name.split(" ")[0]}.
      </p>

      <div className="two-col" style={{ marginTop: "1.5rem" }}>
        <div className="panel">
          <p className="section-title">Overall performance</p>
          {hasData ? (
            <>
              <div className="overall-score">
                <span className="num">{data.average_overall_score.toFixed(0)}</span>
                <span className="label">
                  average score across {data.total_arguments} argument
                  {data.total_arguments === 1 ? "" : "s"}
                </span>
              </div>
              {Object.entries(data.average_scores_by_criterion).map(([key, val]) => (
                <ScoreBar key={key} label={CRITERION_LABELS[key] || key} value={val} />
              ))}
            </>
          ) : (
            <p className="empty-state">
              No arguments analyzed yet. Start a debate session to see your scores here.
            </p>
          )}
        </div>

        <div className="panel">
          <p className="section-title">Fallacy frequency</p>
          {Object.keys(data.fallacy_frequency).length ? (
            <div>
              {Object.entries(data.fallacy_frequency).map(([type, count]) => (
                <span key={type} className="chip fallacy">
                  {type} × {count}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-state">No fallacies detected yet.</p>
          )}

          <p className="section-title" style={{ marginTop: "1.3rem" }}>
            Score trend
          </p>
          {data.score_trend.length ? (
            <div className="sans" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              {data.score_trend.map((s, i) => (
                <span key={i}>
                  {s.toFixed(0)}
                  {i < data.score_trend.length - 1 ? " → " : ""}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-state">Trend appears after your first analyzed argument.</p>
          )}
        </div>
      </div>

      {hasData && (
        <div className="panel">
          <p className="section-title">Coaching insights</p>
          <ul className="recommendation-list">
            {data.top_recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
