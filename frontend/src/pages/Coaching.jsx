import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Coaching() {
  const [res, setRes] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  useEffect(() => { api.get('/api/coaching/latest').then(r => setRes(r.data)).catch(()=>{}); }, []);

  const generate = async () => {
    setBusy(true); setErr('');
    try { const r = await api.post('/api/coaching/generate'); setRes(r.data); }
    catch (e) { setErr(e.response?.data?.detail || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Personalized Coaching</h1>
      <button className="btn" onClick={generate} disabled={busy}>
        {busy ? 'Generating…' : (res ? 'Regenerate Recommendations' : 'Generate Recommendations')}
      </button>
      {err && <div className="error">{err}</div>}
      {!res && !busy && (
        <div className="card" style={{marginTop:16}}>
          <p style={{color:'var(--muted)'}}>No recommendations yet. Complete a debate, then generate.</p>
        </div>
      )}
      {res && (
        <div className="card" style={{marginTop:16}}>
          <p style={{color:'var(--muted)', fontSize:12}}>Generated {new Date(res.generated_at).toLocaleString()}</p>
          <h3>Debate Exercises</h3><ul className="list">{res.debate_exercises.map((s,i)=><li key={i}>🎤 {s}</li>)}</ul>
          <h3>Presentation Exercises</h3><ul className="list">{res.presentation_exercises.map((s,i)=><li key={i}>🎙️ {s}</li>)}</ul>
          <h3>Reasoning Practice</h3><ul className="list">{res.reasoning_practice.map((s,i)=><li key={i}>🧠 {s}</li>)}</ul>
          <h3>Weekly Goals</h3><ul className="list">{res.weekly_goals.map((s,i)=><li key={i}>📌 {s}</li>)}</ul>
          <h3>Suggested Next</h3><ul className="list">{res.suggested_next.map((s,i)=><li key={i}>➡️ {s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}