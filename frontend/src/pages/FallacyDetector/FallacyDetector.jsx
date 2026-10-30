import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Info,
  Copy,
  Check
} from 'lucide-react';
import api from '../../services/api';

const SAMPLE_FALLACY_TEXTS = [
  {
    label: "False Dilemma & Ad Hominem",
    text: "Either we adopt this economic deregulation immediately, or our entire nation will plunge into irreversible poverty. Anyone who opposes this bill is simply an ignorant socialist who hates hard-working citizens."
  },
  {
    label: "Slippery Slope",
    text: "If we permit the council to install a single traffic camera on Main Street, the government will inevitably install biometric tracking in our homes, and our fundamental civil liberties will be eradicated overnight."
  },
  {
    label: "Clean Logical Argument (No Fallacies)",
    text: "Investing in municipal public transit infrastructure reduces vehicular traffic congestion and lowers intercity carbon emissions according to published transportation department studies."
  }
];

export default function FallacyDetector() {
  const [inputText, setInputText] = useState(SAMPLE_FALLACY_TEXTS[0].text);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    // Initial load
    handleDetect();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/fallacies/history');
      setHistory(res.data || []);
    } catch (e) {
      console.log('Error fetching fallacy history:', e);
    }
  };

  const handleDetect = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/fallacies/detect', { text: inputText });
      setResult(res.data);
      fetchHistory();
    } catch (err) {
      console.error('Fallacy detection failed:', err);
      alert('Could not run fallacy audit.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCleanVersion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">
              Logical Fallacy Detection Engine
            </h2>
            <p className="text-xs text-gray-500">
              Audit arguments against 8 core fallacies with sentence highlighting, structural diagnoses, and constructive corrections.
            </p>
          </div>
        </div>
      </div>

      {/* INPUT FORM & PRESETS */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Input Speech or Argument to Audit
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-gray-400 font-semibold">Try sample:</span>
            {SAMPLE_FALLACY_TEXTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(sample.text)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] text-gray-700 transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleDetect} className="space-y-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
            required
            placeholder="Paste debater statement or paragraph..."
            className="w-full px-4 py-3 text-xs rounded-xl border border-[#ECE7DE] bg-[#FCFBF8] focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19] leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Auditing Fallacies...' : 'Audit for Fallacies'}</span>
            </button>
          </div>
        </form>

        {history.length > 0 && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400">Past Audits:</span>
            {history.slice(0, 4).map((h, idx) => (
              <button
                key={h.id || idx}
                onClick={() => {
                  setResult(h);
                  if (h.input_text) setInputText(h.input_text);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all truncate max-w-xs ${
                  result?.id === h.id
                    ? 'bg-[#FCF6E5] border-[#D49B19] text-[#B87E0E] font-bold'
                    : 'bg-[#FAF8F3] hover:bg-[#F2ECE1] border-[#ECE7DE] text-gray-700'
                }`}
              >
                {h.has_fallacies ? `Fallacies Found (${h.credibility_impact})` : 'Sound Argument'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="space-y-6">
          {/* Summary Status Bar */}
          <div
            className={`p-6 rounded-2xl border shadow-card flex items-center justify-between ${
              result.has_fallacies
                ? 'bg-amber-50/40 border-amber-200'
                : 'bg-emerald-50/40 border-emerald-200'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  result.has_fallacies
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {result.has_fallacies ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-[#1E242B]">
                    {result.has_fallacies
                      ? `Identified ${result.fallacies?.length} Fallacy Pattern(s)`
                      : 'Logically Sound Reasoning Detected'}
                  </h3>
                  {result.inference_mode && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-600 font-semibold">
                      {result.inference_mode === 'openai_gpt4o' ? 'OpenAI GPT-4o' : 'Heuristic NLP'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{result.summary}</p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                result.has_fallacies
                  ? 'bg-white text-amber-800 border-amber-300'
                  : 'bg-white text-emerald-800 border-emerald-300'
              }`}
            >
              Credibility Impact: {result.credibility_impact}
            </span>
          </div>

          {/* DETECTED FALLACIES LIST */}
          {result.has_fallacies && result.fallacies?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#1E242B]">
                Granular Breakdown & Rewritten Alternatives
              </h3>

              <div className="grid grid-cols-1 gap-5">
                {result.fallacies.map((fal, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        <h4 className="font-bold text-sm text-[#1E242B]">
                          {fal.name}
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        Fallacy #{idx + 1}
                      </span>
                    </div>

                    {/* Highlighted exact sentence */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Problematic Text Segment
                      </span>
                      <div className="p-3 bg-red-50/40 rounded-xl border border-red-200/60 text-xs text-red-950 font-medium italic">
                        "{fal.sentence}"
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Why it's problematic */}
                      <div className="p-3.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] space-y-1">
                        <span className="font-bold text-gray-700 block">
                          Logical Explanation & Mechanism:
                        </span>
                        <p className="text-gray-600 leading-relaxed">{fal.explanation}</p>
                        <p className="text-gray-500 text-[11px] pt-1">
                          <b>Flaw:</b> {fal.problematic_reasoning}
                        </p>
                      </div>

                      {/* Corrected rewrite */}
                      <div className="p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-200/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Adjudicated Clean Alternative:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCleanVersion(fal.corrected_version, idx)}
                            className="p-1 text-emerald-700 hover:text-emerald-900 rounded flex items-center space-x-1 text-[10px] font-semibold"
                            title="Copy clean sentence"
                          >
                            {copiedIdx === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-emerald-950 font-medium leading-relaxed italic">
                          "{fal.corrected_version}"
                        </p>
                        <p className="text-emerald-700 text-[11px] pt-1">
                          💡 <b>Tip:</b> {fal.improvement_tips}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8 SUPPORTED FALLACIES REFERENCE GRID */}
          <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              8 Supported Core Fallacies Reference Directory
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                "Ad Hominem",
                "Straw Man",
                "False Dilemma",
                "Slippery Slope",
                "Appeal to Authority",
                "Circular Reasoning",
                "Hasty Generalization",
                "Red Herring"
              ].map((name, i) => (
                <div key={i} className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] font-semibold text-gray-700 text-center">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
