// AdminDashboard.jsx
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/api/dashboard/admin').then(r=>setData(r.data))
    .catch(e=>setErr(e.response?.data?.detail||'Failed')); }, []);
  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading…</div>;
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="grid">
        <div className="card"><div style={{color:'var(--muted)'}}>Total Users</div><div className="score">{data.total_users}</div></div>
        <div className="card"><div style={{color:'var(--muted)'}}>Debates</div><div className="score">{data.total_debates}</div></div>
        <div className="card"><div style={{color:'var(--muted)'}}>Presentations</div><div className="score">{data.total_presentations}</div></div>
        <div className="card"><div style={{color:'var(--muted)'}}>Analyses</div><div className="score">{data.total_analyses}</div></div>
      </div>
      <div className="card">
        <h3>Role Distribution</h3>
        {Object.entries(data.role_counts).map(([r,c]) => (
          <div key={r}><span className="badge">{r}: {c}</span></div>
        ))}
      </div>
      <div className="card">
        <h3>Recent Users</h3>
        <table><thead><tr><th>Email</th><th>Role</th><th>Created</th></tr></thead>
          <tbody>{data.recent_users.map(u => (
            <tr key={u.id}><td>{u.email}</td><td>{u.role}</td>
              <td>{new Date(u.created_at).toLocaleString()}</td></tr>))}
          </tbody></table>
      </div>
    </div>
  );
}