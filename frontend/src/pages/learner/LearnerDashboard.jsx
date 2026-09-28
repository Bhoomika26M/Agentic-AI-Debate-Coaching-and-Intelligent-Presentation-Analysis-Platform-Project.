import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, MessageSquare, Mic, TrendingUp, AlertTriangle, 
  Flame, Calendar, CheckCircle2, ChevronRight, PlusCircle, 
  BrainCircuit, Activity, BarChart2
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ScoreGauge } from '../../components/common/ScoreGauge';
import { RadarSkillChart } from '../../components/charts/RadarSkillChart';
import { PerformanceChart } from '../../components/charts/PerformanceChart';
import { PaceTimelineChart } from '../../components/charts/PaceTimelineChart';
import { FillerWordBarChart } from '../../components/charts/FillerWordBarChart';

export const LearnerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboards/learner')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-400">Loading Learner Intelligence Dashboard...</p>
        </div>
      </div>
    );
  }

  const {
    overall_performance_score = 77.3,
    debate_score = 78.5,
    presentation_score = 78.0,
    critical_thinking_score = 78.0,
    communication_score = 80.0,
    current_learning_streak = 7,
    weakest_skills = [],
    strongest_skills = [],
    coaching_insights = [],
    recent_debates = [],
    recent_presentations = [],
    learning_goals = [],
    recommended_exercises = [],
    upcoming_practice_sessions = [],
    skill_radar = [],
    performance_over_time = [],
    speaking_pace_trends = [],
    filler_word_trends = []
  } = data || {};

  return (
    <div className="space-y-8">
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-primary-950/60 via-slate-900 to-indigo-950/40 border border-primary-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Learner Performance Hub</h1>
            <Badge variant="success" size="sm" className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> {current_learning_streak} Day Streak
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Real-time analytics across your multi-round AI debate simulations and speech presentations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/learner/debates/new">
            <Button size="md" icon={PlusCircle} className="shadow-lg shadow-primary-600/30">
              New Debate
            </Button>
          </Link>
          <Link to="/learner/presentations/new">
            <Button variant="secondary" size="md" icon={Mic}>
              Analyze Speech
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-800 to-primary-950/30 border-primary-500/40">
          <ScoreGauge score={overall_performance_score} size="md" label="Overall Score" weight="Composite" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreGauge score={debate_score} size="md" label="Debate Score" weight="30/20/20/15/15" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreGauge score={presentation_score} size="md" label="Presentation Score" weight="Pace & Delivery" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreGauge score={critical_thinking_score} size="md" label="Critical Thinking" weight="Logic & Fallacies" />
        </Card>
        <Card className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center p-4">
          <ScoreGauge score={communication_score} size="md" label="Communication" weight="Clarity & Ethos" />
        </Card>
      </div>

      {/* Charts Row: Radar and Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Skill Radar Analytics" subtitle="Evaluation across 11 core competencies">
          <RadarSkillChart data={skill_radar} />
        </Card>

        <Card title="Performance Trajectory" subtitle="Score progression over time (Debate vs. Presentation)">
          <PerformanceChart data={performance_over_time} />
        </Card>
      </div>

      {/* Skills Gap Analysis and Coaching Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Skill Strengths & Gaps">
          <div className="space-y-4 text-xs">
            <div>
              <p className="font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strongest Competencies</p>
              <div className="flex flex-wrap gap-2">
                {strongest_skills.map((s, idx) => (
                  <Badge key={idx} variant="success">{s}</Badge>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700/60">
              <p className="font-semibold text-amber-400 uppercase tracking-wider mb-2">Priority Areas for Growth</p>
              <div className="flex flex-wrap gap-2">
                {weakest_skills.map((s, idx) => (
                  <Badge key={idx} variant="warning">{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Personalized Coaching Insights">
          <div className="space-y-3">
            {coaching_insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/40 text-xs">
                <BrainCircuit className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <span className="text-slate-300 leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Debates & Presentations Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Debates */}
        <Card 
          title="Recent Debates" 
          subtitle="Your multi-turn AI debate simulations"
          action={<Link to="/learner/debates/history" className="text-xs text-primary-400 hover:underline">View all</Link>}
        >
          <div className="divide-y divide-slate-700/40">
            {recent_debates.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No debates yet. Create your first debate above!</p>
            ) : (
              recent_debates.map(d => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div className="max-w-[75%]">
                    <p className="text-xs font-semibold text-white truncate">{d.topic}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {d.format} • Position: <span className="text-primary-400">{d.position}</span> • {d.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{d.score ? `${d.score}/100` : 'Active'}</span>
                    <Link to={`/learner/debates/${d.id}`} className="block text-[11px] text-primary-400 hover:underline mt-0.5">
                      Review →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Presentations */}
        <Card 
          title="Recent Speech Analyses" 
          subtitle="Audio & video delivery evaluations"
          action={<Link to="/learner/presentations/history" className="text-xs text-primary-400 hover:underline">View all</Link>}
        >
          <div className="divide-y divide-slate-700/40">
            {recent_presentations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No presentations analyzed yet.</p>
            ) : (
              recent_presentations.map(p => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div className="max-w-[75%]">
                    <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.wpm ? `${p.wpm} WPM` : 'Processing'} • {p.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{p.score ? `${p.score}/100` : '--'}</span>
                    <Link to={`/learner/presentations/${p.id}`} className="block text-[11px] text-primary-400 hover:underline mt-0.5">
                      Details →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Learning Goals & Recommended Practice Drills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Active Learning Goals" subtitle="Target milestones">
          <div className="space-y-3">
            {learning_goals.map(g => (
              <div key={g.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-200">{g.title}</span>
                  <span className="text-primary-400">{g.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${g.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Targeted Practice Drills" subtitle="Recommended based on weakest competencies">
          <div className="space-y-3">
            {recommended_exercises.map(ex => (
              <div key={ex.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                <div>
                  <p className="text-xs font-semibold text-white">{ex.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{ex.category} Drill • {ex.difficulty}</p>
                </div>
                <Link to={`/learner/exercises`}>
                  <Button size="sm" variant="outline">Start Drill</Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
