import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  FileText,
  Printer,
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';

export const FullReportModal = ({ report, onClose }) => {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    session_id,
    motion,
    generated_at,
    adjudication_summary,
    overall_performance_grade,
    scores,
    presentation_metrics,
    arguments_extracted = [],
    fallacies_detected = [],
    mastery_strengths = [],
    critical_weaknesses = [],
    coaching_action_items = []
  } = report;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:text-black">
      <Card className="w-full max-w-4xl bg-arena-bg-card border-white/10 p-8 space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2 text-arena-amber">
            <Award className="w-5 h-5" />
            <h3 className="font-serif font-bold text-white text-lg">Chamber Adjudication & Forensics Certificate</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" /> Print / Export PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Certificate Header */}
        <div className="text-center space-y-2 border-b border-white/10 pb-6 print:border-black">
          <span className="text-[10px] font-mono uppercase tracking-widest text-arena-amber block">
            Official Parliamentary Forensic Assessment
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white print:text-black">
            Debate Forensics & Speech Intelligence Certificate
          </h2>
          <p className="text-xs text-arena-muted print:text-gray-700">
            Deliberation Session #{session_id} • Certified on {generated_at}
          </p>
          <div className="inline-block mt-2 px-4 py-1.5 rounded-full bg-arena-amber/15 text-arena-amber border border-arena-amber/30 text-xs font-serif font-bold">
            Grade: {overall_performance_grade}
          </div>
        </div>

        {/* Motion Section */}
        <div className="p-4 rounded-xl bg-arena-bg-elevated border border-white/5 print:bg-gray-100 print:text-black">
          <span className="text-[10px] font-mono uppercase text-arena-amber block mb-1">Deliberation Motion</span>
          <p className="text-sm font-serif font-bold text-white print:text-black">"{motion}"</p>
        </div>

        {/* Executive Summary */}
        <div className="space-y-1">
          <h4 className="text-xs font-mono uppercase tracking-wider text-arena-muted">Executive Adjudication Summary</h4>
          <p className="text-xs text-arena-parchment leading-relaxed print:text-gray-800">
            {adjudication_summary}
          </p>
        </div>

        {/* Scores & Metrics 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: 5-Dimension Argument Quality */}
          {scores && (
            <div className="p-4 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-3 print:bg-gray-100 print:text-black">
              <span className="text-xs font-serif font-bold text-white block print:text-black">
                1. Argumentation & Logic Indices (70% Weight)
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Argument Quality (30%):</span>
                  <span className="font-mono font-bold text-arena-prop">{scores.argument_quality}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Evidence Usage (20%):</span>
                  <span className="font-mono font-bold text-arena-amber">{scores.evidence_usage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Logical Consistency (20%):</span>
                  <span className="font-mono font-bold text-sky-400">{scores.logical_consistency}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Rebuttal Effectiveness (15%):</span>
                  <span className="font-mono font-bold text-purple-400">{scores.rebuttal_effectiveness}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Communication & Clarity (15%):</span>
                  <span className="font-mono font-bold text-emerald-400">{scores.communication_skills}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Column 2: Presentation & Delivery Metrics */}
          {presentation_metrics && (
            <div className="p-4 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-3 print:bg-gray-100 print:text-black">
              <span className="text-xs font-serif font-bold text-white block print:text-black">
                2. Spoken Presentation & Delivery (30% Weight)
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Speaking Pace:</span>
                  <span className="font-mono font-bold text-white print:text-black">{presentation_metrics.words_per_minute} WPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Pace Rating:</span>
                  <span className="font-semibold text-arena-amber">{presentation_metrics.pace_rating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Verbal Crutches (Fillers):</span>
                  <span className="font-mono font-bold text-arena-opp">{presentation_metrics.filler_words_count} words ({presentation_metrics.filler_word_density_percent}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Vocal Confidence Index:</span>
                  <span className="font-mono font-bold text-sky-400">{presentation_metrics.confidence_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arena-muted print:text-gray-700">Audience Engagement:</span>
                  <span className="font-mono font-bold text-emerald-400">{presentation_metrics.audience_engagement_score}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2 print:bg-gray-50 print:border-gray-300">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Key Forensic Strengths</span>
            <ul className="text-xs space-y-1 text-arena-parchment print:text-gray-900">
              {mastery_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-arena-opp/10 border border-arena-opp/20 space-y-2 print:bg-gray-50 print:border-gray-300">
            <span className="text-xs font-bold text-arena-opp-glow uppercase tracking-wider block">Areas for Refinement</span>
            <ul className="text-xs space-y-1 text-arena-parchment print:text-gray-900">
              {critical_weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-arena-opp shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coaching Action Items */}
        {coaching_action_items.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-arena-bg-elevated to-arena-bg-card border border-arena-amber/30 space-y-2 print:bg-gray-100">
            <span className="text-xs font-bold text-arena-amber uppercase tracking-wider block">Forensic Coaching Roadmap</span>
            <ul className="text-xs space-y-1 text-arena-parchment print:text-gray-900">
              {coaching_action_items.map((action, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-arena-amber font-bold">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};
