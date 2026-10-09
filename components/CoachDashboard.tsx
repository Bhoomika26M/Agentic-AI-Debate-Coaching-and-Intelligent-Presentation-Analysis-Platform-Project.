'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Users, Award, AlertCircle, CheckCircle2, TrendingUp, Sparkles, Filter } from 'lucide-react';

export default function CoachDashboard() {
  const { user } = useAuth();

  const STUDENTS = [
    { name: 'Alex Rivera', level: 'Intermediate', avgScore: 84.5, debates: 18, weakness: 'POI Refutation Speed', trend: '+4.2%' },
    { name: 'Sophia Chen', level: 'Advanced', avgScore: 91.0, debates: 24, weakness: 'Empirical Data Citing', trend: '+6.5%' },
    { name: 'David Okafor', level: 'Beginner', avgScore: 72.0, debates: 9, weakness: 'Filler Word Control (WPM)', trend: '+8.0%' },
    { name: 'Liam Vance', level: 'Intermediate', avgScore: 81.2, debates: 15, weakness: 'Slippery Slope Fallacy', trend: '+2.1%' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Coach Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-2xl border-2 border-indigo-500/50 object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-400">
                Debate Squad Coach
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Collegiate Debate Squad • Skill Gap Analysis & Evaluation Desk</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md">
            <Users className="h-4 w-4" /> Squad Roster (24 Students)
          </button>
        </div>
      </div>

      {/* Main Grid: Student Tracking & Skill Gap Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Progress Monitoring (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                Student Squad Performance Roster
              </h2>
              <span className="text-xs text-slate-400">4 Active Trainees</span>
            </div>

            <div className="space-y-3">
              {STUDENTS.map((st, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">{st.name}</h3>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-semibold">{st.level}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Weakness: <span className="text-amber-400 font-medium">{st.weakness}</span></p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400 font-mono">{st.avgScore} <span className="text-[10px] text-slate-500">/100</span></p>
                    <span className="text-[10px] text-indigo-400 font-bold">{st.trend} Growth</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skill Gap Analysis Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Squad Skill Gap Analysis
            </h2>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Argumentation Structure</span>
                  <span className="text-emerald-400 font-bold">88% (Strong)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Empirical Evidence Citation</span>
                  <span className="text-indigo-400 font-bold">74% (Moderate)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '74%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Fallacy Immunity & Auditing</span>
                  <span className="text-purple-400 font-bold">81% (Good)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '81%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">POI & Cross-Exam Refutation Speed</span>
                  <span className="text-amber-400 font-bold">62% (Needs Focus)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '62%' }} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Coach Action Item</span>
              <p className="text-xs text-slate-300">
                Schedule a 30-minute rapid-fire POI defense workshop for Alex Rivera and Liam Vance this Thursday.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
