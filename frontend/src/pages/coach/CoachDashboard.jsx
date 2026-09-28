import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Award, TrendingUp, AlertCircle, CheckCircle2, 
  MessageSquare, PlusCircle, ArrowRight, BookOpen, Star
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const CoachDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboards/coach')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Loading Debate Coach Command Center...</p>
        </div>
      </div>
    );
  }

  const {
    total_students = 1,
    active_students = 1,
    average_student_score = 78.4,
    students_list = [],
    skill_gap_analysis = [],
    recent_evaluations = [],
    coaching_recommendations = []
  } = data;

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Debate Coach Command Center</h1>
            <Badge variant="warning" size="sm">Coach Portal</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Monitor student progress, analyze cohort skill gaps, and assign targeted rhetorical drills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/coach/students">
            <Button size="sm" icon={Users}>View All Students</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-800/80 border-slate-700/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Students</span>
            <div className="text-2xl font-black text-white">{active_students} / {total_students}</div>
            <span className="text-[10px] text-emerald-400 font-semibold">100% active this week</span>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/80 border-slate-700/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Cohort Average Score</span>
            <div className="text-2xl font-black text-white">{average_student_score}<span className="text-xs font-normal text-slate-400"> / 100</span></div>
            <span className="text-[10px] text-primary-400 font-semibold">+4.2 pts improvement</span>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/80 border-slate-700/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Evaluations Completed</span>
            <div className="text-2xl font-black text-white">{recent_evaluations.length + 3}</div>
            <span className="text-[10px] text-slate-400 font-semibold">Recent feedback active</span>
          </div>
        </Card>
      </div>

      {/* Cohort Skill Gap Analysis */}
      <Card title="Cohort Skill Gap Analysis" subtitle="Target benchmark: 80.0 score per competency">
        <div className="space-y-4">
          {skill_gap_analysis.map((gap, idx) => (
            <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-white">{gap.skill}</span>
                <span className={gap.gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  Cohort: {gap.cohort_average} (Gap: {gap.gap > 0 ? `+${gap.gap}` : gap.gap})
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${gap.gap >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${gap.cohort_average}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Student Roster Table & Coaching Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          title="Student Roster" 
          subtitle="Direct student monitoring"
          action={<Link to="/coach/students" className="text-xs text-primary-400 hover:underline">View All</Link>}
        >
          <div className="divide-y divide-slate-700/50">
            {students_list.map(s => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{s.email} • {s.experience}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-primary-400 block">{s.average_score}/100</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Coach Recommendations & Action Items">
          <div className="space-y-3">
            {coaching_recommendations.map((rec, idx) => (
              <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 text-xs space-y-1">
                <span className="text-amber-400 font-bold uppercase text-[10px] tracking-wider block">
                  Student: {rec.student}
                </span>
                <p className="text-slate-200 leading-relaxed">{rec.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
