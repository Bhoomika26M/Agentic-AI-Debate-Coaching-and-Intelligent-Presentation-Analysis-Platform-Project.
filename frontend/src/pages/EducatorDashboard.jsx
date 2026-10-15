// EducatorDashboard.jsx
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function EducatorDashboard() {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/api/dashboard/educator').then(r=>setData(r.data))
    .catch(e=>setErr(e.response?.data?.detail||'Failed')); }, []);
  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading…</div>;
  return (
    <div>
      <h1>Educator Dashboard</h1>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Avg Score</th><th>Evaluations</th></tr></thead>
          <tbody>{data.learners.sort((a,b)=>b.avg_score-a.avg_score).map(l => (
            <tr key={l.id}><td>{l.name}</td><td>{l.avg_score}</td><td>{l.evaluations}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}