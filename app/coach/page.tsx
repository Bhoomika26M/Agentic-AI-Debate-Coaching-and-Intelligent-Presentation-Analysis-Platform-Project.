'use client';

import React, { useState } from 'react';
import { Award, Mic, Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2, Zap } from 'lucide-react';

export default function CoachPage() {
  const [drillTopic, setDrillTopic] = useState('3-Minute Impromptu Pitch: Should AI-generated code require mandatory open licensing?');
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(140); // 140 WPM target
  const [isPlaying, setIsPlaying] = useState(false);

  const DRILLS = [
    { title: 'Impromptu 3-Minute Pitch', desc: 'Deliver an engaging opening statement on an unannounced motion with 60s prep time.' },
    { title: 'Point-of-Information (POI) Defense', desc: 'Respond to rapid interjections without breaking vocal momentum or logical cadence.' },
    { title: 'Logical Fallacy Audit Drill', desc: 'Identify 3 hidden fallacies in an AI-generated opponent speech snippet.' },
    { title: 'Executive Presentation Delivery', desc: 'Practice pacing script with live WPM teleprompter target set to 140 WPM.' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Personal AI Voice Coach & Teleprompter Studio</h1>
            <p className="text-xs text-slate-400">Master vocal pacing, practice targeted debate drills, and receive real-time coaching feedback</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Teleprompter Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Mic className="h-4 w-4 text-emerald-400" />
                Teleprompter Pacing Guide
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono">Pace Target:</span>
                <span className="font-bold text-emerald-400 font-mono">{teleprompterSpeed} WPM</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 font-serif leading-relaxed text-sm text-slate-200">
              <p className="text-emerald-300 font-sans font-bold text-xs uppercase tracking-wider">Active Drill Motion:</p>
              <p className="text-base text-white font-bold">{drillTopic}</p>
              <p className="text-slate-300 text-xs">
                "Honorable judges and fellow delegates, today we stand at a pivotal juncture in software governance. As AI agents generate over 40% of production code globally, the question of intellectual property and open licensing is no longer theoretical—it is an economic imperative."
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
                    isPlaying ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
                  {isPlaying ? 'Pause Pacing' : 'Start Speech Practice'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Pace Slider:</span>
                <input
                  type="range"
                  min="100"
                  max="180"
                  value={teleprompterSpeed}
                  onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                  className="accent-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Practice Drills Catalog (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-400" />
              Custom Voice Coaching Drills
            </h2>

            <div className="space-y-3">
              {DRILLS.map((d, idx) => (
                <div
                  key={idx}
                  onClick={() => setDrillTopic(d.title + ': ' + d.desc)}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1.5 cursor-pointer hover:border-indigo-500/50 transition-all"
                >
                  <h3 className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{d.title}</span>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
