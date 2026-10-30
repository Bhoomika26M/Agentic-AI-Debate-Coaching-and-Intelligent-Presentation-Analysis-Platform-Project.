import React, { useState } from 'react';
import {
  Swords,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Shield,
  Layers,
  Scale,
  DollarSign,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import api from '../../services/api';

export default function Counterarguments() {
  const [argumentText, setArgumentText] = useState(
    "Governments must immediately enact total bans on autonomous lethal weapons systems to uphold human dignity and prevent accidental escalation."
  );
  const [topic, setTopic] = useState("Autonomous Defense AI");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!argumentText.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/counterarguments/generate', {
        argument: argumentText,
        topic: topic || undefined
      });
      setResult(res.data);
    } catch (err) {
      console.error('Counterargument generation failed:', err);
      alert('Could not generate counterarguments.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">
              Counterargument & Rebuttal Generation Engine
            </h2>
            <p className="text-xs text-gray-500">
              Generate 5-dimensional counter-perspectives: logical, empirical, ethical, practical, policy, and cross-examination challenge traps.
            </p>
          </div>
        </div>
      </div>

      {/* INPUT FORM */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Opponent Argument to Refute
              </label>
              <textarea
                value={argumentText}
                onChange={(e) => setArgumentText(e.target.value)}
                rows={3}
                required
                placeholder="Enter argument to dismantle..."
                className="w-full px-4 py-3 text-xs rounded-xl border border-[#ECE7DE] bg-[#FCFBF8] focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19] leading-relaxed"
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Debate Domain
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Defense, Public Policy"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !argumentText.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Synthesizing Rebuttals...' : 'Generate Counterarguments'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Logical Rebuttals */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D49B19]"></span>
                <span>1. Logical Rebuttals (Reasoning Gaps)</span>
              </div>
              <div className="space-y-2">
                {result.logical_rebuttals?.map((item, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs text-gray-800 flex items-start justify-between group">
                    <p className="leading-relaxed pr-2">{item}</p>
                    <button
                      onClick={() => copyToClipboard(item, `log_${i}`)}
                      className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
                      title="Copy rebuttal"
                    >
                      {copiedIndex === `log_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Evidence-Based Rebuttals */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>2. Evidence-Based Rebuttals</span>
              </div>
              <div className="space-y-2">
                {result.evidence_based_rebuttals?.map((item, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs text-gray-800 flex items-start justify-between group">
                    <p className="leading-relaxed pr-2">{item}</p>
                    <button
                      onClick={() => copyToClipboard(item, `evi_${i}`)}
                      className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
                      title="Copy rebuttal"
                    >
                      {copiedIndex === `evi_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Ethical Counterarguments */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span>3. Ethical Counterarguments</span>
              </div>
              <div className="space-y-2">
                {result.ethical_counterarguments?.map((item, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs text-gray-800 flex items-start justify-between group">
                    <p className="leading-relaxed pr-2">{item}</p>
                    <button
                      onClick={() => copyToClipboard(item, `eth_${i}`)}
                      className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
                      title="Copy rebuttal"
                    >
                      {copiedIndex === `eth_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Practical Counterarguments */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>4. Practical & Fiscal Hurdles</span>
              </div>
              <div className="space-y-2">
                {result.practical_counterarguments?.map((item, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs text-gray-800 flex items-start justify-between group">
                    <p className="leading-relaxed pr-2">{item}</p>
                    <button
                      onClick={() => copyToClipboard(item, `prac_${i}`)}
                      className="text-gray-400 hover:text-gray-600 shrink-0 p-1"
                      title="Copy rebuttal"
                    >
                      {copiedIndex === `prac_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHALLENGE TRAPS & DEBATE STRATEGIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Challenge Questions */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-red-600" />
                <span>Cross-Examination Challenge Questions</span>
              </span>
              <div className="space-y-2">
                {result.challenge_questions?.map((q, i) => (
                  <div key={i} className="p-3 bg-red-50/40 rounded-xl border border-red-200/60 text-xs text-red-950 font-medium">
                    ❓ {q}
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Suggestions */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <span className="text-xs font-bold text-[#B87E0E] uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#D49B19]" />
                <span>Debate Strategy & Winning Frame</span>
              </span>
              <div className="space-y-2">
                {result.debate_strategy_suggestions?.map((strat, i) => (
                  <div key={i} className="p-3 bg-[#FCF6E5] rounded-xl border border-[#F4E9C0] text-xs text-gray-800">
                    🎯 {strat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
