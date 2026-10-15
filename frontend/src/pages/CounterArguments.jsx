import { useState } from 'react';
import api from '../api/client';

export default function CounterArguments() {
  const [claim, setClaim] = useState(''); const [topic, setTopic] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true); setRes(null);
    try {
      const r = await api.post('/api/analysis/counterargument', { claim, topic: topic || null });
      setRes(r.data);
    } catch (e) { setErr(e.response?.data?.detail || 'Generation failed'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Counterargument Generator</h1>
      <p style={{color:'var(--muted)'}}>Suggested reasoning is generated — verify evidence independently.</p>
      <div className="card">
        <label>Optional topic<input value={topic} onChange={e=>setTopic(e.target.value)} /></label>
        <label>Claim to challenge
          <textarea rows={4} value={claim} onChange={e=>setClaim(e.target.value)} /></label>
        <button className="btn" onClick={submit} disabled={busy || claim.length < 10} style={{marginTop:12}}>
          {busy ? 'Generating…' : 'Generate Counterarguments'}
        </button>
        {err && <div className="error">{err}</div>}
      </div>
      {res && (
        <div className="card">
          <h3>Counterarguments</h3>
          {res.counterarguments.map((c,i) => (
            <div key={i} className="card">
              <span className="badge">{c.type}</span>
              <p><b>{c.text}</b></p>
              <p style={{color:'var(--muted)'}}><i>Reasoning:</i> {c.reasoning}</p>
              <p style={{color:'var(--muted)'}}><i>Evidence needed:</i> {c.evidence_needed}</p>
            </div>
          ))}
          <h3>Challenge Questions</h3>
          <ul className="list">{res.challenge_questions.map((q,i)=><li key={i}>❓ {q}</li>)}</ul>
          <h3>Debate Strategy</h3>
          <ul className="list">{res.strategy_suggestions.map((s,i)=><li key={i}>🎯 {s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}