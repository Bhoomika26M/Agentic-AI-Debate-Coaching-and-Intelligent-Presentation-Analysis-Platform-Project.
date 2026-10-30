import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  History,
  Copy,
  Check
} from 'lucide-react';
import api from '../../services/api';

export default function ArgumentAnalysis() {
  const [argumentText, setArgumentText] = useState(
    "Universal healthcare should be enacted as a fundamental constitutional right because medical bankruptcies destroy families and preventative health coverage yields astronomical long-term economic savings."
  );
  const [topic, setTopic] = useState("Healthcare Reform");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/arguments/history');
      setHistory(res.data || []);
      if (res.data && res.data.length > 0 && !result) {
        setResult(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!argumentText.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/arguments/analyze', {
        argument: argumentText,
        topic: topic || undefined
      });
      setResult(res.data);
      fetchHistory();
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Could not analyze argument. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyClaim = () => {
    if (result?.main_claim) {
      navigator.clipboard.writeText(result.main_claim);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">
              AI Argument Analysis Engine
            </h2>
            <p className="text-xs text-gray-500">
              Dissect argument anatomy: claims, evidence robustness, logical consistency, and persuasiveness score.
            </p>
          </div>
        </div>
      </div>

      {/* INPUT FORM */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Debate Argument / Proposition
              </label>
              <textarea
                value={argumentText}
                onChange={(e) => setArgumentText(e.target.value)}
                rows={4}
                required
                placeholder="Enter or paste your debate argument here..."
                className="w-full px-4 py-3 text-xs rounded-xl border border-[#ECE7DE] bg-[#FCFBF8] focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19] leading-relaxed"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Debate Topic (Optional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Healthcare, Tech Ethics"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !argumentText.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Adjudicating Logic...' : 'Analyze Argument'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* STRUCTURED RESULTS DISPLAY */}
      {result && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#D49B19] tracking-wider">
                Composite Argument Score
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-[#1E242B]">{result.overall_score}</span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>

            {/* Sub-metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-[10px] text-gray-500 block">Clarity</span>
                <span className="font-bold text-[#1E242B]">{result.clarity_score}</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-[10px] text-gray-500 block">Relevance</span>
                <span className="font-bold text-[#1E242B]">{result.relevance_score}</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-[10px] text-gray-500 block">Evidence</span>
                <span className="font-bold text-[#1E242B]">{result.evidence_strength_score}</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-[10px] text-gray-500 block">Logic</span>
                <span className="font-bold text-[#1E242B]">{result.logical_consistency_score}</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-[10px] text-gray-500 block">Persuasion</span>
                <span className="font-bold text-[#1E242B]">{result.persuasiveness_score}</span>
              </div>
            </div>
          </div>

          {/* Structured Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Main Claim */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D49B19]"></span>
                  <span>1. Main Claim Identified</span>
                </span>
                <button
                  onClick={handleCopyClaim}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
                  title="Copy claim"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-gray-800 p-3 bg-[#FCF6E5] rounded-xl border border-[#F4E9C0] font-medium leading-relaxed">
                "{result.main_claim}"
              </p>
            </div>

            {/* 2. Evidence Assessment */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card space-y-2">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>2. Evidence Assessment</span>
              </span>
              <p className="text-xs text-gray-700 p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] leading-relaxed">
                {result.evidence_assessment}
              </p>
            </div>

            {/* 3. Supporting Arguments */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card space-y-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>3. Supporting Arguments / Premises</span>
              </span>
              <ul className="space-y-2 text-xs">
                {result.supporting_arguments?.map((arg, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-gray-700 p-2.5 bg-[#FAF8F3] rounded-lg border border-[#ECE7DE]">
                    <span className="font-bold text-[#D49B19] shrink-0">P{idx + 1}:</span>
                    <span>{arg}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Missing Evidence */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card space-y-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>4. Missing Proof & Vulnerabilities</span>
              </span>
              <p className="text-xs text-amber-900 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 leading-relaxed">
                {result.missing_evidence}
              </p>
            </div>

            {/* 5. Strengths */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card space-y-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>5. Key Strengths</span>
              </span>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {result.strengths?.map((s, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 6. Suggestions for Improvement */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card space-y-3">
              <span className="text-xs font-bold text-[#B87E0E] uppercase tracking-wide flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D49B19]" />
                <span>6. Actionable Suggestions</span>
              </span>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {result.suggestions?.map((sugg, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-[#D49B19] font-bold">•</span>
                    <span>{sugg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
