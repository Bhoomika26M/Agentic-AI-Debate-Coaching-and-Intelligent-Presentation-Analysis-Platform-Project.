'use client';

import React from 'react';
import Link from 'next/link';
import {
  Mic,
  MessageSquare,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AI_MODELS } from '@/lib/ai-models';

export default function Home() {
  return (
    <div className="space-y-24 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* HURU-Inspired Asymmetric Editorial Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center pt-8">
        
        {/* Left Column: Stacked High Impact Headlines */}
        <div className="lg:col-span-7 space-y-10">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 border-2 border-black bg-neutral-100 px-4 py-2 text-xs font-mono font-black tracking-widest text-black uppercase">
              <Sparkles className="h-4 w-4 text-black" />
              AGENTIC AI MULTI-MODEL ENGINE
            </div>

            <div className="space-y-2 pt-2">
              <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black text-black tracking-tighter uppercase leading-none">
                YOU
              </h1>
              <div>
                <span className="inline-block bg-black text-white px-6 py-3 font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight uppercase">
                  DESERVE
                </span>
              </div>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-black tracking-tighter uppercase leading-none">
                VERBAL ARENA
              </h1>
            </div>
          </div>

          <p className="text-lg sm:text-xl text-neutral-700 leading-relaxed font-semibold max-w-xl">
            Master debating, public speaking, and critical reasoning. Evaluate persuasive rhetoric, spot logical fallacies in real time, and audit presentation metrics across <strong>Gemini 2.0, GPT-4o, Claude 3.5, and DeepSeek R1</strong>.
          </p>

          <div className="flex flex-wrap gap-5 pt-4">
            <Link
              href="/debate"
              className="flex items-center gap-4 bg-black text-white px-10 py-5 font-black uppercase text-sm sm:text-base tracking-widest hover:bg-neutral-800 transition-all shadow-2xl"
            >
              <MessageSquare className="h-5 w-5" /> ENTER DEBATE ARENA
            </Link>

            <Link
              href="/presentation"
              className="flex items-center gap-4 border-4 border-black bg-white text-black px-10 py-5 font-black uppercase text-sm sm:text-base tracking-widest hover:bg-black hover:text-white transition-all"
            >
              <Mic className="h-5 w-5" /> PRESENTATION STUDIO
            </Link>
          </div>

        </div>

        {/* Right Column: Hero Feature Card */}
        <div className="lg:col-span-5">
          <div className="relative border-4 border-black bg-neutral-50 p-10 space-y-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center border-b-4 border-black pb-5">
              <span className="font-mono font-black text-sm uppercase tracking-widest text-black">
                LIVE ARENA BOOTH
              </span>
              <span className="bg-black text-white px-3 py-1.5 text-xs font-mono font-bold uppercase">
                READY
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-tight text-black leading-snug">
                WSDC Parliamentary & Oxford Debate Simulation
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed font-semibold">
                Real-time speech recording, automated Point of Information (POI) interjections, and official 5-part judge scorecards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border-2 border-black bg-white p-4 space-y-1">
                <span className="text-xs font-mono font-bold uppercase text-neutral-500 block">JUDGE SCORING</span>
                <span className="text-sm font-black uppercase text-black">30% Arg • 20% Ev</span>
              </div>
              <div className="border-2 border-black bg-white p-4 space-y-1">
                <span className="text-xs font-mono font-bold uppercase text-neutral-500 block">FALLACY DETECTOR</span>
                <span className="text-sm font-black uppercase text-black">8 Fallacies</span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/debate"
                className="w-full flex items-center justify-between border-4 border-black bg-black text-white p-5 font-black text-sm uppercase tracking-wider hover:bg-neutral-800 transition-all"
              >
                <span>LAUNCH PRACTICE ROUND</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* Specifications Grid */}
      <section className="space-y-10 border-t-4 border-black pt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-sm font-mono font-black text-neutral-400 uppercase tracking-widest">SPECIFICATIONS</span>
            <h2 className="text-4xl sm:text-5xl font-black text-black tracking-tight uppercase">SUPPORTED AI ENGINES</h2>
          </div>
          <p className="text-sm text-neutral-700 font-bold max-w-md">Zero-latency built-in simulator engine or custom model API keys.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {AI_MODELS.map((model) => (
            <div key={model.id} className="border-4 border-black bg-white p-8 space-y-6 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="border-2 border-black bg-neutral-100 px-3 py-1 text-xs font-mono font-bold text-black uppercase">
                    {model.provider}
                  </span>
                  <span className="bg-black text-white px-3 py-1 text-xs font-mono font-bold uppercase">
                    {model.badge}
                  </span>
                </div>
                <h3 className="font-black text-xl uppercase text-black">{model.name}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed font-semibold">{model.description}</p>
              </div>

              <div className="border-t-2 border-neutral-200 pt-4">
                <p className="text-xs font-bold uppercase text-black">🎯 <strong>BEST FOR:</strong> {model.recommendedFor}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Microservices Architecture */}
      <section className="border-4 border-black bg-neutral-900 text-white p-12 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-neutral-700 pb-8">
          <div className="space-y-2">
            <span className="text-xs font-mono font-black text-neutral-400 uppercase tracking-widest">ARCHITECTURE</span>
            <h2 className="text-4xl font-black text-white uppercase tracking-tight">PDF COMPLIANT MICROSERVICES</h2>
          </div>
          <span className="bg-white text-black px-4 py-2 font-mono font-bold text-sm uppercase">
            FastAPI / Next.js Stack
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-sm font-semibold">
          <div className="border-2 border-neutral-700 bg-black p-6 space-y-3">
            <h4 className="font-black font-mono text-white uppercase text-base">1. DEBATE SIMULATION</h4>
            <p className="text-neutral-400 leading-relaxed">Multi-turn debate flow, Parliamentary & Oxford formats, POI interjections.</p>
          </div>
          <div className="border-2 border-neutral-700 bg-black p-6 space-y-3">
            <h4 className="font-black font-mono text-white uppercase text-base">2. ARGUMENT ENGINE</h4>
            <p className="text-neutral-400 leading-relaxed">Claim extraction, evidence evaluation, reasoning quality scoring.</p>
          </div>
          <div className="border-2 border-neutral-700 bg-black p-6 space-y-3">
            <h4 className="font-black font-mono text-white uppercase text-base">3. FALLACY DETECTOR</h4>
            <p className="text-neutral-400 leading-relaxed">Identifies Ad Hominem, Straw Man, False Dilemma, Slippery Slope + 4 fallacies.</p>
          </div>
          <div className="border-2 border-neutral-700 bg-black p-6 space-y-3">
            <h4 className="font-black font-mono text-white uppercase text-base">4. PRESENTATION ENGINE</h4>
            <p className="text-neutral-400 leading-relaxed">Speech pace (WPM), filler word counts, Ethos/Pathos/Logos triad.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
