import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Award, BarChart3, TrendingUp, AlertTriangle, 
  FileText, Filter, CheckCircle2, ChevronRight 
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const EducatorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboards/educator')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Loading Class Academic Analytics...</p>
        </div>
      </div>
    );
  }

  const {
    class_name = "Rhetoric & Debate Colloquium",
    total_enrolled = 18,
    average_class_score = 79.2,
    debate_average = 78.6,
    presentation_average = 80.1,
    student_rankings = [],
    skill_distribution = [],
    weakest_class_skills = [],
    improvement_trends = []
  } = data;

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">{class_name}</h1>
            <Badge variant="purple" size="sm">Academic Portal</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Cohort intelligence, grade distributions, and systemic curriculum weakness detection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/educator/reports">
            <Button size="sm" icon={FileText}>Generate Class Reports</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Enrolled</span>
          <span className="text-2xl font-black text-white mt-1 block">{total_enrolled} Debaters</span>
          <span className="text-[10px] text-emerald-400 font-medium">100% active submissions</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Class Mean Score</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">{average_class_score}/100</span>
          <span className="text-[10px] text-primary-400 font-medium">+3.8% MoM Increase</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Debate Average</span>
          <span className="text-2xl font-black text-primary-400 mt-1 block">{debate_average}/100</span>
          <span className="text-[10px] text-slate-400 font-medium">30/20/20/15/15 weighting</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Presentation Average</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">{presentation_average}/100</span>
          <span className="text-[10px] text-emerald-400 font-medium">Balanced WPM cadence</span>
        </Card>
      </div>

      {/* Rankings and Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Leaderboard Rankings (7 cols) */}
        <div className="lg:col-span-7">
          <Card title="Student Performance Rankings" subtitle="Aggregated multi-turn scores">
            <div className="divide-y divide-slate-700/50">
              {student_rankings.map(r => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      r.rank === 1 ? 'bg-amber-500 text-slate-950' : (r.rank === 2 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-300')
                    }`}>
                      {r.rank}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{r.name}</p>
                      <p className="text-[10px] text-slate-400">Debates: {r.debates_completed}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-purple-400 block">{r.score}/100</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">{r.improvement}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Grade Distribution & Weakest Skills (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Score Tier Distribution">
            <div className="space-y-3">
              {skill_distribution.map((tier, idx) => (
                <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-200">Score Range {tier.range}</span>
                    <span className="text-purple-400">{tier.count} Students</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div 
                      className="bg-purple-500 h-1.5 rounded-full" 
                      style={{ width: `${(tier.count / total_enrolled) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Cohort Curriculum Priority Weaknesses">
            <div className="space-y-2">
              {weakest_class_skills.map((skill, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-rose-500/20 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
