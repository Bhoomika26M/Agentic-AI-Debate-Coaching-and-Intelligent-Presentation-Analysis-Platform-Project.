import { useState } from 'react';
import api from '../api/client';

export default function PerformanceReport() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return (
    <div>
      <h1>Reports & Exports</h1>
      <div className="card">
        <p>Download your performance data in multiple formats.</p>
        <a href={`${base}/api/reports/scores/csv`} target="_blank" rel="noreferrer">
          <button className="btn">Download All Scores (CSV)</button>
        </a>
      </div>
      <div className="card">
        <p style={{color:'var(--muted)', fontSize:13}}>
          Argument analysis PDFs are available from each analysis result page.
        </p>
      </div>
    </div>
  );
}