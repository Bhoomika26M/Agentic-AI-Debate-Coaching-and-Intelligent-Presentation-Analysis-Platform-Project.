import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  TrendingUp,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Target
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [coachingRecs, setCoachingRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [dashRes, coachRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/coaching/recommendations')
      ]);
      setAnalytics(dashRes.data);
      setCoachingRecs(coachRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const skillsRadar = analytics?.skills_radar || [
    { skill: "Argumentation", score: 84 },
    { skill: "Critical Thinking", score: 88 },
    { skill: "Communication", score: 79 },
    { skill: "Confidence", score: 82 },
    { skill: "Rebuttal Skills", score: 76 },
    { skill: "Presentation Skills", score: 85 }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER WITH ACTIVE ROLE BADGE */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">
              {user?.role === 'Educator' ? 'Educator & Class Analytics' :
               user?.role === 'Debate Coach' ? 'Debate Coach Adjudication Telemetry' :
               user?.role === 'Administrator' ? 'Administrative System Telemetry' :
               'Learner Skill Growth & Dialectic Radar'}
            </h2>
            <p className="text-xs text-gray-500">
              Personalized intelligence dossier powered by weighted performance scoring and historical session mining.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FCF6E5] text-[#B87E0E] border border-[#F4E9C0]">
          Active Role: {user?.role || 'Learner'}
        </span>
      </div>

      {/* SKILL RADAR & BENCHMARK CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-2">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-[#D49B19]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              6-Dimensional Rhetorical Skill Radar
            </h3>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillsRadar}>
                <PolarGrid stroke="#ECE7DE" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#33404D', fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis domain={[0, 100]} stroke="#C7CDD4" />
                <Radar name="User Score" dataKey="score" stroke="#D49B19" fill="#DF9E16" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Comparison Chart */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#D49B19]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Core Competencies Breakdown
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillsRadar} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#ECE7DE' }} />
                <YAxis dataKey="skill" type="category" tickLine={false} axisLine={{ stroke: '#ECE7DE' }} tick={{ fill: '#475562', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#D49B19" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI COACHING RECOMMENDATION PATHWAYS */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#D49B19]" />
            <h3 className="text-sm font-bold text-[#1E242B]">
              Personalized AI Coaching & Learning Pathways
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            Dynamically adapted from your lowest scoring metrics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {coachingRecs.map((rec) => (
            <div key={rec.id} className="p-5 rounded-2xl border border-[#ECE7DE] bg-[#FAF8F3]/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCF6E5] text-[#B87E0E] border border-[#F4E9C0]">
                  {rec.category}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rec.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700'
                }`}>
                  {rec.priority} Priority
                </span>
              </div>

              <h4 className="font-bold text-sm text-[#1E242B]">{rec.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{rec.description}</p>

              {/* Recommended Exercises */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Prescribed Practice Drill:
                </span>
                {rec.recommended_exercises?.map((ex, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white border border-[#ECE7DE] text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{ex.title}</p>
                      <p className="text-[11px] text-gray-400">{ex.objective || ex.type}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[#D49B19] bg-[#FCF6E5] px-2 py-0.5 rounded-md font-bold">
                      {ex.duration}
                    </span>
                  </div>
                ))}
              </div>

              {/* Communication Tips */}
              {rec.communication_tips && rec.communication_tips.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-gray-100 text-[11px] text-gray-600 space-y-1">
                  <span className="font-bold text-[#B87E0E] block">💡 Master Tip:</span>
                  <p>{rec.communication_tips[0]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
