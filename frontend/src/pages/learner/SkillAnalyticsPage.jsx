import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const SkillAnalyticsPage = () => {
  const [overview, setOverview] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([analyticsApi.getOverview(), analyticsApi.getSkillsRadar()])
      .then(([data, skillData]) => {
        if (!active) return;
        setOverview(data);
        setSkills(skillData);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.detail || 'Your analytics could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading your saved analytics…</p>;
  }

  const trend = overview?.progress_history || [];
  const fallacies = overview?.common_fallacies || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Progress &amp; Skill Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Metrics are calculated from your saved debate evaluations and argument reports.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Completed debates', overview?.completed_debates ?? 0],
          ['Average debate score', overview?.avg_score == null ? '—' : `${overview.avg_score}/100`],
          ['Latest score', overview?.latest_score == null ? '—' : `${overview.latest_score}/100`],
          ['Saved argument reports', overview?.total_argument_analyses ?? 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-[#172554]">{value}</p>
          </Card>
        ))}
      </section>

      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-blue-700" /> Debate performance over time</h2>
          <p className="mt-1 text-xs text-slate-500">Based on your completed sessions with analyzed turns.</p>
        </div>
        {trend.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="round" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="score" name="Overall" stroke="#172554" strokeWidth={3} />
                <Line type="monotone" dataKey="logic" name="Logic" stroke="#7C3AED" />
                <Line type="monotone" dataKey="evidence" name="Evidence" stroke="#0D9488" />
                <Line type="monotone" dataKey="clarity" name="Clarity" stroke="#2563EB" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-600">No completed debate scores yet. Complete a debate with at least one turn to create your progress history.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">Skill breakdown</h2>
          <p className="mt-1 text-xs text-slate-500">Averages over completed debates where that score is available.</p>
        </div>
        {skills.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.map((skill) => (
              <div key={skill.subject} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">{skill.subject}</h3>
                  <Badge variant="blue">{skill.score}/100</Badge>
                </div>
                <ProgressBar value={skill.score} max={100} variant="blue" size="md" />
              </div>
            ))}
          </div>
        ) : <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-600">Skill metrics will appear when scored debate evaluations are available.</p>}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-600" /> Possible fallacies in saved reports</h2>
        {fallacies.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {fallacies.map((item) => (
              <li key={item.name} className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-sm">
                <span className="text-slate-700">{item.name}</span><strong className="text-amber-900">{item.count}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-slate-500">No fallacy flags in the available reports. This is not proof that the arguments are fallacy-free.</p>}
      </Card>
    </div>
  );
};
