import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Award, Download, FileText, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldAlert, Sparkles, BookOpen, MessageSquare 
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ScoreGauge } from '../../components/common/ScoreGauge';

export const PostDebateReportPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    api.get(`/reports/debate/${id}`)
      .then(res => setReport(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await api.post('/reports/export/pdf', report, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DebateAI_Report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await api.post('/reports/export/excel', report, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DebateAI_Evaluation_${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate Excel report.');
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Compiling Comprehensive Debate Performance Report...</p>
        </div>
      </div>
    );
  }

  const { scores = {} } = report;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-primary-950/40 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Debate Evaluation & Scorecard</h1>
            <Badge variant="primary" size="sm">Session #{id}</Badge>
          </div>
          <p className="text-xs text-slate-300">
            Resolution: <span className="text-white font-semibold">{report.topic}</span> ({report.position})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            icon={Download} 
            loading={exportingExcel}
            onClick={handleExportExcel}
          >
            Export Excel (.xlsx)
          </Button>
          <Button 
            size="sm" 
            icon={FileText} 
            loading={exportingPdf}
            onClick={handleExportPdf}
          >
            Download PDF Report
          </Button>
        </div>
      </div>

      {/* Large Overall Score Banner */}
      <Card className="bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 p-8 flex flex-col md:flex-row items-center justify-around gap-8 text-center md:text-left">
        <div className="flex flex-col items-center">
          <ScoreGauge score={scores.overall_score || 78.8} size="lg" label="Overall Weighted Score" weight="100% Performance" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg w-full">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Argument Quality</span>
            <div className="text-lg font-black text-primary-400 mt-0.5">{scores.argument_quality || 80}/100</div>
            <span className="text-[10px] text-slate-400">Weight: 30%</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Evidence Usage</span>
            <div className="text-lg font-black text-indigo-400 mt-0.5">{scores.evidence_usage || 72}/100</div>
            <span className="text-[10px] text-slate-400">Weight: 20%</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Logical Consistency</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{scores.logical_consistency || 82}/100</div>
            <span className="text-[10px] text-slate-400">Weight: 20%</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Rebuttal Precision</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">{scores.rebuttal_effectiveness || 76}/100</div>
            <span className="text-[10px] text-slate-400">Weight: 15%</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Communication</span>
            <div className="text-lg font-black text-purple-400 mt-0.5">{scores.communication_skills || 84}/100</div>
            <span className="text-[10px] text-slate-400">Weight: 15%</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Fallacies Detected</span>
            <div className="text-lg font-black text-rose-400 mt-0.5">{report.detected_fallacies_count || 0}</div>
            <span className="text-[10px] text-slate-400">Deductions Applied</span>
          </div>
        </div>
      </Card>

      {/* Strengths, Weaknesses, and Best Rebuttal Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Strongest Contention Element" className="border-emerald-500/30">
          <div className="flex items-start gap-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-slate-200 leading-relaxed">{report.strongest_argument}</p>
          </div>
        </Card>

        <Card title="Vulnerability / Weakest Point" className="border-amber-500/30">
          <div className="flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-slate-200 leading-relaxed">{report.weakest_argument}</p>
          </div>
        </Card>
      </div>

      {/* Best Rebuttal & Coaching Recommendations */}
      <Card title="Debate Coach Strategic Feedback & Next Steps">
        <div className="space-y-4 text-xs">
          <div>
            <span className="text-primary-400 font-bold uppercase tracking-wider block mb-1">
              Exemplary Rebuttal Strategy:
            </span>
            <p className="text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              {report.best_rebuttal}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-700/60">
            <span className="text-slate-300 font-bold block mb-1">Coaching Summary:</span>
            <p className="text-slate-300 leading-relaxed">{report.coaching_summary}</p>
          </div>

          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between bg-primary-950/20 p-4 rounded-xl border border-primary-500/30">
            <div>
              <p className="text-xs font-bold text-primary-300">Recommended Next Practice Drill:</p>
              <p className="text-xs text-slate-200 mt-0.5">{report.next_practice_exercise}</p>
            </div>
            <Link to="/learner/exercises">
              <Button size="sm">Start Practice Drill <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
