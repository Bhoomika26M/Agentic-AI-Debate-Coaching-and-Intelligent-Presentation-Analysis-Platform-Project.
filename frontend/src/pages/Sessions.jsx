import { useEffect, useState } from "react";
import { api } from "../api";

const FORMATS = [
  ["one_on_one", "One-on-One Debate"],
  ["parliamentary", "Parliamentary Debate"],
  ["oxford", "Oxford Debate"],
  ["policy", "Policy Debate"],
  ["public_forum", "Public Forum Debate"],
];

export default function Sessions({ onOpenSession }) {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("one_on_one");
  const [position, setPosition] = useState("for");
  const [busy, setBusy] = useState(false);

  function refresh() {
    api.listSessions().then(setSessions).catch((e) => setError(e.message));
  }

  useEffect(refresh, []);

  async function createSession(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api.createSession({
        topic,
        debate_format: format,
        position,
      });
      setTopic("");
      setShowForm(false);
      refresh();
      onOpenSession(session.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="section-title" style={{ border: "none", margin: 0 }}>
          Your debate sessions
        </p>
        <button className="secondary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New session"}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <form onSubmit={createSession}>
            <label>Debate topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Should schools ban smartphones?"
              required
            />

            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>

            <label>Your position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="for">For</option>
              <option value="against">Against</option>
            </select>

            {error && <p className="error-text">{error}</p>}

            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Start session"}
            </button>
          </form>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        {sessions === null && <p className="empty-state">Loading sessions…</p>}
        {sessions && sessions.length === 0 && (
          <p className="empty-state">
            No debate sessions yet. Create one to submit an argument for analysis.
          </p>
        )}
        {sessions &&
          sessions.map((s) => (
            <div key={s.id} className="session-card" onClick={() => onOpenSession(s.id)}>
              <h3>{s.topic}</h3>
              <div className="meta">
                {FORMATS.find((f) => f[0] === s.debate_format)?.[1] || s.debate_format} · Position:{" "}
                {s.position} · {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
