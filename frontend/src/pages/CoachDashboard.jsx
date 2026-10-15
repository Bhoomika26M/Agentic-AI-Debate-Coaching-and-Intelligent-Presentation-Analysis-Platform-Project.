// CoachDashboard.jsx
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function CoachDashboard() {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/api/dashboard/coach').then(r=>setData(r.data))
    .catch(e=>setErr(e.response?.data?.detail||'Failed')); }, []);
  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading…</div>;
  return (
    <div>
      <h1>Coach Dashboard</h1>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Avg Score</th><th>Evaluations</th></tr></thead>
          <tbody>{data.learners.map(l => (
            <tr key={l.id}><td>{l.name}</td><td>{l.email}</td>
              <td>{l.avg_score}</td><td>{l.evaluations}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}