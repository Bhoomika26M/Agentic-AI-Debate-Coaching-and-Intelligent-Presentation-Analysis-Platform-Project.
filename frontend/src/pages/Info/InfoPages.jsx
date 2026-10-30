import React from 'react';
import { Shield, Sparkles, Check, Mail, BookOpen, CreditCard } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card space-y-4">
      <div className="flex items-center space-x-3 text-[#D49B19]">
        <Shield className="w-8 h-8 fill-current" />
        <h2 className="text-xl font-bold text-[#1E242B]">About JustiTalk</h2>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        JustiTalk is an agentic AI-powered debate coaching and presentation intelligence platform.
        Designed for collegiate speakers, competitive debaters, educators, and executive presenters, JustiTalk provides
        formal dialectic adjudication, logical fallacy detection across 8 core informal logic errors, speech pacing analytics,
        and multi-turn AI debate simulations.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
          <h4 className="font-bold text-xs uppercase text-[#B87E0E]">Dialectic Rigor</h4>
          <p className="text-xs text-gray-500 mt-1">Multi-perspective counterargument generation and cross-examination traps.</p>
        </div>
        <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
          <h4 className="font-bold text-xs uppercase text-[#B87E0E]">Speech Science</h4>
          <p className="text-xs text-gray-500 mt-1">Whisper speech-to-text, cadence pacing, and filler word elimination.</p>
        </div>
        <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
          <h4 className="font-bold text-xs uppercase text-[#B87E0E]">Weighted Adjudication</h4>
          <p className="text-xs text-gray-500 mt-1">Standardized scoring formulas (30/20/20/15/15) applied consistently.</p>
        </div>
      </div>
    </div>
  );
}

export function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-[#1E242B]">Transparent SaaS Subscriptions</h2>
        <p className="text-xs text-gray-500">Choose the tier that matches your oratory & coaching needs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
          <div>
            <h3 className="font-bold text-base text-[#1E242B]">Starter</h3>
            <p className="text-xs text-gray-500">For individual practice</p>
          </div>
          <div className="text-3xl font-black text-[#1E242B]">$0 <span className="text-xs text-gray-400 font-normal">/ mo</span></div>
          <ul className="space-y-2 text-xs text-gray-600">
            <li>✓ 3 AI Debates / month</li>
            <li>✓ Basic Fallacy Detection</li>
            <li>✓ Standard Coaching Tips</li>
          </ul>
        </div>

        {/* Pro (Highlighted) */}
        <div className="bg-white rounded-2xl border-2 border-[#D49B19] p-6 shadow-lg space-y-4 relative">
          <span className="absolute -top-3 right-6 bg-[#D49B19] text-white text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full">
            Active Tier
          </span>
          <div>
            <h3 className="font-bold text-base text-[#1E242B]">Pro Plan</h3>
            <p className="text-xs text-[#B87E0E]">For competitive debaters</p>
          </div>
          <div className="text-3xl font-black text-[#1E242B]">$29 <span className="text-xs text-gray-400 font-normal">/ mo</span></div>
          <ul className="space-y-2 text-xs text-gray-700">
            <li>✓ Unlimited AI Debate Sparring</li>
            <li>✓ Advanced Speech & Whisper Audio</li>
            <li>✓ PDF Dossier Exports</li>
            <li>✓ Full 8 Fallacy Auditing Engine</li>
          </ul>
        </div>

        {/* Institutional */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
          <div>
            <h3 className="font-bold text-base text-[#1E242B]">Institutional</h3>
            <p className="text-xs text-gray-500">For universities & debate clubs</p>
          </div>
          <div className="text-3xl font-black text-[#1E242B]">$99 <span className="text-xs text-gray-400 font-normal">/ mo</span></div>
          <ul className="space-y-2 text-xs text-gray-600">
            <li>✓ Multi-seat Class Management</li>
            <li>✓ Cohort Skill Analytics</li>
            <li>✓ Custom Rubric Builder</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card space-y-4">
      <div className="flex items-center space-x-2 text-[#D49B19]">
        <Mail className="w-6 h-6" />
        <h2 className="text-lg font-bold text-[#1E242B]">Contact Support & Adjudicators</h2>
      </div>
      <p className="text-xs text-gray-500">
        Have questions on scoring calibration, institutional licenses, or platform features? Send our team a message.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); alert("Message dispatched to support team."); }} className="space-y-4 pt-2">
        <input type="text" placeholder="Your Name" required className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE]" />
        <input type="email" placeholder="Email Address" required className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE]" />
        <textarea rows={4} placeholder="Your inquiry or feedback..." required className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE]" />
        <button type="submit" className="px-6 py-2 rounded-xl bg-[#D49B19] text-white font-bold text-xs">
          Send Inquiry
        </button>
      </form>
    </div>
  );
}

export function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card">
        <h2 className="text-lg font-bold text-[#1E242B]">JustiTalk Oratory Journal & Blog</h2>
        <p className="text-xs text-gray-500">Insights from collegiate adjudicators on winning competitive debate rounds.</p>
      </div>

      <div className="space-y-4">
        {[
          { title: "Mastering the Turn-Around: Turning Opponent Impacts into Affirmative Victories", date: "February 2026", author: "Dr. Eleanor Vance" },
          { title: "The 8 Lethal Informal Fallacies: How to Trap Straw Man Arguments in Parliamentary Cross-Exam", date: "January 2026", author: "Alex Rivera" },
          { title: "Vocal Cadence Science: Why 135 WPM is the Optimal Rhetorical Sweet Spot", date: "January 2026", author: "Prof. Marcus Sterling" }
        ].map((p, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card hover:border-[#D49B19] transition-colors">
            <span className="text-[10px] text-gray-400 font-bold uppercase">{p.date} • By {p.author}</span>
            <h3 className="font-bold text-sm text-[#1E242B] mt-1">{p.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PaymentAdminPage() {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card space-y-4">
      <div className="flex items-center space-x-2 text-[#D49B19]">
        <CreditCard className="w-6 h-6" />
        <h2 className="text-lg font-bold text-[#1E242B]">Payment & Subscription Administration</h2>
      </div>
      <p className="text-xs text-gray-500">
        Overview of billing cycles, active stripe subscriptions, and invoice records.
      </p>
      <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">Gateway Status:</span>
          <span className="text-emerald-700 font-bold">Stripe Live Webhook Active</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">Active Pro Subscriptions:</span>
          <span className="font-bold text-[#1E242B]">1 (Current Pro Plan)</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">Next Billing Renewal:</span>
          <span className="text-gray-500">October 30, 2027</span>
        </div>
      </div>
    </div>
  );
}
