import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const AIAnalysisPanel = ({ analysisData, isAnalyzing }) => {
  const [expandedArgIndex, setExpandedArgIndex] = useState(0);

  if (isAnalyzing) {
    return (
      <Card className="border-arena-amber/30 bg-arena-amber/5 p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-arena-amber border-t-transparent rounded-full animate-spin" />
          <h3 className="font-serif font-bold text-white text-base">
            Forensic AI Observer analyzing speech arguments & fallacies...
          </h3>
        </div>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card className="border-arena-amber/30 bg-arena-amber/5 p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-arena-amber" />
            <h3 className="font-serif font-bold text-white text-base">
              AI Debate Coach & Forensics Observer
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-arena-amber/15 text-arena-amber border border-arena-amber/30 uppercase font-bold tracking-wider">
            Active Milestone 2 Engine
          </span>
        </div>
        <p className="text-xs text-arena-muted leading-relaxed">
          Type or dictate your speech in the field below, then click <strong className="text-arena-parchment">"Run Forensic AI Analysis"</strong> to extract claims, detect logical fallacies, score Toulmin warrants, and generate a weighted performance report!
        </p>
      </Card>
    );
  }

  const { arguments: args = [], fallacies = [], scores, strengths = [], weaknesses = [], coaching_recommendations = [] } = analysisData;

  return (
    <Card className="border-arena-amber/30 bg-arena-bg-card p-6 space-y-6">
      {/* Top Banner with Composite Score & Grade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-arena-amber" />
            <h3 className="font-serif font-bold text-white text-lg">
              Forensic Evaluation & Fallacy Analysis
            </h3>
          </div>
          <p className="text-xs text-arena-muted mt-0.5">
            Evaluated using the weighted 5-dimension forensic rubric
          </p>
        </div>

        {scores && (
          <div className="flex items-center gap-3 bg-arena-bg-elevated px-4 py-2 rounded-2xl border border-white/5">
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-arena-muted block">Composite Score</span>
              <span className="text-xs font-semibold text-arena-amber">{scores.grade}</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white bg-arena-amber/20 px-3 py-1 rounded-xl border border-arena-amber/30">
              {scores.total_composite_score}%
            </div>
          </div>
        )}
      </div>

      {/* 5-Dimension Weighted Rubric Breakdown */}
      {scores && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5">
            <span className="text-[10px] text-arena-muted font-mono block">Argument Quality (30%)</span>
            <span className="text-lg font-mono font-bold text-arena-prop">{scores.argument_quality}%</span>
          </div>
          <div className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5">
            <span className="text-[10px] text-arena-muted font-mono block">Evidence Usage (20%)</span>
            <span className="text-lg font-mono font-bold text-arena-amber">{scores.evidence_usage}%</span>
          </div>
          <div className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5">
            <span className="text-[10px] text-arena-muted font-mono block">Consistency (20%)</span>
            <span className="text-lg font-mono font-bold text-sky-400">{scores.logical_consistency}%</span>
          </div>
          <div className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5">
            <span className="text-[10px] text-arena-muted font-mono block">Rebuttal Clash (15%)</span>
            <span className="text-lg font-mono font-bold text-purple-400">{scores.rebuttal_effectiveness}%</span>
          </div>
          <div className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5">
            <span className="text-[10px] text-arena-muted font-mono block">Clarity & Comms (15%)</span>
            <span className="text-lg font-mono font-bold text-emerald-400">{scores.communication_skills}%</span>
          </div>
        </div>
      )}

      {/* Logical Fallacies Detected */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${fallacies.length > 0 ? 'text-arena-opp' : 'text-emerald-400'}`} />
            <h4 className="font-serif font-bold text-sm text-white">
              Detected Fallacies ({fallacies.length})
            </h4>
          </div>
          {fallacies.length === 0 && (
            <Badge variant="beginner">Clean Logic: 0 Fallacies</Badge>
          )}
        </div>

        {fallacies.length > 0 ? (
          <div className="space-y-2.5">
            {fallacies.map((f, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-arena-opp/10 border border-arena-opp/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-xs text-arena-opp-glow">{f.name}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-arena-opp/20 text-arena-opp border border-arena-opp/30">
                      Severity: {f.severity}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-arena-opp">-{f.credibility_penalty} Credibility</span>
                </div>
                <div className="text-xs text-white/90 italic font-mono bg-black/20 p-2 rounded-lg">
                  "{f.quote}"
                </div>
                <p className="text-[11px] text-arena-muted leading-relaxed">
                  <strong>Explanation:</strong> {f.explanation}
                </p>
                <div className="text-[11px] text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                  <strong>Correction Advice:</strong> {f.correction_suggestion}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-arena-muted bg-arena-bg-elevated/40 p-3 rounded-xl border border-white/5">
            No logical fallacies detected. The speech maintained structural consistency without resorting to ad hominem attacks, false dilemmas, or circular reasoning.
          </p>
        )}
      </div>

      {/* Extracted Arguments & Toulmin Warrants */}
      <div>
        <h4 className="font-serif font-bold text-sm text-white mb-3">
          Toulmin Argument Extraction ({args.length})
        </h4>

        <div className="space-y-3">
          {args.map((arg, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedArgIndex(expandedArgIndex === idx ? -1 : idx)}
              >
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <Badge variant={arg.strength === 'STRONG' ? 'prop' : arg.strength === 'MODERATE' ? 'amber' : 'opp'}>
                    {arg.strength}
                  </Badge>
                  <p className="text-xs font-semibold text-white truncate max-w-lg">
                    {arg.claim}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-arena-amber">{arg.overall_score}%</span>
                  {expandedArgIndex === idx ? <ChevronUp className="w-4 h-4 text-arena-muted" /> : <ChevronDown className="w-4 h-4 text-arena-muted" />}
                </div>
              </div>

              {expandedArgIndex === idx && (
                <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                  {arg.warrant && (
                    <div className="p-2 rounded bg-white/5 text-arena-parchment">
                      <strong className="text-arena-muted uppercase text-[10px] block">Warrant / Premise:</strong>
                      {arg.warrant}
                    </div>
                  )}
                  {arg.evidence.length > 0 && (
                    <div className="p-2 rounded bg-arena-prop/10 text-arena-prop-glow border border-arena-prop/20">
                      <strong className="text-arena-prop uppercase text-[10px] block">Evidence Backing:</strong>
                      {arg.evidence.join(' ')}
                    </div>
                  )}
                  {arg.feedback.length > 0 && (
                    <div className="p-2 rounded bg-arena-amber/10 text-arena-amber border border-arena-amber/20">
                      <strong className="text-arena-amber uppercase text-[10px] block">Forensic Coach Feedback:</strong>
                      {arg.feedback.join(' ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations */}
      {coaching_recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-arena-bg-elevated to-arena-bg-card border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-arena-amber">
            <Award className="w-4 h-4" />
            <h5 className="font-serif font-bold text-xs uppercase tracking-wider">Coach Improvement Roadmap</h5>
          </div>
          <ul className="space-y-1.5 text-xs text-arena-parchment">
            {coaching_recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-arena-amber font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
