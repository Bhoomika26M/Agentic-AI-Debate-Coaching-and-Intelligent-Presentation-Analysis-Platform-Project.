'use client';

import React from 'react';
import { WeightedDebateScore } from '@/lib/types';
import { Award, X, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import ReportExporter from './ReportExporter';

interface Props {
  scorecard: WeightedDebateScore;
  topic: string;
  userPosition: string;
  modelName: string;
  onClose: () => void;
}

export default function JudgeScorecardModal({ scorecard, topic, userPosition, modelName, onClose }: Props) {
  const [showExporter, setShowExporter] = React.useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Official Debate Judge Decision & Scorecard</h2>
              <p className="text-xs text-slate-400">Evaluated according to PDF Weighted Scoring Criteria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Verdict Hero Banner */}
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              {scorecard.verdict}
            </span>
            <h3 className="text-xl font-bold text-white mt-1">Speaker Score: {scorecard.totalScore} / 100</h3>
            <p className="text-xs text-slate-300">Speaker Points (70-80 Scale): <strong>{scorecard.speakerPoints} pts</strong></p>
          </div>

          <button
            onClick={() => setShowExporter(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md"
          >
            <Download className="h-4 w-4" />
            Export PDF Report
          </button>
        </div>

        {/* 5-Part Weighted Breakdown Bars */}
        <div className="mt-6 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Weighted Performance Criteria Breakdown</h3>

          {/* 1. Argument Quality (30%) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Argument Quality & Construction</span>
              <span className="font-mono text-emerald-400 font-bold">{scorecard.argumentQuality} / 100 (30% Weight)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${scorecard.argumentQuality}%` }}
              />
            </div>
          </div>

          {/* 2. Evidence Usage (20%) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Evidence Usage & Empirical Backing</span>
              <span className="font-mono text-indigo-400 font-bold">{scorecard.evidenceUsage} / 100 (20% Weight)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${scorecard.evidenceUsage}%` }}
              />
            </div>
          </div>

          {/* 3. Logical Consistency (20%) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Logical Consistency & Fallacy Immunity</span>
              <span className="font-mono text-purple-400 font-bold">{scorecard.logicalConsistency} / 100 (20% Weight)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-700"
                style={{ width: `${scorecard.logicalConsistency}%` }}
              />
            </div>
          </div>

          {/* 4. Rebuttal Effectiveness (15%) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Rebuttal Effectiveness & POI Defense</span>
              <span className="font-mono text-amber-400 font-bold">{scorecard.rebuttalEffectiveness} / 100 (15% Weight)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700"
                style={{ width: `${scorecard.rebuttalEffectiveness}%` }}
              />
            </div>
          </div>

          {/* 5. Communication Skills (15%) */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Communication Skills & Vocal Delivery</span>
              <span className="font-mono text-sky-400 font-bold">{scorecard.communicationSkills} / 100 (15% Weight)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${scorecard.communicationSkills}%` }}
              />
            </div>
          </div>
        </div>

        {/* Qualitative Feedback Sections */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" /> Key Strengths
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {scorecard.breakdownNotes.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertCircle className="h-4 w-4" /> Growth Areas
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {scorecard.breakdownNotes.weaknesses.map((wk, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{wk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-all"
          >
            Close Scorecard
          </button>
        </div>

      </div>

      {showExporter && (
        <ReportExporter
          title={`Debate Performance Scorecard - ${topic.substring(0, 40)}...`}
          content={JSON.stringify({ topic, userPosition, modelName, scorecard }, null, 2)}
          onClose={() => setShowExporter(false)}
        />
      )}
    </div>
  );
}
