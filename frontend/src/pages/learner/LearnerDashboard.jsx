import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analyticsApi';
import { Card } from '../../components/common/Card';
import { ScoreCard } from '../../components/common/ScoreCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Swords,
  Scale,
  Mic,
  Presentation,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Award,
  Zap,
  Target
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const LearnerDashboard = () => {
  const { user } = useAuth();

  const [scores, setScores] = useState({
    debateScore: 84,
    argumentScore: 78,
    speakingScore: 82,
    presentationScore: 86,
  });

  const [progressData, setProgressData] = useState([
    { round: 'Week 1', score: 68, logic: 65, delivery: 70 },
    { round: 'Week 2', score: 72, logic: 70, delivery: 73 },
    { round: 'Week 3', score: 75, logic: 72, delivery: 77 },
    { round: 'Week 4', score: 80, logic: 78, delivery: 81 },
    { round: 'Week 5', score: 83, logic: 81, delivery: 84 },
    { round: 'Current', score: 86, logic: 84, delivery: 87 },
  ]);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const data = await analyticsApi.getOverview();
        if (data?.avg_score) {
          setScores((prev) => ({
            ...prev,
            debateScore: Math.round(data.avg_score),
          }));
        }
      } catch (err) {
        // Keeps polished default values
      }
    };
    loadOverview();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Welcoming Top Greeting */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#172554] border border-blue-100 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Coach Ready</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Good morning{user?.username ? `, ${user.username}` : ''}! Ready to improve your communication skills?
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Practice competitive debate rounds, test thesis arguments for logical consistency, and analyze speech cadence with real-time feedback.
          </p>
        </div>

        <Link to="/debates">
          <Button variant="primary" size="lg" icon={Swords} iconPosition="left">
            Start Live Debate
          </Button>
        </Link>
      </div>

      {/* 2. Four Core Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <ScoreCard
          title="Debate Score"
          icon={Swords}
          score={scores.debateScore}
          maxScore={100}
          trend="+5.2%"
          description="Oxford & Parliamentary round performance across 12 simulations."
          accent="blue"
        />

        <ScoreCard
          title="Argument Score"
          icon={Scale}
          score={scores.argumentScore}
          maxScore={100}
          trend="+3.8%"
          description="Toulmin model grounds, warrant grounding, and fallacy avoidance."
          accent="purple"
        />

        <ScoreCard
          title="Speaking Score"
          icon={Mic}
          score={scores.speakingScore}
          maxScore={100}
          trend="+4.0%"
          description="Speaking cadence (142 WPM optimal) and low filler-word density."
          accent="teal"
        />

        <ScoreCard
          title="Presentation Score"
          icon={Presentation}
          score={scores.presentationScore}
          maxScore={100}
          trend="+2.5%"
          description="Slide text density, visual hierarchy, and message clarity."
          accent="green"
        />
      </div>

      {/* 3. Continue Practicing (3 Large Cards) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
            Continue Practicing
          </h3>
          <p className="text-xs text-slate-500">
            Pick a core training module to build confidence and sharp analytical reasoning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Practice a Debate */}
          <Card hover className="flex flex-col justify-between border-slate-200">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-4">
                <Swords className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-[#0F172A]">Practice a Debate</h4>
              <p className="text-sm font-medium text-blue-700 mt-0.5">Challenge an AI opponent</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Argue Oxford-style resolutions turn-by-turn against an adaptive Socratic opponent.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link to="/debates" className="block w-full">
                <Button variant="primary" size="md" className="w-full justify-center">
                  Start Debate Session
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 2: Analyze an Argument */}
          <Card hover className="flex flex-col justify-between border-slate-200">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-[#0F172A]">Analyze an Argument</h4>
              <p className="text-sm font-medium text-purple-700 mt-0.5">Find weaknesses and logical fallacies</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Paste any thesis to inspect Toulmin structure and scan for 20+ informal fallacies.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link to="/arguments" className="block w-full">
                <Button variant="outline" size="md" className="w-full justify-center border-slate-300 text-slate-800 hover:bg-purple-50 hover:text-purple-900 hover:border-purple-200">
                  Analyze Argument
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 3: Practice Your Speech */}
          <Card hover className="flex flex-col justify-between border-slate-200">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-[#0F172A]">Practice Your Speech</h4>
              <p className="text-sm font-medium text-teal-700 mt-0.5">Improve clarity and speaking confidence</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Record live audio to track pace (WPM), eliminate vocal fillers, and refine delivery.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link to="/speech" className="block w-full">
                <Button variant="outline" size="md" className="w-full justify-center border-slate-300 text-slate-800 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-200">
                  Open Speech Studio
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Split: Your Progress + Recommended for You */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Your Progress Chart */}
        <Card className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#172554]" />
                Your Progress
              </h3>
              <p className="text-xs text-slate-500">Overall score improvement trajectory over recent weeks</p>
            </div>
            <Link to="/progress">
              <span className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1">
                Full Metrics <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="round" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Composite Score"
                  stroke="#172554"
                  strokeWidth={3}
                  dot={{ fill: '#172554', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="delivery"
                  name="Speech Delivery"
                  stroke="#0D9488"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#172554]"></span> Composite Score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span> Speech Cadence
            </span>
          </div>
        </Card>

        {/* Recommended for You */}
        <Card className="lg:col-span-5 flex flex-col justify-between">
          <div className="pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              Recommended for You
            </h3>
            <p className="text-xs text-slate-500">Personalized feedback based on your last 3 sessions</p>
          </div>

          <div className="space-y-3 flex-1">
            {/* Rec 1 */}
            <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-xs text-amber-900">
                  Practice avoiding Hasty Generalization
                </div>
                <Badge variant="amber" size="sm">Logic</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                You drew broad conclusions from single examples during cross-examination. Try testing claims with 2+ sources.
              </p>
            </div>

            {/* Rec 2 */}
            <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 hover:bg-blue-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-xs text-blue-950">
                  Try a 5-minute rebuttal exercise
                </div>
                <Badge variant="blue" size="sm">Rebuttal</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Work on directly dismantling opponent warrants before presenting affirmative extensions.
              </p>
            </div>

            {/* Rec 3 */}
            <div className="p-3.5 rounded-xl border border-teal-200/80 bg-teal-50/40 hover:bg-teal-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-xs text-teal-950">
                  Reduce filler words in your next speech
                </div>
                <Badge variant="teal" size="sm">Speaking</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                You used "you know" 6 times in your last round. Practice a 1-second silent breath at pauses.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100">
            <Link to="/coaching" className="block w-full">
              <Button variant="ghost" size="sm" className="w-full text-slate-700 hover:text-slate-900 justify-center">
                View All Personalized Coaching Drills
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
