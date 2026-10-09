'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { GraduationCap, Trophy, BarChart2, BookOpen, Download, Search } from 'lucide-react';

export default function EducatorDashboard() {
  const { user } = useAuth();

  const RANKINGS = [
    { rank: 1, name: 'Sophia Chen', class: 'Rhetoric 301', score: 94.2, badge: 'Gold Orator' },
    { rank: 2, name: 'Alex Rivera', class: 'Public Speaking 202', score: 88.5, badge: 'Silver Orator' },
    { rank: 3, name: 'Liam Vance', class: 'Argumentation Theory', score: 85.0, badge: 'Bronze Orator' },
    { rank: 4, name: 'David Okafor', class: 'Public Speaking 202', score: 79.4, badge: 'Honorable Mention' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Educator Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-2xl border-2 border-purple-500/50 object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-0.5 text-xs font-bold text-purple-400">
                Department Chair & Educator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Department of Communication & Rhetoric • Class Analytics & Rankings</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition-all shadow-md">
            <GraduationCap className="h-4 w-4" /> Class Cohort (42 Students)
          </button>
        </div>
      </div>

      {/* Main Grid: Class Leaderboards & Assessment Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Leaderboard (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Student Class Rankings Leaderboard
              </h2>
              <span className="text-xs text-slate-400">Fall Semester 2026</span>
            </div>

            <div className="space-y-3">
              {RANKINGS.map((rk) => (
                <div key={rk.rank} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
                      rk.rank === 1 ? 'bg-amber-500 text-slate-950' : rk.rank === 2 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                    }`}>
                      #{rk.rank}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{rk.name}</h3>
                      <p className="text-[10px] text-slate-400">{rk.class} • {rk.badge}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-400 font-mono">{rk.score} <span className="text-[10px] text-slate-500">/ 100</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Class Analytics Overview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-400" />
              Class Cohort Distribution
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-300">Class Average Score</span>
                <span className="text-emerald-400 font-bold font-mono">84.7 / 100</span>
              </div>
              <div className="flex justify-between items-center rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-300">Total Debates Evaluated</span>
                <span className="text-indigo-400 font-bold font-mono">156 Sessions</span>
              </div>
              <div className="flex justify-between items-center rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-300">Avg Fallacies Identified per Session</span>
                <span className="text-purple-400 font-bold font-mono">1.8 Fallacies</span>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all">
              <Download className="h-4 w-4" /> Export Class Gradebook (CSV)
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
