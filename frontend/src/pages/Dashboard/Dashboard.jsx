import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Trophy,
  Video,
  Award,
  DollarSign,
  TrendingUp,
  Zap,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  Bot,
  FileText,
  Mic,
  ArrowRight
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
    rooms_hosted: 41,
    followers: 0,
    following: 2,
    subscription_plan: 'Pro Plan',
    subscription_status: 'Active',
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
        title: 'New Comment',
        subtitle: 'Pro AI commented on your debate: "Strong opening point!"',
        time: 'Just now',
        icon: 'message',
        color: 'green'
      }
    ]
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 6 TOP STATISTIC CARDS */}
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
            <div className="text-xs font-medium text-gray-500">
              Total Debates
            </div>
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
            <div className="text-xs font-medium text-gray-500">
              Debates Won
            </div>
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
            <div className="text-xs font-medium text-gray-500">
              Average Score
            </div>
          </div>
        </div>

        {/* 4. Rooms Hosted */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <Video className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.rooms_hosted}
            </div>
            <div className="text-xs font-medium text-gray-500">
              Rooms Hosted
            </div>
          </div>
        </div>

        {/* 5. Following / Network */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19] mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.following}
            </div>
            <div className="text-xs font-medium text-gray-500">
              Following
            </div>
          </div>
        </div>

        {/* 6. Subscription Plan */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {stats.subscription_status || 'Active'}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl font-extrabold text-[#1E242B] tracking-tight">
              {stats.subscription_plan ? stats.subscription_plan.split(' ')[0] : 'Pro'}
            </div>
            <div className="text-xs font-medium text-gray-500">
              Plan
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="space-y-3.5">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#D49B19]" />
          <h2 className="text-base font-bold text-[#1E242B]">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Start a Debate */}
          <div
            onClick={() => navigate('/live-debates')}
            className="cursor-pointer bg-white border border-[#ECE7DE] hover:border-[#D49B19] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FCF6E5] group-hover:bg-[#F8EBC3] flex items-center justify-center text-[#D49B19] mb-3 transition-colors">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#1E242B] group-hover:text-[#B87E0E] transition-colors">
              Start a Debate
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Join active debate rooms
            </p>
          </div>

          {/* Action 2: Practice with AI (Highlighted) */}
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
            <p className="text-xs text-gray-500 mt-1">
              Interactive multi-turn simulation
            </p>
          </div>

          {/* Action 3: Analyze an Argument */}
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
            <p className="text-xs text-gray-500 mt-1">
              Extract claims & evidence quality
            </p>
          </div>

          {/* Action 4: Analyze a Presentation */}
          <div
            onClick={() => navigate('/presentation-analysis')}
            className="cursor-pointer bg-white border border-[#ECE7DE] hover:border-[#D49B19] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FAF8F3] group-hover:bg-[#FCF6E5] flex items-center justify-center text-gray-600 group-hover:text-[#D49B19] mb-3 transition-colors">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#1E242B] group-hover:text-[#B87E0E] transition-colors">
              Analyze a Presentation
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Speech cadence & filler analysis
            </p>
          </div>
        </div>
      </div>

      {/* YOUR ANALYTICS SECTION */}
      <div className="space-y-3.5">
        <h2 className="text-base font-bold text-[#1E242B]">Your Analytics</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Monthly Debates Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Monthly Debates
              </h3>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthly_debates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E242B', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    cursor={{ fill: '#FBF9F4' }}
                  />
                  <Bar dataKey="debates" fill="#D49B19" radius={[4, 4, 0, 0]} barSize={120} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Win Distribution Donut Chart */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card flex flex-col justify-between">
            <div className="flex items-center space-x-2 mb-2">
              <PieChartIcon className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Win Distribution
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
                    outerRadius={68}
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
            {/* Chart Legend */}
            <div className="flex items-center justify-center space-x-6 pt-2 text-xs font-medium text-gray-700">
              {stats.win_distribution.map((d, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: d.color }}></span>
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Weekly Activity Spline Chart */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Weekly Activity
              </h3>
            </div>
            <div className="h-56 w-full">
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

      {/* RECENT ACTIVITY SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-[#ECE7DE] shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-bold text-[#1E242B]">Recent Activity</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {stats.recent_activity.map((item, idx) => (
            <div key={idx} className="py-3 flex items-start space-x-3.5 first:pt-0 last:pb-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <MessageSquare className="w-4 h-4" />
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
