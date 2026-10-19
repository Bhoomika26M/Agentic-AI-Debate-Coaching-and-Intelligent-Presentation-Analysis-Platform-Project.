import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api/client';

export default function CoachDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/api/dashboard/coach')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
  }, []);

  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading coach dashboard…</div>;

  return (
    <div>
      <h1>Coach Dashboard</h1>

      <div className="grid">
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Learners</div>
          <div className="score">{data.total_learners}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Cohort Average</div>
          <div className="score">{data.cohort_avg}</div>
        </div>
      </div>

      <div className="card">
        <h3>Student Progress Monitor</h3>
        {data.learners.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No learners registered yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Debates</th><th>Evaluations</th>
                <th>Avg Score</th><th>Skill Gaps</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.learners.map(l => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.email}</td>
                  <td>{l.debates}</td>
                  <td>{l.evaluations}</td>
                  <td><b>{l.avg_score}</b></td>
                  <td>
                    {l.skill_gaps.length === 0
                      ? <span style={{ color: 'var(--muted)' }}>—</span>
                      : l.skill_gaps.slice(0, 2).map((g, i) => (
                        <span key={i} className="badge">{g.area} ({g.occurrences})</span>
                      ))}
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => setSelected(l)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="card">
          <h3>{selected.name} — Detailed View</h3>
          <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>

          <div className="grid" style={{ marginTop: 12 }}>
            {Object.entries(selected.component_avg).map(([k, v]) => (
              <div key={k} className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {k.replace(/_/g, ' ')}
                </div>
                <div className="score">{v}</div>
              </div>
            ))}
          </div>

          {selected.trend.length > 0 && (
            <div style={{ height: 240, marginTop: 16 }}>
              <ResponsiveContainer>
                <LineChart data={selected.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #334155' }} />
                  <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h4>Strengths</h4>
          <ul className="list">
            {selected.strengths.length
              ? selected.strengths.map((s, i) => <li key={i}>✅ {s}</li>)
              : <li style={{ color: 'var(--muted)' }}>None recorded</li>}
          </ul>

          <h4>Skill Gaps</h4>
          <ul className="list">
            {selected.skill_gaps.length
              ? selected.skill_gaps.map((g, i) => (
                <li key={i}>⚠️ {g.area} — appears in {g.occurrences} evaluation(s)</li>))
              : <li style={{ color: 'var(--muted)' }}>No gaps identified</li>}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Recent Evaluations</h3>
        {data.recent_evaluations.length === 0
          ? <p style={{ color: 'var(--muted)' }}>No evaluations recorded yet.</p>
          : (
            <table>
              <thead><tr><th>Learner</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {data.recent_evaluations.map((e, i) => (
                  <tr key={i}>
                    <td>{e.learner_name}</td>
                    <td>{e.score}</td>
                    <td>{new Date(e.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}