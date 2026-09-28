import React from 'react';
import { Card } from '../../components/common/Card';
import { Sparkles, Brain, Cpu, MessageSquare, ShieldAlert, Mic, BarChart3, Award, Users } from 'lucide-react';

export const FeaturesPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">Platform Capabilities & Features</h1>
        <p className="mt-4 text-sm sm:text-base text-slate-300">
          Explore the deep technical modules powering DebateAI, from argument extraction to real-time speech prosody.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card title="Argument Mining Engine" subtitle="Component 8">
          <p className="text-xs text-slate-300 leading-relaxed">
            Deconstructs complex speeches into Claims, Evidence, Inferences, and Assumptions. Evaluates evidence quality, sufficiency, relevance, and logical connections.
          </p>
        </Card>

        <Card title="Logical Fallacy Detection" subtitle="Component 10">
          <p className="text-xs text-slate-300 leading-relaxed">
            Flags 8+ fallacies: Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, and Red Herring with confidence scores and improved revisions.
          </p>
        </Card>

        <Card title="5-Tier Rebuttal Generator" subtitle="Component 11">
          <p className="text-xs text-slate-300 leading-relaxed">
            Produces Logical, Evidence-based, Ethical, Practical, and Policy rebuttals with Socratic interrogation questions and strategic framing.
          </p>
        </Card>

        <Card title="Speech & Pacing Analytics" subtitle="Component 17-20">
          <p className="text-xs text-slate-300 leading-relaxed">
            Transcribes speech, calculates WPM, detects filler words ('um', 'like', 'basically', 'actually', 'you know'), evaluates confidence (0-100), and provides timeline pace graphs.
          </p>
        </Card>

        <Card title="Weighted Scoring (30/20/20/15/15)" subtitle="Component 16">
          <p className="text-xs text-slate-300 leading-relaxed">
            Strictly enforces the exact weighted formula: Argument Quality (30%), Evidence Usage (20%), Logical Consistency (20%), Rebuttal Effectiveness (15%), and Communication Skills (15%).
          </p>
        </Card>

        <Card title="Multi-Role Portals & RBAC" subtitle="Component 2">
          <p className="text-xs text-slate-300 leading-relaxed">
            Distinct dashboards for Learners, Debate Coaches, Institutional Educators, and Administrators with custom metrics, student rosters, class analytics, and system monitoring.
          </p>
        </Card>
      </div>
    </div>
  );
};
