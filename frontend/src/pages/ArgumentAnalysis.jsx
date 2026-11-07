import { useState } from 'react';
import api from '../api/client';
import { downloadFile } from '../api/download';

export default function ArgumentAnalysis() {
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true); setRes(null); setPdfErr('');
    try {
      const r = await api.post('/api/analysis/argument', {
        argument_text: text,
        topic: topic || null,
      });
      setRes(r.data);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Analysis failed');
    } finally { setBusy(false); }
  };

  const onDownloadPdf = async () => {
    if (!res) return;
    setPdfErr(''); setPdfBusy(true);
    try {
      await downloadFile(
        `/api/reports/argument/${res.id}/pdf`,
        `argument_${res.id}.pdf`
      );
    } catch (e) {
      setPdfErr(e.response?.data?.detail || 'PDF download failed');
    } finally { setPdfBusy(false); }
  };

  return (
    <div>
      <h1>Argument Analysis</h1>
      <p style={{ color: 'var(--muted)' }}>
        AI evaluations are coaching estimates — not objective proof.
      </p>

      <div className="card">
        <label>Optional topic
          <input value={topic} onChange={e => setTopic(e.target.value)} />
        </label>
        <label>Your argument
          <textarea rows={6} value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type the argument you want analyzed…" />
        </label>
        <button className="btn" onClick={submit}
          disabled={busy || text.length < 20} style={{ marginTop: 12 }}>
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>
        {err && <div className="error">{err}</div>}
      </div>

      {res && (
        <div className="card">
          <div className="score">{res.overall_score} / 100</div>
          <h3>Main Claim</h3><p>{res.main_claim}</p>

          <div className="grid">
            <div className="card"><h4>Clarity</h4><div className="score">{res.clarity_score}</div></div>
            <div className="card"><h4>Relevance</h4><div className="score">{res.relevance_score}</div></div>
            <div className="card"><h4>Logical Consistency</h4><div className="score">{res.logical_consistency_score}</div></div>
            <div className="card"><h4>Persuasiveness</h4><div className="score">{res.persuasiveness_score}</div></div>
          </div>

          <h3>Supporting Reasons</h3>
          <ul className="list">{res.supporting_reasons.map((s, i) => <li key={i}>• {s}</li>)}</ul>

          <h3>Evidence Used</h3>
          <ul className="list">{res.evidence_used.map((s, i) => <li key={i}>✔ {s}</li>)}</ul>

          <h3>Missing Evidence</h3>
          <ul className="list">{res.missing_evidence.map((s, i) => <li key={i}>⚠ {s}</li>)}</ul>

          <h3>Strengths</h3>
          <ul className="list">{res.strengths.map((s, i) => <li key={i}>✅ {s}</li>)}</ul>

          <h3>Weaknesses</h3>
          <ul className="list">{res.weaknesses.map((s, i) => <li key={i}>⚠️ {s}</li>)}</ul>

          <h3>Improvement Suggestions</h3>
          <ul className="list">{res.improvement_suggestions.map((s, i) => <li key={i}>💡 {s}</li>)}</ul>

          <button className="btn-secondary" onClick={onDownloadPdf}
            disabled={pdfBusy} style={{ marginTop: 12 }}>
            {pdfBusy ? 'Downloading…' : 'Download PDF Report'}
          </button>
          {pdfErr && <div className="error">{pdfErr}</div>}
        </div>
      )}
    </div>
  );
}