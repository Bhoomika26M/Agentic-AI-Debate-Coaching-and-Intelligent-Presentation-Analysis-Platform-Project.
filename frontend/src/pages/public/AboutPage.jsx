import React from 'react';
import { Card } from '../../components/common/Card';
import { Sparkles, CheckCircle2, Shield, HeartHandshake } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">About DebateAI</h1>
        <p className="mt-4 text-slate-300 text-sm sm:text-base">
          Democratizing elite debate coaching, critical thinking mastery, and persuasive public speaking worldwide.
        </p>
      </div>

      <Card className="p-8 space-y-4">
        <h3 className="text-lg font-bold text-white">Our Mission</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          In an era of polarized rhetoric and automated misinformation, the ability to formulate sound arguments, evaluate empirical evidence, detect logical fallacies, and speak with authentic confidence is paramount. DebateAI was built to provide rigorous, unbiased, and deeply educational mentorship to learners, coaches, and academic institutions across the globe.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="text-base font-bold text-white mb-2">Pedagogical Philosophy</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            We believe feedback should never simply be "Good job." True cognitive and rhetorical growth occurs through targeted deconstruction: pinpointing the exact premise that was unhedged, suggesting precise empirical counters, and providing repetitive Socratic drills.
          </p>
        </Card>

        <Card className="p-6">
          <h4 className="text-base font-bold text-white mb-2">Responsible AI Architecture</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Our system never hallucinates fake empirical citations. If external evidence is unverified, it explicitly indicates that the assertion lacks peer-reviewed grounding. User privacy, debate transcripts, and audio recordings remain strictly safeguarded.
          </p>
        </Card>
      </div>
    </div>
  );
};
