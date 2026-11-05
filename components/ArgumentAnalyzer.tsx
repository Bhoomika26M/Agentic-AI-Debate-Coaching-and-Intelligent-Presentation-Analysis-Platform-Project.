'use client';

import { useState } from 'react';
import { ArgumentAnalysis } from '@/lib/types';
import { AlertTriangle, Brain, Sparkles } from 'lucide-react';

export default function ArgumentAnalyzer() {
  const [text, setText] = useState('The city should expand public transit because the latest survey found that 64% of residents would use a reliable service. This reduces congestion and gives workers a more affordable commute.');
  const [topic, setTopic] = useState('Public transit expansion');
  const [analysis, setAnalysis] = useState<ArgumentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) {
      setError('Enter an argument to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/arguments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, topic })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Argument analysis failed');
      setAnalysis(data.analysis);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Argument analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Argument Intelligence</h1>
            <p className="text-xs text-slate-400">Extract claims, evaluate evidence, score reasoning, and receive coaching.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Debate topic" className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-indigo-400 focus:outline-none" />
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-indigo-400 focus:outline-none" />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
          <Sparkles className="h-4 w-4" /> {loading ? 'Analyzing...' : 'Analyze Argument'}
        </button>
        {error && <p className="mt-3 text-xs font-semibold text-rose-400">{error}</p>}
      </div>

      {analysis && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Evaluation</h2>
            <p className="mt-3 text-sm text-slate-300"><strong className="text-white">Main claim:</strong> {analysis.claim}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(analysis.scores).map(([name, value]) => (
                <div key={name} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <span className="text-[10px] uppercase text-slate-400">{name.replace(/([A-Z])/g, ' $1')}</span>
                  <p className="mt-1 text-xl font-bold text-emerald-400">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><h3 className="text-xs font-bold uppercase text-emerald-400">Strengths</h3>{analysis.strengths.map(item => <p key={item} className="mt-2 text-xs text-slate-300">+ {item}</p>)}</div>
              <div><h3 className="text-xs font-bold uppercase text-amber-400">Weaknesses</h3>{analysis.weaknesses.map(item => <p key={item} className="mt-2 text-xs text-slate-300">- {item}</p>)}</div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white"><AlertTriangle className="h-4 w-4 text-amber-400" /> Coaching</h2>
            {analysis.fallacies.length > 0 && <p className="mt-3 text-xs text-amber-300">{analysis.fallacies.map(item => item.type).join(', ')} detected.</p>}
            <div className="mt-3 space-y-3">{analysis.coachingAdvice.map(item => <p key={item} className="rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">{item}</p>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
