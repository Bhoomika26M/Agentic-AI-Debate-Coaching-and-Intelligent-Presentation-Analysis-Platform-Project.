import { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [system, setSystem] = useState(null);
  const [reports, setReports] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/admin'),
      api.get('/api/dashboard/admin/system'),
      api.get('/api/dashboard/admin/reports'),
    ]).then(([a, s, r]) => {
      setData(a.data); setSystem(s.data); setReports(r.data);
    }).catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
  }, []);

  if (err) return <div className="card error">{err}</div>;
  if (!data || !system || !reports) return <div className="card">Loading…</div>;

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <div className="grid">
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Total Users</div>
          <div className="score">{data.total_users}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Debates</div>
          <div className="score">{data.total_debates}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>Presentations</div>
          <div className="score">{data.total_presentations}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)' }}>AI Analyses</div>
          <div className="score">{data.total_analyses}</div>
        </div>
      </div>

      <div className="card">
        <h3>AI Model Monitoring</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Status: <b>{system.status}</b>
        </p>
        <table>
          <tbody>
            <tr><td><b>Primary Model</b></td><td>{system.models.primary}</td></tr>
            <tr><td><b>Fallback Model</b></td><td>{system.models.fallback}</td></tr>
            {Object.entries(system.ai_calls_by_feature).map(([k, v]) => (
              <tr key={k}><td>{k.replace(/_/g, ' ')}</td><td>{v} calls</td></tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          {system.uptime_note}
        </p>
      </div>

      <div className="card">
        <h3>Role Distribution</h3>
        {Object.entries(data.role_counts).map(([r, c]) => (
          <div key={r}><span className="badge">{r}: {c}</span></div>
        ))}
      </div>

      <div className="card">
        <h3>Recent Users</h3>
        <table>
          <thead><tr><th>Email</th><th>Role</th><th>Created</th></tr></thead>
          <tbody>
            {data.recent_users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>System Reports — Recent Debates</h3>
        {reports.recent_debates.length === 0
          ? <p style={{ color: 'var(--muted)' }}>No debates yet.</p>
          : (
            <table>
              <thead><tr><th>User</th><th>Topic</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {reports.recent_debates.map((d, i) => (
                  <tr key={i}>
                    <td>{d.user}</td>
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
        <h3>System Reports — Recent Evaluations</h3>
        {reports.recent_evaluations.length === 0
          ? <p style={{ color: 'var(--muted)' }}>No evaluations yet.</p>
          : (
            <table>
              <thead><tr><th>User</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {reports.recent_evaluations.map((e, i) => (
                  <tr key={i}>
                    <td>{e.user}</td>
                    <td>{e.score}</td>
                    <td>{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}