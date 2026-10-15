import { useState } from 'react';
import api from '../api/client';

export default function FallacyDetection() {
  const [text, setText] = useState(''); const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true); setRes(null);
    try {
      const r = await api.post('/api/analysis/fallacy', { argument_text: text });
      setRes(r.data);
    } catch (e) { setErr(e.response?.data?.detail || 'Detection failed'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Logical Fallacy Detection</h1>
      <p style={{color:'var(--muted)'}}>Fallacy identification depends on context and may be uncertain.</p>
      <div className="card">
        <textarea rows={6} value={text} onChange={e=>setText(e.target.value)}
                  placeholder="Paste an argument to scan for fallacies…" />
        <button className="btn" onClick={submit} disabled={busy || text.length < 20} style={{marginTop:12}}>
          {busy ? 'Scanning…' : 'Detect Fallacies'}
        </button>
        {err && <div className="error">{err}</div>}
      </div>
      {res && (
        <div className="card">
          <p style={{color:'var(--muted)', fontSize:13}}>{res.note}</p>
          {res.fallacies.length === 0 ? <p>No clear fallacies detected.</p> : (
            res.fallacies.map((f, i) => (
              <div key={i} className="card">
                <h4>{f.name} <span className="badge">{f.confidence}</span></h4>
                <blockquote style={{borderLeft:'3px solid var(--accent)', paddingLeft:12, color:'var(--muted)'}}>
                  "{f.excerpt}"
                </blockquote>
                <p><b>Explanation:</b> {f.explanation}</p>
                <p><b>Why problematic:</b> {f.why_problematic}</p>
                <p><b>Suggested correction:</b> {f.correction}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}