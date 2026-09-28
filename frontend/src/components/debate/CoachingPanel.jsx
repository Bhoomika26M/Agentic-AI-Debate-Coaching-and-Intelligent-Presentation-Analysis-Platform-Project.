import React from 'react';
import { Lightbulb, CheckCircle2, AlertCircle, ArrowUpRight, Award, ShieldAlert, BookOpen } from 'lucide-react';
import { Card } from '../common/Card';
import { FallacyBadge } from './FallacyBadge';

export const CoachingPanel = ({ coaching, fallacies = [], scores = {}, className = '' }) => {
  if (!coaching && (!fallacies || fallacies.length === 0)) {
    return (
      <Card className={`${className} h-full flex flex-col justify-center items-center text-center p-6`}>
        <Lightbulb className="w-10 h-10 text-amber-400/50 mb-3 animate-pulse" />
        <h4 className="text-base font-semibold text-slate-200">AI Coach Standing By</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Submit your argument to receive instant argument mining, fallacy checks, 5-tier rebuttals, and actionable coaching.
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 ${className}`}>
      {/* Real-time score indicator */}
      {scores && scores.overall_score !== undefined && (
        <div className="bg-gradient-to-r from-primary-900/40 to-slate-800 border border-primary-500/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-primary-400 tracking-wider">Round Performance</p>
            <h4 className="text-2xl font-black text-white">{scores.overall_score}<span className="text-xs text-slate-400 font-normal"> / 100</span></h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-right">
            <div><span className="text-slate-400">Quality: </span><span className="text-slate-200 font-semibold">{scores.argument_quality || 78}%</span></div>
            <div><span className="text-slate-400">Logic: </span><span className="text-slate-200 font-semibold">{scores.logical_consistency || 80}%</span></div>
            <div><span className="text-slate-400">Evidence: </span><span className="text-slate-200 font-semibold">{scores.evidence_usage || 70}%</span></div>
            <div><span className="text-slate-400">Rebuttal: </span><span className="text-slate-200 font-semibold">{scores.rebuttal_effectiveness || 75}%</span></div>
          </div>
        </div>
      )}

      {/* Detected Fallacies Alert */}
      {fallacies && fallacies.length > 0 && (
        <Card className="border-rose-500/30 bg-rose-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h4 className="text-sm font-bold text-rose-300">
              {fallacies.length} Logical {fallacies.length > 1 ? 'Fallacies' : 'Fallacy'} Detected
            </h4>
          </div>
          <div className="space-y-2">
            {fallacies.map((f, idx) => (
              <FallacyBadge key={idx} fallacy={f} />
            ))}
          </div>
        </Card>
      )}

      {/* Coaching Insights */}
      {coaching && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white tracking-tight">Debate Coach Feedback</h4>
          </div>

          {coaching.what_you_did_well && (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">What You Did Well</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{coaching.what_you_did_well}</p>
              </div>
            </div>
          )}

          {coaching.what_needs_improvement && (
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300">Target For Improvement</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{coaching.what_needs_improvement}</p>
              </div>
            </div>
          )}

          {coaching.strongest_argument_element && (
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-primary-400 font-semibold text-xs flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-primary-400" /> Strongest Element:
              </span>
              <p className="text-xs text-slate-300 italic">{coaching.strongest_argument_element}</p>
            </div>
          )}

          {coaching.missing_evidence_tip && (
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-amber-400 font-semibold text-xs flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Evidence Coaching:
              </span>
              <p className="text-xs text-slate-300">{coaching.missing_evidence_tip}</p>
            </div>
          )}

          {coaching.next_practice_exercise && (
            <div className="bg-primary-950/40 p-3 rounded-lg border border-primary-500/30">
              <span className="text-primary-300 font-semibold text-xs flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-primary-400" /> Recommended Drill:
              </span>
              <p className="text-xs text-slate-200 font-medium">{coaching.next_practice_exercise}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
