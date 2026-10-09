'use client';

import React from 'react';
import Link from 'next/link';
import { Mic, Shield, Cpu, Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 py-10 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800/80 pb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Mic className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight">
                Verbal<span className="text-emerald-400">Arena</span> AI
              </span>
              <p className="text-[11px] text-slate-400">Agentic AI Debate Coaching & Presentation Intelligence Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <Link href="/debate" className="hover:text-white transition-colors">Debate Arena</Link>
            <Link href="/presentation" className="hover:text-white transition-colors">Presentation Studio</Link>
            <Link href="/rebuttal-lab" className="hover:text-white transition-colors">Rebuttal Lab</Link>
            <Link href="/arena" className="hover:text-white transition-colors">Multi-Model Arena</Link>
            <Link href="/coach" className="hover:text-white transition-colors">AI Voice Coach</Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} VerbalArena AI Platform. All rights reserved. Compliant with PDF Specifications.</p>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multi-Model AI Gateway Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
