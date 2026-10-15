import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/api/dashboard/learner').then(r => setData(r.data)).catch(e =>
      setErr(e.response?.data?.detail || 'Failed to load dashboard'));
  }, []);

  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading dashboard…</div>;

  const isEmpty = data.total_debates === 0 && data.total_presentations === 0;

  return (
    <div>
      <h1>Learner Dashboard</h1>
      {isEmpty && (
        <div className="card">
          <h3>Get started 🚀</h3>
          <p style={{color:'var(--muted)'}}>
            Create your first debate or analyze a presentation to see insights here.
          </p>
          <Link to="/debates/new"><button className="btn">Start a Debate</button></Link>
          <Link to="/presentation" style={{marginLeft:8}}><button className="btn-secondary">Analyze Presentation</button></Link>
        </div>
      )}

      <div className="grid">
        <div className="card"><div style={{color:'var(--muted)'}}>Debate Sessions</div><div className="score">{data.total_debates}</div></div>
        <div className="card"><div style={{color:'var(--muted)'}}>Presentations</div><div className="score">{data.total_presentations}</div></div>
        <div className="card"><div style={{color:'var(--muted)'}}>Avg Score</div><div className="score">{data.average_score}</div></div>
      </div>

      {data.score_trend?.length > 0 && (
        <div className="card">
          <h3>Score Trend</h3>
          <div style={{height: 260}}>
            <ResponsiveContainer>
              <LineChart data={data.score_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip contentStyle={{background:'#0b1220', border:'1px solid #334155'}} />
                <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h3>Strengths</h3>
          {data.strengths?.length ? <ul className="list">{data.strengths.map((s,i)=><li key={i}>✅ {s}</li>)}</ul>
            : <p style={{color:'var(--muted)'}}>Complete a debate to see strengths.</p>}
        </div>
        <div className="card">
          <h3>Areas to Improve</h3>
          {data.weaknesses?.length ? <ul className="list">{data.weaknesses.map((s,i)=><li key={i}>⚠️ {s}</li>)}</ul>
            : <p style={{color:'var(--muted)'}}>Complete a debate to see weaknesses.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Recent Sessions</h3>
        {data.recent_sessions?.length ? (
          <table>
            <thead><tr><th>Topic</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>{data.recent_sessions.map(s => (
              <tr key={s.id}>
                <td><Link to={`/debates/${s.id}`} style={{color:'var(--accent)'}}>{s.topic}</Link></td>
                <td><span className="badge">{s.status}</span></td>
                <td>{new Date(s.created_at).toLocaleString()}</td>
              </tr>))}
            </tbody>
          </table>
        ) : <p style={{color:'var(--muted)'}}>No sessions yet.</p>}
      </div>
    </div>
  );
}