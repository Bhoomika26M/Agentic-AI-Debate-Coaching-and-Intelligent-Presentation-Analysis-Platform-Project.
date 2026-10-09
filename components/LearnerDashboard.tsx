'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Award, TrendingUp, BookOpen, Clock, Target, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function LearnerDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      
      {/* Learner Hero Stats */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-2xl border-2 border-emerald-500/50 object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400">
                {user.experienceLevel} Learner
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user.email} • Active Debate & Pitch Goals</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/debate"
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Sparkles className="h-4 w-4" /> Start Debate Practice
          </Link>
          <Link
            href="/presentation"
            className="flex items-center gap-2 rounded-2xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
          >
            Analyze Pitch
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Debates Completed</span>
          <p className="text-2xl font-bold text-white font-mono">{user.metrics.debatesCompleted}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Win Rate</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{user.metrics.winRate}%</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Average Score</span>
          <p className="text-2xl font-bold text-indigo-400 font-mono">{user.metrics.avgScore} <span className="text-xs text-slate-500">/ 100</span></p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Presentations</span>
          <p className="text-2xl font-bold text-purple-400 font-mono">{user.metrics.presentationsAnalyzed}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fallacies Spotted</span>
          <p className="text-2xl font-bold text-amber-400 font-mono">{user.metrics.fallaciesIdentified}</p>
        </div>
      </div>

      {/* Main Grid: Debate History & Personalized Coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Debate History (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              Recent Debate Sessions & Scorecards
            </h2>

            <div className="space-y-3">
              {[
                { topic: 'Sovereign Autonomous AI Weapon Regulations', format: 'WSDC Parliamentary', verdict: 'Affirmative Win', score: 88, date: 'Yesterday' },
                { topic: 'Universal Basic Income vs Job Guarantees', format: 'Oxford Union', verdict: 'Draw', score: 76, date: '3 days ago' },
                { topic: 'Commercial Space Mining Intellectual Property', format: 'Policy Debate', verdict: 'Affirmative Win', score: 91, date: '1 week ago' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-all">
                  <div className="space-y-1">
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] text-slate-300 font-semibold">{item.format}</span>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{item.topic}</h3>
                    <p className="text-[10px] text-slate-400">{item.date} • Score: <strong className="text-emerald-400">{item.score}/100</strong></p>
                  </div>
                  <span className={`rounded-xl px-3 py-1 text-xs font-bold ${
                    item.verdict === 'Affirmative Win' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {item.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Personalized Coaching & Recommended Drills (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-400" />
              Personalized Learning Goals & Drills
            </h2>

            <div className="space-y-2.5">
              {user.learningGoals.map((goal, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-200">{goal}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">AI Persona Coach Recommendation</span>
              <p className="text-xs text-indigo-200 leading-relaxed">
                "Work on your POI refutation speed during Oxford rounds. Focus on dismantling opponent solvency assumptions within the first 20 seconds."
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
