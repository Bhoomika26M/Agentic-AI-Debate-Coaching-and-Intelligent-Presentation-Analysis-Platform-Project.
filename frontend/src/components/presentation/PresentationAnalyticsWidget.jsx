import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Mic,
  Gauge,
  Volume2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Activity,
  HeartHandshake
} from 'lucide-react';

export const PresentationAnalyticsWidget = ({ metrics, isAnalyzing }) => {
  if (isAnalyzing) {
    return (
      <Card className="border-sky-500/30 bg-sky-950/10 p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <h4 className="font-serif font-bold text-white text-sm">
            Evaluating presentation pace (WPM), verbal fillers, and confidence cadence...
          </h4>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="border-white/5 bg-arena-bg-card p-5">
        <div className="flex items-center gap-2 text-arena-muted mb-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h4 className="font-serif font-bold text-white text-sm">Speech & Presentation Analytics</h4>
        </div>
        <p className="text-xs text-arena-muted leading-relaxed">
          Record or enter your speech above to evaluate delivery pace (WPM), verbal crutch density, clarity, and vocal confidence.
        </p>
      </Card>
    );
  }

  const {
    words_per_minute,
    pace_rating,
    filler_words_count,
    filler_word_density_percent,
    filler_breakdown = [],
    confidence_score,
    clarity_score,
    audience_engagement_score,
    composite_presentation_score,
    delivery_feedback = []
  } = metrics;

  return (
    <Card className="border-sky-500/30 bg-arena-bg-card p-6 space-y-6">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-sky-400" />
            <h4 className="font-serif font-bold text-white text-base">Speech & Presentation Forensics</h4>
          </div>
          <p className="text-xs text-arena-muted mt-0.5">
            Cadence evaluation, verbal crutches, and vocal confidence
          </p>
        </div>

        <div className="flex items-center gap-3 bg-arena-bg-elevated px-4 py-2 rounded-2xl border border-white/5">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-arena-muted block">Delivery Score</span>
            <span className="text-xs font-semibold text-sky-400">Presentation Rating</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white bg-sky-500/20 px-3 py-1 rounded-xl border border-sky-500/30">
            {composite_presentation_score}%
          </div>
        </div>
      </div>

      {/* Grid: 4 Core Diagnostics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Speech Pacing / WPM */}
        <div className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-arena-muted uppercase">Pacing (WPM)</span>
            <Gauge className="w-3.5 h-3.5 text-arena-amber" />
          </div>
          <div className="text-xl font-mono font-bold text-white">{words_per_minute}</div>
          <span className="text-[10px] text-arena-amber block truncate font-medium">
            {pace_rating}
          </span>
        </div>

        {/* Metric 2: Filler Words Density */}
        <div className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-arena-muted uppercase">Verbal Fillers</span>
            <AlertCircle className={`w-3.5 h-3.5 ${filler_words_count > 3 ? 'text-arena-opp' : 'text-emerald-400'}`} />
          </div>
          <div className="text-xl font-mono font-bold text-white">{filler_words_count}</div>
          <span className={`text-[10px] block font-mono ${filler_words_count > 3 ? 'text-arena-opp' : 'text-emerald-400'}`}>
            {filler_word_density_percent}% speech density
          </span>
        </div>

        {/* Metric 3: Confidence Score */}
        <div className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-arena-muted uppercase">Vocal Confidence</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-mono font-bold text-sky-400">{confidence_score}%</div>
          <div className="w-full bg-arena-bg-dark h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-sky-400 h-full" style={{ width: `${confidence_score}%` }} />
          </div>
        </div>

        {/* Metric 4: Audience Engagement */}
        <div className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-arena-muted uppercase">Engagement</span>
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400">{audience_engagement_score}%</div>
          <div className="w-full bg-arena-bg-dark h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-emerald-400 h-full" style={{ width: `${audience_engagement_score}%` }} />
          </div>
        </div>
      </div>

      {/* Filler Words Breakdown Badges */}
      {filler_breakdown.length > 0 && (
        <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2">
          <span className="text-[10px] font-mono uppercase text-arena-muted tracking-wider block">
            Crutch Word Breakdown
          </span>
          <div className="flex flex-wrap gap-2">
            {filler_breakdown.map((f, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-arena-opp/15 text-arena-opp-glow border border-arena-opp/30 flex items-center gap-1.5"
              >
                <strong>"{f.word}"</strong>
                <span className="text-[10px] opacity-75">({f.count}x)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Feedback */}
      {delivery_feedback.length > 0 && (
        <div className="space-y-1.5 text-xs text-arena-parchment">
          {delivery_feedback.map((item, i) => (
            <div key={i} className="flex items-start gap-2 bg-arena-bg-elevated/40 p-2.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
