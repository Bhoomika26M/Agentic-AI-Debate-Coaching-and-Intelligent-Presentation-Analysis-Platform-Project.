import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

export default function DebateSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [finalReport, setFinalReport] = useState(null);
  const bottomRef = useRef(null);

  const load = () => api.get(`/api/debates/${id}`).then(r => setSession(r.data));

  useEffect(() => { load().catch(e => setErr(e.response?.data?.detail || 'Failed to load')); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [session]);

  const sendTurn = async () => {
    if (!input.trim()) return;
    setBusy(true); setErr('');
    try {
      await api.post(`/api/debates/${id}/turn`, { content: input });
      setInput('');
      await load();
    } catch (e) { setErr(e.response?.data?.detail || 'Failed to send'); }
    finally { setBusy(false); }
  };

  const endDebate = async () => {
    if (!confirm('End the debate and generate your final performance report?')) return;
    setBusy(true); setErr('');
    try {
      const r = await api.post(`/api/debates/${id}/end`);
      setFinalReport(r.data);
      await load();
    } catch (e) { setErr(e.response?.data?.detail || 'Failed to end'); }
    finally { setBusy(false); }
  };

  if (!session) return <div className="card">Loading debate…</div>;

  return (
    <div>
      <div className="card">
        <h2>{session.topic}</h2>
        <span className="badge">Your position: {session.position}</span>
        <span className="badge">Format: {session.format}</span>
        <span className="badge">Status: {session.status}</span>
      </div>

      <div className="chat-box">
        {session.messages.map(m => (
          <div key={m.id} className={`msg ${m.sender}`}>
            <div style={{fontSize:11, opacity:0.7, marginBottom:4}}>
              {m.sender === 'user' ? 'You' : 'AI Opponent'} · Turn {m.turn_number}
            </div>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {session.status === 'active' ? (
        <div className="card">
          <textarea rows={3} value={input} onChange={e=>setInput(e.target.value)}
                    placeholder="Type your response…" disabled={busy} />
          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button className="btn" onClick={sendTurn} disabled={busy || !input.trim()}>
              {busy ? 'AI is thinking…' : 'Send'}
            </button>
            <button className="btn-danger" onClick={endDebate} disabled={busy}>End & Get Report</button>
          </div>
          {err && <div className="error">{err}</div>}
        </div>
      ) : (
        <div className="card" style={{color:'var(--muted)'}}>This debate has ended.</div>
      )}

      {finalReport && (
        <div className="card">
          <h3>Final Performance Report</h3>
          <div className="score">{finalReport.overall_score}</div>
          <div className="grid" style={{marginTop:12}}>
            {Object.entries(finalReport.components).map(([k,v]) => (
              <div key={k} className="card" style={{margin:0}}>
                <div style={{fontSize:12, color:'var(--muted)'}}>{k.replace(/_/g,' ')}</div>
                <div style={{fontSize:22, fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <h4>Strengths</h4>
          <ul className="list">{(finalReport.strengths||[]).map((s,i)=><li key={i}>✅ {s}</li>)}</ul>
          <h4>Areas to Improve</h4>
          <ul className="list">{(finalReport.weaknesses||[]).map((s,i)=><li key={i}>⚠️ {s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}