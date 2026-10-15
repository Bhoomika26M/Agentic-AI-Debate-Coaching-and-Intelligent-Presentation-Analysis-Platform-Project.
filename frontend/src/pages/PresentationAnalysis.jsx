import { useState } from 'react';
import api from '../api/client';

export default function PresentationAnalysis() {
  const [mode, setMode] = useState('text');
  const [title, setTitle] = useState(''); const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [res, setRes] = useState(null); const [audioMsg, setAudioMsg] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  const analyzeText = async () => {
    setErr(''); setBusy(true); setRes(null);
    try {
      const r = await api.post('/api/presentations/text', {
        title, transcript,
        duration_seconds: duration ? parseFloat(duration) : null,
      });
      setRes(r.data);
    } catch (e) { setErr(e.response?.data?.detail || 'Analysis failed'); }
    finally { setBusy(false); }
  };

  const uploadAudio = async () => {
    if (!audioFile || !title) { setErr('Title and audio file are required'); return; }
    setErr(''); setBusy(true); setAudioMsg('');
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('audio', audioFile);
      const r = await api.post('/api/presentations/audio', fd);
      setTranscript(r.data.transcript);
      setAudioMsg(`Transcribed via Gemini (${r.data.transcript.split(' ').length} words). Review then analyze.`);
      setMode('text');
    } catch (e) { setErr(e.response?.data?.detail || 'Upload failed'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Presentation Analysis</h1>
      <div className="card">
        <label>Title
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="My persuasive speech" /></label>
        <div style={{margin:'14px 0', display:'flex', gap:8}}>
          <button className={mode==='text'?'btn':'btn-secondary'} onClick={()=>setMode('text')}>Paste Text</button>
          <button className={mode==='audio'?'btn':'btn-secondary'} onClick={()=>setMode('audio')}>Upload Audio</button>
        </div>

        {mode === 'audio' && (
          <div>
            <input type="file" accept="audio/*" onChange={e=>setAudioFile(e.target.files?.[0]||null)} />
            <button className="btn" onClick={uploadAudio} disabled={busy || !audioFile} style={{marginTop:12}}>
              {busy ? 'Transcribing…' : 'Upload & Transcribe'}
            </button>
            {audioMsg && <div className="success">{audioMsg}</div>}
          </div>
        )}

        {mode === 'text' && (
          <div>
            <label>Transcript / Speech
              <textarea rows={10} value={transcript} onChange={e=>setTranscript(e.target.value)} /></label>
            <label>Duration in seconds (optional)
              <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="e.g. 180" /></label>
            <button className="btn" onClick={analyzeText} disabled={busy || transcript.length < 30} style={{marginTop:12}}>
              {busy ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
        )}
        {err && <div className="error">{err}</div>}
      </div>

      {res && (
        <div className="card">
          <div className="grid">
            <div className="card"><h4>Words</h4><div className="score">{res.word_count}</div></div>
            <div className="card"><h4>WPM</h4><div className="score">{res.words_per_minute ?? '—'}</div></div>
            <div className="card"><h4>Fillers</h4><div className="score">{res.filler_word_count}</div></div>
            <div className="card"><h4>Clarity</h4><div className="score">{res.clarity_score}</div></div>
            <div className="card"><h4>Organization</h4><div className="score">{res.organization_score}</div></div>
            <div className="card"><h4>Engagement</h4><div className="score">{res.engagement_score}</div></div>
          </div>
          <h3>Strengths</h3><ul className="list">{res.strengths.map((s,i)=><li key={i}>✅ {s}</li>)}</ul>
          <h3>Weaknesses</h3><ul className="list">{res.weaknesses.map((s,i)=><li key={i}>⚠️ {s}</li>)}</ul>
          <h3>Improvements</h3><ul className="list">{res.improvement_suggestions.map((s,i)=><li key={i}>💡 {s}</li>)}</ul>
          <h4>Opening Suggestion</h4><p>{res.opening_suggestion}</p>
          <h4>Conclusion Suggestion</h4><p>{res.conclusion_suggestion}</p>
        </div>
      )}
    </div>
  );
}