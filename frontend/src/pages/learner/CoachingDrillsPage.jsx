import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Circle, RefreshCw, Target } from 'lucide-react';
import { coachingApi } from '../../api/coachingApi';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';

export const CoachingDrillsPage = () => {
  const [plan, setPlan] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  const loadPlan = useCallback(async () => {
    try {
      const [nextPlan, nextRecommendations] = await Promise.all([
        coachingApi.getLearningPlan(),
        coachingApi.getRecommendations(),
      ]);
      setPlan(nextPlan);
      setRecommendations(nextRecommendations);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load your coaching plan. Please try again.');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPlan);
  }, [loadPlan]);

  const refreshPlan = async () => {
    setUpdating('refresh');
    setError('');
    try {
      const result = await coachingApi.refreshLearningPlan();
      setPlan(result);
      const nextRecommendations = await coachingApi.getRecommendations();
      setRecommendations(nextRecommendations);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'The learning plan could not be refreshed.');
    } finally {
      setUpdating(null);
    }
  };

  const toggleActivity = async (activity) => {
    setUpdating(activity.id);
    setError('');
    try {
      const nextPlan = await coachingApi.updateLearningActivity(activity.id, !activity.completed);
      setPlan(nextPlan);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'The activity status could not be updated.');
    } finally {
      setUpdating(null);
    }
  };
  const loading = plan === null && !error;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6 text-emerald-700" /> Coaching &amp; Learning Plan</h1>
          <p className="mt-1 text-sm text-slate-500">Your plan is based on saved debate turn analyses. Mark activities complete to track progress.</p>
        </div>
        <Button variant="outline" icon={RefreshCw} loading={updating === 'refresh'} disabled={Boolean(updating)} onClick={refreshPlan}>
          Refresh from performance
        </Button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading your saved learning plan…</p> : (
        <>
          {recommendations?.has_data ? (
            <Card className="space-y-4 border-emerald-200 bg-emerald-50/40">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <h2 className="font-bold text-slate-900">Performance-based coaching</h2>
                  <p className="mt-1 text-sm text-slate-600">{recommendations.rationale}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Relative strengths</h3>
                  {recommendations.strengths?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{recommendations.strengths.map((item) => <li key={item.skill}>{item.skill}: {item.score}/100</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No scored dimensions available.</p>}
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">Focus areas</h3>
                  {recommendations.weaknesses?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{recommendations.weaknesses.map((item) => <li key={item.skill}>{item.skill}: {item.score}/100</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No priority area was identified from the available scores.</p>}
                </div>
              </div>
              {!!recommendations.recommendations?.length && (
                <ul className="list-inside list-disc border-t border-emerald-200 pt-3 text-sm leading-relaxed text-slate-700">
                  {recommendations.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              )}
            </Card>
          ) : (
            <Card>
              <h2 className="font-bold text-slate-900">Build your first performance-based plan</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {recommendations?.rationale || 'Complete a debate with at least one argument turn. The plan will use your saved argument scores and detected reasoning issues instead of sample metrics.'}
              </p>
            </Card>
          )}

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your learning activities</h2>
                <p className="mt-1 text-xs text-slate-500">{plan?.current_assessment?.message}</p>
              </div>
              <span className="text-sm font-semibold text-slate-600">
                {plan?.completion?.completed || 0} / {plan?.completion?.total || 0} complete
              </span>
            </div>
            <ProgressBar
              value={plan?.completion?.total ? (plan.completion.completed / plan.completion.total) * 100 : 0}
              variant="green"
              size="lg"
            />
            {plan?.activities?.length ? (
              <div className="space-y-3">
                {plan.activities.map((activity) => (
                  <article key={activity.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={`${activity.completed ? 'Mark incomplete' : 'Mark complete'}: ${activity.skill}`}
                        disabled={Boolean(updating)}
                        onClick={() => toggleActivity(activity)}
                        className="mt-0.5 text-emerald-700 disabled:opacity-50"
                      >
                        {updating === activity.id ? <span className="block h-5 w-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" /> : activity.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">Priority {activity.priority} · {activity.skill}</span>
                          {activity.completed && <span className="text-xs font-semibold text-emerald-700">Completed</span>}
                        </div>
                        <p className="mt-2 text-sm text-slate-800">{activity.activity}</p>
                        <p className="mt-1 text-xs text-slate-500"><strong>Measurable goal:</strong> {activity.measurable_goal}</p>
                        {activity.recommended_topic && <p className="mt-1 text-xs text-slate-500"><strong>Practice topic:</strong> {activity.recommended_topic}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Your plan will appear after a completed debate provides scored turns. Existing activity completion is kept when the plan adapts.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
