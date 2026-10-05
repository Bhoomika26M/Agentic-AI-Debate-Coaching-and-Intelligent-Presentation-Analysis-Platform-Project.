import React from 'react';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Badge } from '../../components/common/Badge';
import {
  TrendingUp,
  Award,
  Swords,
  Scale,
  Mic,
  Presentation,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

export const SkillAnalyticsPage = () => {
  const skillBreakdown = [
    {
      name: 'Debating',
      score: 84,
      desc: 'Cross-examination, affirmative defense, and rebuttal precision',
      icon: Swords,
      variant: 'blue',
      level: 'Advanced',
    },
    {
      name: 'Reasoning',
      score: 88,
      desc: 'Formal validity, Toulmin warrant grounding, and fallacy spotting',
      icon: Scale,
      variant: 'purple',
      level: 'Mastery',
    },
    {
      name: 'Speaking',
      score: 82,
      desc: 'Pacing cadence (142 WPM average) and filler word elimination',
      icon: Mic,
      variant: 'teal',
      level: 'Proficient',
    },
    {
      name: 'Presentation',
      score: 86,
      desc: 'Information density balance, slide visual hierarchy, and clarity',
      icon: Presentation,
      variant: 'navy',
      level: 'Advanced',
    },
  ];

  const historicalData = [
    { name: 'Session 1', Debating: 65, Reasoning: 70, Speaking: 68, Presentation: 72 },
    { name: 'Session 2', Debating: 72, Reasoning: 75, Speaking: 72, Presentation: 76 },
    { name: 'Session 3', Debating: 74, Reasoning: 78, Speaking: 76, Presentation: 80 },
    { name: 'Session 4', Debating: 80, Reasoning: 82, Speaking: 78, Presentation: 82 },
    { name: 'Session 5', Debating: 82, Reasoning: 85, Speaking: 80, Presentation: 84 },
    { name: 'Session 6', Debating: 84, Reasoning: 88, Speaking: 82, Presentation: 86 },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          My Progress & Skill Analytics
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Review longitudinal competency benchmarks across debating, reasoning, verbal delivery, and visual presentations.
        </p>
      </div>

      {/* 1. Overall Skill Level Card */}
      <Card className="border-blue-200/80 bg-gradient-to-r from-blue-50/50 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <Badge variant="blue" size="sm">
            Competency Milestone
          </Badge>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Overall Skill Level
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#172554] tracking-tight">
            Collegiate Varsity (Level 4)
          </h3>
          <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
            Your performance ranks in the top 12% for collegiate argument construction and speech delivery.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center shrink-0 w-44 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Composite Index</div>
          <div className="text-4xl font-extrabold text-[#172554] mt-1">85<span className="text-sm font-normal text-slate-400">/100</span></div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">+6.4% This Month</span>
        </div>
      </Card>

      {/* 2. Four Main Skills: Debating, Reasoning, Speaking, Presentation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {skillBreakdown.map((skill) => {
          const Icon = skill.icon;
          return (
            <Card key={skill.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#172554]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#0F172A]">{skill.name}</h4>
                    <span className="text-xs text-slate-400 font-medium">{skill.level}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-extrabold text-[#172554]">{skill.score}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>

              <ProgressBar value={skill.score} max={100} variant={skill.variant} size="md" />

              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                {skill.desc}
              </p>
            </Card>
          );
        })}
      </div>

      {/* 3. Simple Charts Showing Improvement Over Time */}
      <Card className="space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#172554]" />
              Longitudinal Skill Progression
            </h4>
            <p className="text-xs text-slate-500">
              Growth curves tracked across your last 6 practice iterations
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis domain={[55, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Line type="monotone" dataKey="Debating" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Reasoning" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Speaking" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Presentation" stroke="#172554" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Debating
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Reasoning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span> Speaking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#172554]"></span> Presentation
          </span>
        </div>
      </Card>
    </div>
  );
};
