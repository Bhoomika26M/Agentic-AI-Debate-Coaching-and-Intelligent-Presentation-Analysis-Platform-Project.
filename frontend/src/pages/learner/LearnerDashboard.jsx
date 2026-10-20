import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analyticsApi';
import { coachingApi } from '../../api/coachingApi';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { AlertTriangle, ArrowRight, BookOpen, Scale, Swords, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const Metric = ({ label, value, note }) => (
  <Card>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-extrabold text-[#172554]">{value ?? '—'}</p>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </Card>
);

export const LearnerDashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([analyticsApi.getOverview(), coachingApi.getLearningPlan()])
      .then(([analytics, learningPlan]) => {
        if (!active) return;
        setOverview(analytics);
        setPlan(learningPlan);
      })
      .catch(() => {
        if (active) setError('Your saved performance data could not be loaded. Please refresh or sign in again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const trend = overview?.progress_history || [];
  const recentSessions = overview?.recent_sessions || [];
  const fallacies = overview?.common_fallacies || [];
  const recommendations = overview?.coaching_recommendations || [];
  const assessment = plan?.current_assessment;

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div>
          <Badge variant="blue" size="sm">Debate coach</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Welcome{user?.username ? `, ${user.username}` : ''}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Your dashboard reflects saved debates and analyses. Start a debate to build your personal performance history.</p>
        </div>
        <Link to="/debates"><Button icon={Swords}>Start a debate</Button></Link>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading your saved metrics…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Performance summary">
            <Metric label="Debates completed" value={overview?.completed_debates ?? 0} note={`${overview?.total_debates ?? 0} total saved sessions`} />
            <Metric label="Latest debate score" value={overview?.latest_score == null ? '—' : `${overview.latest_score}/100`} note="From your latest completed debate" />
            <Metric label="Average debate score" value={overview?.avg_score == null ? '—' : `${overview.avg_score}/100`} note="Across scored completed debates" />
            <Metric label="Learning activities" value={`${overview?.learning_plan_progress?.completed ?? 0}/${overview?.learning_plan_progress?.total ?? 0}`} note="Completed activities in your plan" />
          </section>

          <section className="grid gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-blue-700" /> Debate performance</h2>
                  <p className="mt-1 text-xs text-slate-500">Scores calculated from your saved argument analyses</p>
                </div>
                <Link to="/progress" className="text-xs font-semibold text-blue-700">More metrics <ArrowRight className="inline h-3 w-3" /></Link>
              </div>
              {trend.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="round" fontSize={11} />
                      <YAxis domain={[0, 100]} fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" name="Overall score" stroke="#172554" strokeWidth={3} />
                      <Line type="monotone" dataKey="evidence" name="Evidence" stroke="#0D9488" />
                      <Line type="monotone" dataKey="rebuttal_effectiveness" name="Rebuttal response estimate" stroke="#9333EA" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <Scale className="h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Not enough completed debates for a trend yet</p>
                  <p className="mt-1 text-xs text-slate-500">Complete at least two debates with analyzed turns to see progress here.</p>
                </div>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="font-bold text-slate-900">Recent debates</h2>
              <div className="mt-3 space-y-2">
                {recentSessions.length ? recentSessions.map((item) => (
                  <Link key={item.id} to={`/debates/${item.id}`} className="block rounded-lg border border-slate-100 p-3 hover:border-blue-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-slate-800">{item.topic}</span>
                      <Badge variant={item.status === 'COMPLETED' ? 'green' : 'amber'} size="sm">{item.status === 'COMPLETED' ? 'Done' : 'Active'}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.score == null ? 'Not evaluated' : `Score: ${item.score}/100`} · {item.difficulty}</p>
                  </Link>
                )) : <p className="py-8 text-center text-sm text-slate-500">No debate sessions yet.</p>}
              </div>
            </Card>
          </section>

          <Card>
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Scale className="h-4 w-4 text-purple-700" /> Argument analysis trend</h2>
            <p className="mt-1 text-xs text-slate-500">Recent saved Milestone 2 analysis scores</p>
            {overview?.argument_quality_trend?.length ? (
              <div className="mt-4 space-y-3">
                {overview.argument_quality_trend.slice(-5).reverse().map((item) => (
                  <div key={item.round} className="grid grid-cols-[5rem_1fr] items-center gap-x-4 gap-y-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[6rem_1fr_1fr_1fr]">
                    <span className="text-xs font-semibold text-slate-600">{item.round}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-600"><span className="w-14">Overall</span><ProgressBar value={item.score} size="sm" variant="navy" /><strong>{item.score}</strong></div>
                    <div className="flex items-center gap-2 text-xs text-slate-600"><span className="w-14">Evidence</span><ProgressBar value={item.evidence} size="sm" variant="teal" /><strong>{item.evidence}</strong></div>
                    <div className="flex items-center gap-2 text-xs text-slate-600"><span className="w-14">Logic</span><ProgressBar value={item.logic} size="sm" variant="purple" /><strong>{item.logic}</strong></div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 text-sm text-slate-500">Saved argument analyses will be shown here when available.</p>}
          </Card>

          <section className="grid gap-5 lg:grid-cols-3">
            <Card>
              <h2 className="flex items-center gap-2 font-bold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-600" /> Common fallacies</h2>
              {fallacies.length ? (
                <ul className="mt-3 space-y-2">
                  {fallacies.slice(0, 5).map((item) => (
                    <li key={item.name} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">{item.name}</span><span className="font-semibold text-slate-900">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-500">No fallacy detections in saved analyses yet.</p>}
            </Card>

            <Card>
              <h2 className="font-bold text-slate-900">Coaching recommendations</h2>
              {recommendations.length ? (
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-700">
                  {recommendations.slice(0, 4).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-500">Complete a debate to receive recommendations based on your arguments.</p>}
              <Link to="/coaching" className="mt-4 inline-block text-xs font-semibold text-blue-700">Open coaching <ArrowRight className="inline h-3 w-3" /></Link>
            </Card>

            <Card>
              <h2 className="flex items-center gap-2 font-bold text-slate-900"><BookOpen className="h-4 w-4 text-blue-700" /> Learning plan</h2>
              {assessment?.average_scores && Object.keys(assessment.average_scores).length ? (
                <>
                  <p className="mt-2 text-xs text-slate-500">{assessment.message}</p>
                  <div className="mt-3 space-y-2">
                    {(plan?.activities || []).map((activity) => (
                      <div key={activity.id} className="text-xs">
                        <div className="mb-1 flex justify-between gap-2"><span className="font-medium text-slate-700">{activity.skill}</span><span className={activity.completed ? 'text-emerald-700' : 'text-slate-400'}>{activity.completed ? 'Done' : 'Next'}</span></div>
                        <ProgressBar value={activity.completed ? 100 : 0} size="sm" variant={activity.completed ? 'green' : 'blue'} />
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="mt-2 text-sm text-slate-500">{assessment?.message || 'Your plan will adapt to your completed debate analyses.'}</p>}
              <Link to="/coaching" className="mt-4 inline-block text-xs font-semibold text-blue-700">View and update plan <ArrowRight className="inline h-3 w-3" /></Link>
            </Card>
          </section>
        </>
      )}
    </div>
  );
};
