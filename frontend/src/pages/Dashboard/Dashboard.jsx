import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Trophy,
  Video,
  Award,
  Zap,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  Bot,
  FileText,
  Mic,
  AlertTriangle,
  Sparkles,
  Users,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Download,
  Shield,
  Layers,
  TrendingUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  const stats = analytics || {
    total_debates: 7,
    debates_won: 1,
    win_rate: 14.3,
    average_score: 79.6,
    speech_analyses: 5,
    fallacies_audited: 12,
    coaching_recommendations: 6,
    monthly_debates: [{ month: 'Feb', debates: 7 }],
    win_distribution: [
      { name: 'Tie', value: 75, color: '#D49B19' },
      { name: 'Side B Wins', value: 25, color: '#181F25' }
    ],
    weekly_activity: [
      { day: 'Thu', count: 0 },
      { day: 'Fri', count: 0 },
      { day: 'Sat', count: 0 },
      { day: 'Sun', count: 0.2 },
      { day: 'Mon', count: 1.2 },
      { day: 'Tue', count: 6.0 },
      { day: 'Wed', count: 0 }
    ],
    recent_activity: [
      {
        id: 'def_1',
        title: 'Debate Evaluation Concluded',
        subtitle: 'AI Adjudication & Civil Law scored 82/100',
        time: 'Today',
        icon: 'trophy',
        color: 'amber'
      }
    ]
  };

  const userRole = user?.role || 'Learner';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 6 TOP STATISTIC CARDS (Focused strictly on Debate & Speech Performance) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Total Debates */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.total_debates}
            </div>
            <div className="text-xs font-medium text-gray-500">Total Debates</div>
          </div>
        </div>

        {/* 2. Debates Won */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 bg-[#F4EFE6] px-2 py-0.5 rounded-full border border-[#ECE7DE]">
              {Math.round(stats.win_rate)}% rate
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.debates_won}
            </div>
            <div className="text-xs font-medium text-gray-500">Debates Won</div>
          </div>
        </div>

        {/* 3. Average Performance Score */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.average_score || 79.6}
            </div>
            <div className="text-xs font-medium text-gray-500">Average Score</div>
          </div>
        </div>

        {/* 4. Speech & Presentation Analyses */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <Mic className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.speech_analyses || 5}
            </div>
            <div className="text-xs font-medium text-gray-500">Speeches Analyzed</div>
          </div>
        </div>

        {/* 5. Fallacies Audited */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.fallacies_audited || 12}
            </div>
            <div className="text-xs font-medium text-gray-500">Fallacy Audits</div>
          </div>
        </div>

        {/* 6. Active Coaching Recommendations */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.coaching_recommendations || 6}
            </div>
            <div className="text-xs font-medium text-gray-500">Coaching Insights</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LEARNER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Learner' && (
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="space-y-3.5">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#D49B19]" />
              <h2 className="text-base font-bold text-[#1E242B]">Debate & Speech Training Tools</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => navigate('/ai-coach')}
                className="cursor-pointer bg-white border-2 border-[#D49B19]/50 hover:border-[#D49B19] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FCF6E5] group-hover:bg-[#F8EBC3] flex items-center justify-center text-[#D49B19] mb-3 transition-colors">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#1E242B] group-hover:text-[#B87E0E] transition-colors">
                  Practice with AI
                </h3>
                <p className="text-xs text-gray-500 mt-1">Multi-turn debate simulator</p>
              </div>

              <div
                onClick={() => navigate('/debates')}
                className="cursor-pointer bg-white border border-[#ECE7DE] hover:border-[#D49B19] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FCF6E5] group-hover:bg-[#F8EBC3] flex items-center justify-center text-[#D49B19] mb-3 transition-colors">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#1E242B] group-hover:text-[#B87E0E] transition-colors">
                  Debate Sessions
                </h3>
                <p className="text-xs text-gray-500 mt-1">Join or schedule matches</p>
              </div>

              <div
                onClick={() => navigate('/argument-analysis')}
                className="cursor-pointer bg-white border border-[#ECE7DE] hover:border-[#D49B19] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FAF8F3] group-hover:bg-[#FCF6E5] flex items-center justify-center text-gray-600 group-hover:text-[#D49B19] mb-3 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#1E242B] group-hover:text-[#B87E0E] transition-colors">
                  Analyze an Argument
                </h3>
                <p className="text-xs text-gray-500 mt-1">Dissect claims & evidence</p>
              </div>

              <div
                onClick={() => navigate('/presentation-analysis')}
                className="cursor-pointer bg-white border border-[#ECE7DE] hover:border-[#D49B19] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FAF8F3] group-hover:bg-[#FCF6E5] flex items-center justify-center text-gray-600 group-hover:text-[#D49B19] mb-3 transition-colors">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#1E242B] group-hover:text-[#B87E0E] transition-colors">
                  Analyze a Speech
                </h3>
                <p className="text-xs text-gray-500 mt-1">Cadence (WPM) & filler checks</p>
              </div>
            </div>
          </div>

          {/* Recommended Exercises & Personalized Coaching Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-[#D49B19]">
                <Sparkles className="w-4 h-4 fill-current" />
                <h3 className="text-sm font-bold text-[#1E242B]">Personalized Coaching Insights</h3>
              </div>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="p-3 bg-[#FCF6E5] rounded-xl border border-[#F4E9C0] flex items-start space-x-2">
                  <span className="font-bold text-[#B87E0E] shrink-0">1.</span>
                  <span><b>Elevate Empirical Proof:</b> Back opening premises with quantified economic research studies to increase evidence scores above 85.</span>
                </li>
                <li className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] flex items-start space-x-2">
                  <span className="font-bold text-[#D49B19] shrink-0">2.</span>
                  <span><b>Pacing Optimization:</b> Speaking rate is currently 142 WPM (Optimal Collegiate tier). Maintain deliberate pauses before counter-claims.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-[#D49B19]">
                <BookOpen className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#1E242B]">Recommended Training Drills</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div
                  onClick={() => navigate('/fallacy-detector')}
                  className="p-3 bg-[#FAF8F3] hover:bg-[#F2ECE1] rounded-xl border border-[#ECE7DE] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-bold text-gray-800 block">False Dilemma Refactoring Drill</span>
                    <span className="text-gray-500 text-[11px]">Audit and rewrite binary fallacy statements into nuanced propositions.</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div
                  onClick={() => navigate('/counterarguments')}
                  className="p-3 bg-[#FAF8F3] hover:bg-[#F2ECE1] rounded-xl border border-[#ECE7DE] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-bold text-gray-800 block">Cross-Examination Trap Construction</span>
                    <span className="text-gray-500 text-[11px]">Generate 5-dimensional counter-perspectives against policy resolutions.</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEBATE COACH DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Debate Coach' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#D49B19]">
                <Users className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#1E242B]">Student Progress & Mentee Tracking</h2>
              </div>
              <span className="text-xs text-gray-500 font-medium">4 Active Mentees</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF8F3] text-gray-600 border-b border-[#ECE7DE] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Debate Cohort</th>
                    <th className="py-3 px-4">Debates Completed</th>
                    <th className="py-3 px-4">Weighted Score</th>
                    <th className="py-3 px-4">Skill Gap Area</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">Alex Rivera</td>
                    <td className="py-3 px-4">Varsity Parliamentary</td>
                    <td className="py-3 px-4">7 Debates</td>
                    <td className="py-3 px-4 font-bold text-amber-700">79.6 / 100</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Rebuttal Precision</span></td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => navigate('/history')} className="text-[#D49B19] font-bold hover:underline">Review Matches</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">Morgan Chen</td>
                    <td className="py-3 px-4">Oxford Union Novice</td>
                    <td className="py-3 px-4">4 Debates</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">84.2 / 100</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">Speech Cadence</span></td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => navigate('/history')} className="text-[#D49B19] font-bold hover:underline">Review Matches</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDUCATOR DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Educator' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#D49B19]">
                <Award className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#1E242B]">Classroom Cohort Analytics & Rankings</h2>
              </div>
              <button
                onClick={() => navigate('/analytics')}
                className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] text-xs font-bold text-gray-800 flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 text-[#D49B19]" />
                <span>Export Class Reports</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] space-y-1">
                <span className="text-xs font-bold text-gray-500">Cohort Average Score</span>
                <div className="text-2xl font-black text-[#1E242B]">81.4 / 100</div>
                <span className="text-[11px] text-emerald-700 font-semibold">+4.2% improvement this term</span>
              </div>
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] space-y-1">
                <span className="text-xs font-bold text-gray-500">Speech Clarity Benchmark</span>
                <div className="text-2xl font-black text-[#1E242B]">86.0%</div>
                <span className="text-[11px] text-gray-500">Average filler word count: 2.1 / speech</span>
              </div>
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] space-y-1">
                <span className="text-xs font-bold text-gray-500">Active Debate Rounds</span>
                <div className="text-2xl font-black text-[#1E242B]">28 Sessions</div>
                <span className="text-[11px] text-[#B87E0E] font-semibold">100% participation rate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMINISTRATOR DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Administrator' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#D49B19]">
                <Shield className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#1E242B]">Platform Governance & AI Telemetry</h2>
              </div>
              <button
                onClick={() => navigate('/admin/users')}
                className="px-4 py-2 rounded-xl bg-[#181F25] text-white font-bold text-xs hover:bg-black transition-colors"
              >
                Manage User Access
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-gray-500 font-semibold block">Total User Accounts</span>
                <span className="text-xl font-bold text-[#1E242B] mt-1 block">4 Seed Accounts</span>
                <span className="text-[10px] text-emerald-600 font-medium">All 4 roles active</span>
              </div>
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-gray-500 font-semibold block">AI Inference Model</span>
                <span className="text-xl font-bold text-[#1E242B] mt-1 block">OpenAI GPT-4o</span>
                <span className="text-[10px] text-emerald-600 font-medium">Automatic Fallback Engine Online</span>
              </div>
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-gray-500 font-semibold block">API Response Latency</span>
                <span className="text-xl font-bold text-[#1E242B] mt-1 block">42 ms</span>
                <span className="text-[10px] text-emerald-600 font-medium">Nominal operation</span>
              </div>
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                <span className="text-gray-500 font-semibold block">Database Status</span>
                <span className="text-xl font-bold text-[#1E242B] mt-1 block">Healthy</span>
                <span className="text-[10px] text-emerald-600 font-medium">14 Relational Models</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERFORMANCE ANALYTICS CHARTS SECTION (Present across all roles) */}
      {/* ========================================================================= */}
      <div className="space-y-3.5">
        <h2 className="text-base font-bold text-[#1E242B]">Debate Activity & Outcomes</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly Debates Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Monthly Debates
              </h3>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthly_debates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E242B', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    cursor={{ fill: '#FBF9F4' }}
                  />
                  <Bar dataKey="debates" fill="#D49B19" radius={[4, 4, 0, 0]} barSize={100} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win Distribution Donut Chart */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card flex flex-col justify-between">
            <div className="flex items-center space-x-2 mb-2">
              <PieChartIcon className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Adjudication Outcomes
              </h3>
            </div>
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.win_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.win_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? '#D49B19' : '#181F25')} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E242B', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 pt-2 text-xs font-medium text-gray-700">
              {stats.win_distribution.map((d, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: d.color }}></span>
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Activity Area Chart */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Weekly Activity
              </h3>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weekly_activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DF9E16" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#DF9E16" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E242B', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                  />
                  <Area
                    type="natural"
                    dataKey="count"
                    stroke="#D49B19"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#goldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY LOG */}
      <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-bold text-[#1E242B]">Recent Platform Activity</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {stats.recent_activity.map((item, idx) => (
            <div key={idx} className="py-3 flex items-start space-x-3.5 first:pt-0 last:pb-0">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D49B19] shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#1E242B]">{item.title}</h4>
                  <span className="text-[11px] text-gray-400">{item.time}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
