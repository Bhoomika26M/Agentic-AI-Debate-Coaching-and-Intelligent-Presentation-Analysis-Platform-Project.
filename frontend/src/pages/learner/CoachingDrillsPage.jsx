import React, { useState } from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  Target, 
  BookOpen,
  Award
} from 'lucide-react';

export const CoachingDrillsPage = () => {
  const [selectedDrill, setSelectedDrill] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [drillFeedback, setDrillFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const drills = [
    {
      id: 1,
      type: 'Fallacy Spotting',
      title: 'Countering the Slippery Slope',
      scenario:
        'Opponent statement: "If we permit AI tools to assist medical diagnostics, doctors will completely lose the ability to think independently, medicine will degenerate, and humanity will succumb to algorithmically caused plagues."',
      task: 'Identify the exact logical fallacy and draft a 2-sentence crisp refutation exposing the causal breakdown.',
      targetSkill: 'Logical Consistency',
    },
    {
      id: 2,
      type: 'Rapid Rebuttal',
      title: 'Warrant Breakdown on Economic Policy',
      scenario:
        'Opponent statement: "Corporate taxation must be slashed to zero because capital investment creates jobs, and jobs are the sole determinant of national prosperity."',
      task: 'Challenge the unstated warrant regarding infrastructure, public goods, and deficit displacement.',
      targetSkill: 'Toulmin Warrant Analysis',
    },
    {
      id: 3,
      type: 'Pacing & Cadence Drill',
      title: 'Eliminating the "Basically" Crutch',
      scenario:
        'Deliver a 30-second constructive argument on space exploration without using the words "basically", "like", or "um". Focus on vocal breathing.',
      targetSkill: 'Verbal Cadence',
    },
  ];

  const handleSubmitDrill = (e) => {
    e.preventDefault();
    if (!userResponse.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setDrillFeedback({
        score: 92,
        strengths: 'Accurately isolated the multi-step non-sequitur jump between diagnostic assistance and systemic medical collapse.',
        coachingTip: 'To make your rebuttal even sharper, point out that diagnostic AI operates within human peer-review protocols.',
      });
      setIsSubmitting(false);
    }, 1200);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-emerald-400" />
          Personalized AI Coaching & Micro-Drills
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Dynamic, bite-sized debate drills generated to shore up your weakest analytical and rhetorical percentiles.
        </p>
      </div>

      {/* AI Coach Diagnostic Prescription */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold border border-emerald-500/20">
            <Target className="w-3.5 h-3.5" />
            <span>AI Coach Diagnostics Focus</span>
          </div>
          <h2 className="text-xl font-bold text-white">Focus Area: Slippery Slope Elimination & Warrant Pinning</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Across your last 4 debate rounds, the opponent successfully challenged 3 ungrounded causal predictions. Completing these 2-minute drills will reinforce your empirical grounding.
          </p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center shrink-0 w-44">
          <div className="text-xs text-slate-400">Drills Completed</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1">14 / 20</div>
          <div className="text-[11px] text-slate-500 mt-1">Level 3 Debater</div>
        </div>
      </div>

      {/* Drill Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {drills.map((d, i) => (
          <button
            key={d.id}
            onClick={() => {
              setSelectedDrill(i);
              setDrillFeedback(null);
              setUserResponse('');
            }}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedDrill === i
                ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-emerald-400 uppercase tracking-wider">{d.type}</span>
              <span className="text-slate-500">Drill #{d.id}</span>
            </div>
            <div className="text-sm font-bold text-white mb-1">{d.title}</div>
            <div className="text-xs text-slate-400 line-clamp-2">{d.scenario}</div>
          </button>
        ))}
      </div>

      {/* Active Drill Interactive Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Active Drill Scenario
          </span>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-slate-200 mt-2 font-mono leading-relaxed">
            "{drills[selectedDrill].scenario}"
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            Your Assignment:
          </span>
          <p className="text-sm text-white font-medium mb-3">{drills[selectedDrill].task}</p>
          <textarea
            rows={4}
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder="Draft your refutation or response here..."
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitDrill}
            disabled={isSubmitting || !userResponse.trim()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Response...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Submit Drill for AI Critique</span>
              </>
            )}
          </button>
        </div>

        {/* Drill Feedback Overlay */}
        {drillFeedback && (
          <div className="mt-6 p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Instant AI Feedback
              </span>
              <span className="text-xl font-bold text-emerald-400">{drillFeedback.score}/100</span>
            </div>
            <p className="text-sm text-slate-200">{drillFeedback.strengths}</p>
            <div className="text-xs text-indigo-300 bg-indigo-950/50 p-3 rounded-xl border border-indigo-500/20">
              <strong>Coach Pro-Tip:</strong> {drillFeedback.coachingTip}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
