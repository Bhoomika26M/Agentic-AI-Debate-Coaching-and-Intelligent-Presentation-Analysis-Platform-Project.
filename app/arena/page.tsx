'use client';

import React, { useState } from 'react';
import { AI_MODELS } from '@/lib/ai-models';
import { Cpu, Trophy, Sparkles, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { useModel } from '@/lib/model-context';

export default function ArenaPage() {
  const { setSelectedModelId } = useModel();
  const [promptInput, setPromptInput] = useState('Evaluate the ethical implications of commercial deep-sea mining.');

  const BENCHMARK_SCORES = [
    { id: 'gemini-2.0-flash', persuasiveness: 94, fallacyAccuracy: 96, reasoningDepth: 92, rhetoric: 95, overall: 94.2 },
    { id: 'gpt-4o', persuasiveness: 97, fallacyAccuracy: 95, reasoningDepth: 94, rhetoric: 98, overall: 96.0 },
    { id: 'claude-3.5-sonnet', persuasiveness: 95, fallacyAccuracy: 98, reasoningDepth: 96, rhetoric: 97, overall: 96.5 },
    { id: 'deepseek-r1', persuasiveness: 93, fallacyAccuracy: 97, reasoningDepth: 99, rhetoric: 91, overall: 95.0 },
    { id: 'llama-3.3-70b', persuasiveness: 91, fallacyAccuracy: 93, reasoningDepth: 91, rhetoric: 92, overall: 91.8 },
    { id: 'smart-simulator', persuasiveness: 90, fallacyAccuracy: 92, reasoningDepth: 90, rhetoric: 90, overall: 90.5 }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Multi-Model AI Arena & Benchmark Leaderboard</h1>
            <p className="text-xs text-slate-400">Compare model performances across Rhetoric, Fallacy Spotting, Reasoning Depth, and Persuasiveness</p>
          </div>
        </div>
      </div>

      {/* Benchmark Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Leaderboard Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              AI Model Debate & Intelligence Leaderboard
            </h2>

            <div className="space-y-3">
              {BENCHMARK_SCORES.map((score, idx) => {
                const model = AI_MODELS.find(m => m.id === score.id);
                if (!model) return null;

                return (
                  <div key={score.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs ${
                          idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-white">{model.name}</h3>
                          <span className="text-[10px] text-slate-400">{model.provider} • {model.badge}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-emerald-400 font-mono">{score.overall} <span className="text-[10px] text-slate-500">Score</span></span>
                        <button
                          onClick={() => setSelectedModelId(model.id)}
                          className="rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-3 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          Select Model
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[10px] pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-slate-500 block">Persuasion</span>
                        <span className="font-bold text-slate-300">{score.persuasiveness}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Fallacy Spotting</span>
                        <span className="font-bold text-indigo-400">{score.fallacyAccuracy}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Logic Depth</span>
                        <span className="font-bold text-purple-400">{score.reasoningDepth}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Rhetoric</span>
                        <span className="font-bold text-emerald-400">{score.rhetoric}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Multi-Model Prompt Execution Sandbox (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              Multi-Model Comparison Test
            </h2>

            <label className="block text-xs font-bold text-slate-300">Prompt / Debate Contention</label>
            <textarea
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Simulated Output Comparison</span>
              
              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                  <span className="font-bold text-emerald-400 text-[11px]">Claude 3.5 Sonnet:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    "Deep-sea mining presents a classical ethical dilemma between resource autonomy and benthic ecosystem integrity..."
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-1">
                  <span className="font-bold text-indigo-400 text-[11px]">GPT-4o:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    "The primary contention centers on whether the international seabed authority can mandate binding conservation buffers..."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
