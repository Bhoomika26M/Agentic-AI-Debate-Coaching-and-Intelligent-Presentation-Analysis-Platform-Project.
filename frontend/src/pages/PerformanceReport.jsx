import { useState } from 'react';
import { downloadFile } from '../api/download';

export default function PerformanceReport() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const onDownloadCsv = async () => {
    setMsg(''); setErr(''); setBusy(true);
    try {
      await downloadFile('/api/reports/scores/csv', 'scores.csv');
      setMsg('CSV downloaded ✓');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Download failed');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Reports & Exports</h1>

      <div className="card">
        <p>Download your performance data in multiple formats.</p>
        <button className="btn" onClick={onDownloadCsv} disabled={busy}>
          {busy ? 'Preparing…' : 'Download All Scores (CSV)'}
        </button>
        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}
      </div>

      <div className="card">
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Argument analysis PDFs are available from each analysis result page.
        </p>
      </div>
    </div>
  );
}