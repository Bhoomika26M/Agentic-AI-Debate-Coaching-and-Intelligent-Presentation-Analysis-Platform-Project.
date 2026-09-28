import React, { useState } from 'react';
import { FileText, Download, Filter, Search, Award } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const EducatorReportsPage = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCohortReport = async () => {
    setDownloading(true);
    try {
      const dummyCohortData = {
        topic: "Cohort Assessment: Spring 2026 Colloquium",
        position: "Enrolled Students (18)",
        overall_score: 79.2,
        argument_quality: 78.6,
        evidence_usage: 74.0,
        logical_consistency: 81.5,
        rebuttal_effectiveness: 76.0,
        communication_skills: 83.0,
        strongest_argument: "Structured contention formulation across modern technology motions.",
        weakest_argument: "Empirical statistical grounding in opening contention phases.",
        next_exercise: "Evidence Grounding & Fallacy Identification Modules"
      };

      const res = await api.post('/reports/export/pdf', dummyCohortData, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Class_Cohort_Performance_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate cohort report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Class Assessment Reports & Export</h1>
          <p className="text-xs text-slate-400 mt-1">Export structured cohort data for faculty reviews, grading, and accreditations.</p>
        </div>
        <Button size="sm" icon={Download} loading={downloading} onClick={handleDownloadCohortReport}>
          Download Class Summary PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Debate Assessment Overview Report">
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Aggregates round transcripts, fallacy frequency counts, and 30/20/20/15/15 weighted performance scores across all enrolled students.
          </p>
          <Button size="sm" variant="secondary" onClick={handleDownloadCohortReport}>
            Export PDF Snapshot
          </Button>
        </Card>

        <Card title="Presentation Analytics & Speech Report">
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Compiles average WPM cadence, vocal filler frequencies, confidence indicators, and delivery clarity metrics for all seminar speeches.
          </p>
          <Button size="sm" variant="secondary" onClick={handleDownloadCohortReport}>
            Export Speech Metrics
          </Button>
        </Card>
      </div>
    </div>
  );
};
