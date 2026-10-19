import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api/client';

export default function EducatorDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/api/dashboard/educator')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
  }, []);

  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading educator dashboard…</div>;

  const dimData = Object.entries(data.class_dimension_avg).map(([k, v]) => ({
    dimension: k.replace(/_/g, ' '), score: v,
  }));

  const distData = Object.entries(data.distribution).map(([k, v]) => ({
    bucket: k, count: v,
  }));

  return (
    <div>
      <h1>Educator Dashboard</h1>

      <div className="grid">
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Total Learners</div>
          <div className="score">{data.total_learners}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Class Average</div>
          <div className="score">{data.class_avg}</div>
        </div>
      </div>

      <div className="card">
        <h3>Class Dimension Averages</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          The lowest bar is the class's weakest area — target it with coaching.
        </p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={dimData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="dimension" stroke="#94a3b8" />
              <YAxis domain={[0, 100]} stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #334155' }} />
              <Bar dataKey="score" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Score Distribution</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="bucket" stroke="#94a3b8" />
              <YAxis allowDecimals={false} stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #334155' }} />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Student Rankings</h3>
        {data.rankings.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No learners yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Debates</th>
                <th>Presentations</th><th>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {data.rankings.map(r => (
                <tr key={r.id}>
                  <td>{r.rank}</td>
                  <td>{r.name}</td>
                  <td>{r.debates}</td>
                  <td>{r.presentations}</td>
                  <td><b>{r.avg_score}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Recent Debate Reports</h3>
        {data.debate_reports.length === 0
          ? <p style={{ color: 'var(--muted)' }}>No debates yet.</p>
          : (
            <table>
              <thead><tr><th>Learner</th><th>Topic</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {data.debate_reports.map((d, i) => (
                  <tr key={i}>
                    <td>{d.learner_name}</td>
                    <td>{d.topic}</td>
                    <td><span className="badge">{d.status}</span></td>
                    <td>{new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <div className="card">
        <h3>Recent Presentation Reports</h3>
        {data.presentation_reports.length === 0
          ? <p style={{ color: 'var(--muted)' }}>No presentations yet.</p>
          : (
            <table>
              <thead><tr><th>Title</th><th>Type</th><th>Date</th></tr></thead>
              <tbody>
                {data.presentation_reports.map((p, i) => (
                  <tr key={i}>
                    <td>{p.title}</td>
                    <td><span className="badge">{p.input_type}</span></td>
                    <td>{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}