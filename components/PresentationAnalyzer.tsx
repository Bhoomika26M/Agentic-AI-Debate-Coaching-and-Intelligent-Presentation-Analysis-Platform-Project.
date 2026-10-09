'use client';

import React, { useState } from 'react';
import { PresentationMetrics } from '@/lib/types';
import { analyzePresentationText } from '@/lib/presentation-engine';
import ReportExporter from './ReportExporter';
import {
  Mic,
  MicOff,
  Sparkles,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Target
} from 'lucide-react';

export default function PresentationAnalyzer() {
  const [scriptText, setScriptText] = useState(
    `Good morning everyone. Imagine a world where emergency healthcare response times are cut by 50% using autonomous drone logistics. Today I am thrilled to present key data from our 18-month pilot study across 12 hospitals. 

    Our research proves that decentralized drone fleets achieve a 98.4% on-time delivery rate for critical medical supplies. However, some critics claim that either we ban drone flights in urban corridors completely, or citizen privacy will be destroyed. This is a false choice. Through geofenced altitude corridors and anonymized radar telemetry, we deliver unparalleled speed while upholding 100% privacy compliance. 

    In conclusion, our data demonstrates that investing in this infrastructure saves both lives and municipal resources. Thank you.`
  );

  const [durationSeconds, setDurationSeconds] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState<PresentationMetrics | null>(() =>
    analyzePresentationText(
      `Good morning everyone. Imagine a world where emergency healthcare response times are cut by 50% using autonomous drone logistics. Today I am thrilled to present key data from our 18-month pilot study across 12 hospitals. 

    Our research proves that decentralized drone fleets achieve a 98.4% on-time delivery rate for critical medical supplies. However, some critics claim that either we ban drone flights in urban corridors completely, or citizen privacy will be destroyed. This is a false choice. Through geofenced altitude corridors and anonymized radar telemetry, we deliver unparalleled speed while upholding 100% privacy compliance. 

    In conclusion, our data demonstrates that investing in this infrastructure saves both lives and municipal resources. Thank you.`,
      60
    )
  );

  const [showExporter, setShowExporter] = useState(false);

  const handleAnalyze = () => {
    const res = analyzePresentationText(scriptText, durationSeconds);
    setMetrics(res);
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is supported in Chrome/Edge browsers. You can paste your pitch text.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setScriptText(prev => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Intelligent Presentation & Pitch Analyzer</h1>
            <p className="text-xs text-slate-400">Multi-metric speech prosody, WPM, filler word parsing, Ethos/Pathos/Logos evaluation, and fallacy detector</p>
          </div>
        </div>

        {metrics && (
          <button
            onClick={() => setShowExporter(true)}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md"
          >
            <Download className="h-4 w-4" />
            Export Full Presentation Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Recording & Input Booth */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">Speech Script / Audio Transcript</label>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">Est. Duration:</span>
                <input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-emerald-400 text-center font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">sec</span>
              </div>
            </div>

            <textarea
              rows={12}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste presentation script, slide transcript, or hit Record Speech..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 leading-relaxed focus:border-emerald-500 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-400" />}
                {isRecording ? 'Stop Recording' : 'Record Speech Live'}
              </button>

              <button
                onClick={handleAnalyze}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/20"
              >
                <Sparkles className="h-4 w-4" />
                Analyze Presentation
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Metric Dashboards */}
        {metrics && (
          <div className="lg:col-span-7 space-y-6">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Speaking Pace</span>
                <p className="text-xl font-bold text-emerald-400 font-mono">{metrics.speechPaceWPM} <span className="text-xs font-normal text-slate-400">WPM</span></p>
                <span className="text-[10px] text-slate-500">Target: 130 - 160 WPM</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Filler Words</span>
                <p className="text-xl font-bold text-amber-400 font-mono">{metrics.fillerWordCount}</p>
                <span className="text-[10px] text-slate-500">Counted in transcript</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Clarity Score</span>
                <p className="text-xl font-bold text-indigo-400 font-mono">{metrics.clarityScore} <span className="text-xs font-normal text-slate-400">/ 100</span></p>
                <span className="text-[10px] text-slate-500">Pacing & articulation</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Audience Impact</span>
                <p className="text-xl font-bold text-purple-400 font-mono">{metrics.audienceEngagementScore} <span className="text-xs font-normal text-slate-400">/ 100</span></p>
                <span className="text-[10px] text-slate-500">Resonance index</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-400" />
                Ethos / Pathos / Logos Persuasion Triad
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">LOGOS (Logic, Empirical Data & Statistics)</span>
                    <span className="font-mono text-emerald-400 font-bold">{metrics.ethosPathosLogos.logos} / 100</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.ethosPathosLogos.logos}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">ETHOS (Credibility, Expertise & Authority)</span>
                    <span className="font-mono text-indigo-400 font-bold">{metrics.ethosPathosLogos.ethos} / 100</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${metrics.ethosPathosLogos.ethos}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">PATHOS (Emotional Resonance & Narrative Vision)</span>
                    <span className="font-mono text-purple-400 font-bold">{metrics.ethosPathosLogos.pathos} / 100</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${metrics.ethosPathosLogos.pathos}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {metrics.fallaciesDetected.length > 0 && (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Logical Fallacies Flagged in Presentation ({metrics.fallaciesDetected.length})
                </h3>
                <div className="space-y-2">
                  {metrics.fallaciesDetected.map((fal) => (
                    <div key={fal.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-300">{fal.type} Fallacy</span>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400 font-bold">{fal.severity} Severity</span>
                      </div>
                      <p className="text-xs text-slate-300 italic font-serif">"{fal.quote}"</p>
                      <p className="text-[11px] text-slate-400">{fal.explanation}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold">💡 Fix: {fal.correctionSuggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Actionable AI Coaching Recommendations
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {metrics.improvementSuggestions.map((sug, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded-xl bg-slate-950 border border-slate-800 p-3">
                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </div>

      {showExporter && metrics && (
        <ReportExporter
          title="Presentation & Pitch Intelligence Report"
          content={JSON.stringify({ scriptText, durationSeconds, metrics }, null, 2)}
          onClose={() => setShowExporter(false)}
        />
      )}

    </div>
  );
}
