import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { RadarSkillChart } from '../../components/charts/RadarSkillChart';
import { PerformanceChart } from '../../components/charts/PerformanceChart';

export const SkillAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboards/learner')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const skillsList = [
    { name: "Argumentation", category: "Core", score: 82, desc: "Constructing rigorous, defensible premises and contentions" },
    { name: "Evidence usage", category: "Research", score: 72, desc: "Integrating empirical, statistical, and peer-reviewed data" },
    { name: "Logical reasoning", category: "Logic", score: 85, desc: "Formulating sound deductive and inductive inferences" },
    { name: "Rebuttal", category: "Tactics", score: 76, desc: "Deconstructing and countering opposing contentions effectively" },
    { name: "Critical thinking", category: "Analysis", score: 80, desc: "Questioning assumptions and identifying systemic implications" },
    { name: "Communication", category: "Delivery", score: 84, desc: "Clear, concise, and structured rhetorical delivery" },
    { name: "Clarity", category: "Delivery", score: 88, desc: "Signposting ideas and eliminating syntactic ambiguity" },
    { name: "Confidence", category: "Delivery", score: 78, desc: "Authoritative vocal presence, conviction, and composure" },
    { name: "Speaking pace", category: "Delivery", score: 80, desc: "Optimal delivery speed (130-165 WPM) with strategic pauses" },
    { name: "Audience engagement", category: "Rhetoric", score: 75, desc: "Rhetorical hooks, compelling analogies, and storytelling" },
    { name: "Persuasiveness", category: "Impact", score: 79, desc: "Synthesizing logic, ethos, and emotional resonance to persuade" }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">11-Competency Skill Progression</h1>
        <p className="text-xs text-slate-400 mt-1">
          Longitudinal measurement of your rhetorical, analytical, and vocal abilities across all debate and speaking sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Competency Radar Polygon" subtitle="Multi-dimensional capability footprint">
          <RadarSkillChart data={data?.skill_radar || []} />
        </Card>

        <Card title="Skill Growth Over Time" subtitle="Longitudinal progression trajectory">
          <PerformanceChart data={data?.performance_over_time || []} />
        </Card>
      </div>

      <Card title="All 11 Tracked Competencies">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skillsList.map((s, idx) => (
            <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{s.name}</span>
                  <span className="text-xs font-black text-primary-400">{s.score}/100</span>
                </div>
                <Badge variant="secondary" size="sm" className="mb-2">{s.category}</Badge>
                <p className="text-[11px] text-slate-400 leading-normal">{s.desc}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                <div 
                  className={`h-1.5 rounded-full ${s.score >= 80 ? 'bg-emerald-500' : 'bg-primary-500'}`} 
                  style={{ width: `${s.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
