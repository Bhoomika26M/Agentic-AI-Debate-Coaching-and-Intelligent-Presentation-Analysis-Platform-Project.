import { useEffect, useState } from "react";
import { api } from "../api";
import ScoreBar from "../components/ScoreBar";

export default function SessionDetail({ sessionId, sessions, onBack }) {
  const [args, setArgs] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const session = sessions?.find((s) => s.id === sessionId);

  function refresh() {
    api.listArguments(sessionId).then((data) => setArgs(data.reverse())).catch((e) => setError(e.message));
  }

  useEffect(refresh, [sessionId]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.submitArgument({ session_id: sessionId, text });
      setText("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      <button className="top-nav-back" onClick={onBack}>
        ← Back to sessions
      </button>

      <p className="section-title" style={{ border: "none" }}>
        {session ? session.topic : `Session #${sessionId}`}
      </p>

      <div className="panel">
        <p className="section-title">Submit an argument</p>
        <form onSubmit={submit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your argument for this debate. It will be analyzed for clarity, evidence, logical consistency, persuasiveness, and any logical fallacies."
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button className="primary" type="submit" disabled={busy || !text.trim()}>
            {busy ? "Analyzing…" : "Analyze argument"}
          </button>
        </form>
      </div>

      {args === null && <p className="empty-state">Loading arguments…</p>}
      {args && args.length === 0 && (
        <p className="empty-state">No arguments submitted yet for this session.</p>
      )}

      {args &&
        args.map((a) => <ArgumentResult key={a.id} argument={a} />)}
    </div>
  );
}

function ArgumentResult({ argument }) {
  const a = argument.analysis;

  return (
    <div className="panel">
      <p className="section-title">
        Submitted {new Date(argument.created_at).toLocaleString()}
      </p>
      <p style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>&ldquo;{argument.text}&rdquo;</p>

      {!a && <p className="empty-state">Analysis pending…</p>}

      {a && (
        <>
          <div className="claim-block">
            <div className="overall-score">
              <span className="num">{a.overall_score.toFixed(0)}</span>
              <span className="label">overall performance score</span>
            </div>
            <ScoreBar label="Argument Quality (30%)" value={a.argument_quality_score} />
            <ScoreBar label="Evidence Usage (20%)" value={a.evidence_usage_score} />
            <ScoreBar label="Logical Consistency (20%)" value={a.logical_consistency_score} />
            <ScoreBar label="Rebuttal Effectiveness (15%)" value={a.rebuttal_effectiveness_score} />
            <ScoreBar label="Communication Skills (15%)" value={a.communication_skills_score} />
          </div>

          <div className="claim-block">
            <p className="section-title">Logical fallacies detected</p>
            {a.fallacies.length === 0 && (
              <p className="chip good">No fallacies detected</p>
            )}
            {a.fallacies.map((f, i) => (
              <div className="fallacy-item" key={i}>
                <span className="type-label">{f.type}</span>
                <div style={{ fontSize: "0.92rem" }}>&ldquo;{f.snippet}&rdquo;</div>
                <div className="sans" style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>
                  {f.explanation}
                </div>
                <div className="sans" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Suggestion: {f.suggestion}
                </div>
              </div>
            ))}
          </div>

          <div className="claim-block">
            <p className="section-title">Coaching recommendations</p>
            <ul className="recommendation-list">
              {a.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="claim-block">
            <p className="section-title">Counterarguments &amp; challenge questions</p>
            {a.counterarguments.map((c, i) => (
              <div className="counter-item" key={i}>
                <span className="type-label">{c.type}</span>
                <div style={{ fontSize: "0.92rem" }}>{c.text}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
