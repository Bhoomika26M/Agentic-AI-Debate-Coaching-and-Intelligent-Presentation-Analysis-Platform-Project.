import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, ShieldCheck, Zap, Mic, Award, ArrowRight, 
  BarChart2, Users, CheckCircle2, MessageSquare, BrainCircuit
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const LandingPage = () => {
  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden text-center pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[600px] bg-primary-600/15 rounded-full blur-3xl"></div>
          <div className="w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl -translate-y-24"></div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Next-Gen Agentic Debate & Speech Intelligence
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Master the Art of Debate & Public Speaking with <span className="bg-gradient-to-r from-primary-400 via-indigo-300 to-primary-500 bg-clip-text text-transparent">Agentic AI</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          DebateAI combines 7 specialized AI agents to dissect claims, expose logical fallacies, simulate multi-round debates, and analyze vocal delivery with precision.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="text-base px-8 py-3.5 shadow-xl shadow-primary-500/25">
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg" className="text-base px-7 py-3.5">
              Explore Demo Accounts
            </Button>
          </Link>
        </div>

        {/* Live Metrics Showcase */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-black text-primary-400">7</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Autonomous AI Agents</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-black text-indigo-400">8+</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Fallacies Detected</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Weighted Precision (30/20/20/15/15)</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-black text-amber-400">4</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Custom Role Portals</div>
          </div>
        </div>
      </section>

      {/* 7 Modular AI Agents Architecture */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-2">Agentic Architecture</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
            Not a Simple Chatbot. A Synchronized Multi-Agent Engine.
          </h3>
          <p className="mt-3 text-sm text-slate-400">
            Every debate round triggers a coordinated pipeline of dedicated AI agents working in concert.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:border-primary-500/50 transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">1. Topic & Framework Agent</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dissects debate resolutions, identifies core definitions, framework paradigms (ethical, empirical, policy), and stakeholder impacts.
            </p>
          </Card>

          <Card className="hover:border-primary-500/50 transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">2. Argument Mining Agent</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deconstructs statements into Claims, Evidence, Reasoning, and Assumptions. Scores clarity, relevance, and logical soundness.
            </p>
          </Card>

          <Card className="hover:border-primary-500/50 transition-all">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">3. Fallacy Detection Agent</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scans for Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Circular Reasoning, and Hasty Generalizations with corrections.
            </p>
          </Card>

          <Card className="hover:border-primary-500/50 transition-all">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">4. 5-Tier Counterargument Agent</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Produces Logical, Empirical, Ethical, Practical, and Policy rebuttals with strategic rationale explaining why each works.
            </p>
          </Card>

          <Card className="hover:border-primary-500/50 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">5. Real-Time Coaching Agent</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides actionable feedback: what you did well, what needs improvement, weakest argument, and targeted next drills.
            </p>
          </Card>

          <Card className="hover:border-primary-500/50 transition-all">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">6. Weighted Scoring Engine</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces exact 30/20/20/15/15 weighted performance metrics across Argument Quality, Evidence, Logic, Rebuttal, and Delivery.
            </p>
          </Card>
        </div>
      </section>

      {/* Presentation Lab Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-850/50 border border-slate-800 rounded-3xl p-8 sm:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">Presentation Intelligence</span>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              Transform Your Public Speaking & Keynote Delivery
            </h3>
            <p className="mt-4 text-slate-300 text-sm leading-relaxed">
              Upload audio/video recordings or use your microphone. The presentation analysis engine calculates speaking pace (WPM), flags vocal filler crutches, tracks timeline pacing, and estimates confidence.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Filler word breakdown (um, uh, like, basically, actually, you know, so)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Speaking pace classification (Very slow, Slow, Balanced, Fast, Very fast)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confidence & clarity evaluation with concrete drills</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-300">Live Presentation Analytics</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">144 WPM — Balanced</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Confidence Score:</span>
                <span className="text-white font-bold">78/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full w-[78%]"></div>
              </div>
              <div className="flex justify-between text-slate-400 pt-2">
                <span>Clarity Score:</span>
                <span className="text-white font-bold">82/100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full w-[82%]"></div>
              </div>
              <div className="pt-3 border-t border-slate-800 text-[11px] text-amber-300">
                Coaching Tip: 5 filler words detected. Practice a 1.5-second silent pause before thesis points.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12 px-4">
        <h3 className="text-3xl font-extrabold text-white">Ready to elevate your communication?</h3>
        <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
          Join thousands of learners, debaters, coaches, and educators on DebateAI.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="px-8">Create Your Account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
