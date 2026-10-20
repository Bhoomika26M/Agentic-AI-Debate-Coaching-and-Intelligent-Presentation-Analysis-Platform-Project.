import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Circle, RefreshCw, Target, Zap } from 'lucide-react';
import { coachingApi } from '../../api/coachingApi';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';

export const CoachingDrillsPage = () => {
  const [plan, setPlan] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [drills, setDrills] = useState([]);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [submission, setSubmission] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [nextPlan, nextRecommendations, nextDrills] = await Promise.all([
        coachingApi.getLearningPlan(),
        coachingApi.getRecommendations(),
        coachingApi.getDrills(),
      ]);
      setPlan(nextPlan);
      setRecommendations(nextRecommendations);
      setDrills(nextDrills);
      setSelectedDrill((current) => nextDrills.find((item) => item.id === current?.id) || nextDrills[0] || null);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load your coaching plan. Please try again.');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refreshPlan = async () => {
    setUpdating('refresh');
    setError('');
    try {
      const nextPlan = await coachingApi.refreshLearningPlan();
      setPlan(nextPlan);
      setRecommendations(await coachingApi.getRecommendations());
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
      setPlan(await coachingApi.updateLearningActivity(activity.id, !activity.completed));
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'The activity status could not be updated.');
    } finally {
      setUpdating(null);
    }
  };

  const submitDrill = async (event) => {
    event.preventDefault();
    if (!selectedDrill || !submission.trim() || updating) return;
    setUpdating(`drill-${selectedDrill.id}`);
    setError('');
    setFeedback(null);
    try {
      setFeedback(await coachingApi.submitDrill(selectedDrill.id, submission.trim()));
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'The drill could not be evaluated. Please retry.');
    } finally {
      setUpdating(null);
    }
  };

  const completion = plan?.completion || { completed: 0, total: 0 };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6 text-emerald-700" /> Coaching &amp; Learning Plan</h1>
          <p className="mt-1 text-sm text-slate-500">Your plan adapts to saved debate scores and reasoning feedback. Track completed practice here.</p>
        </div>
        <Button variant="outline" icon={RefreshCw} loading={updating === 'refresh'} disabled={Boolean(updating)} onClick={refreshPlan}>
          Refresh from performance
        </Button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {!plan ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading your saved learning plan…</p>
      ) : (
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
                  {recommendations.strengths?.length
                    ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{recommendations.strengths.map((item) => <li key={item.skill}>{item.skill}: {item.score}/100</li>)}</ul>
                    : <p className="mt-2 text-sm text-slate-500">No scored dimensions yet.</p>}
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">Focus areas</h3>
                  {recommendations.weaknesses?.length
                    ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{recommendations.weaknesses.map((item) => <li key={item.skill}>{item.skill}: {item.score}/100</li>)}</ul>
                    : <p className="mt-2 text-sm text-slate-500">No priority area identified yet.</p>}
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
              <h2 className="font-bold text-slate-900">Build your performance-based plan</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {recommendations?.rationale || 'Complete a debate with at least one argument turn to generate recommendations from your own performance.'}
              </p>
            </Card>
          )}

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your learning activities</h2>
                <p className="mt-1 text-xs text-slate-500">{plan.current_assessment?.message}</p>
              </div>
              <span className="text-sm font-semibold text-slate-600">{completion.completed} / {completion.total} complete</span>
            </div>
            <ProgressBar value={completion.total ? (completion.completed / completion.total) * 100 : 0} variant="green" size="lg" />
            {plan.activities?.length ? (
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
                        {updating === activity.id
                          ? <span className="block h-5 w-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                          : activity.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Priority {activity.priority} · {activity.skill}</p>
                        <p className="mt-2 text-sm text-slate-800">{activity.activity}</p>
                        <p className="mt-1 text-xs text-slate-500"><strong>Measurable goal:</strong> {activity.measurable_goal}</p>
                        {activity.recommended_topic && <p className="mt-1 text-xs text-slate-500"><strong>Practice topic:</strong> {activity.recommended_topic}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No scored debate history yet. Your plan will be created after you complete a debate with an analyzed turn.</p>
            )}
          </Card>

          {drills.length > 0 && (
            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Practice drills</h2>
                <p className="mt-1 text-sm text-slate-500">Submit a response to receive a rubric-based critique. The offline baseline is heuristic.</p>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Choose a drill
                <select
                  value={selectedDrill?.id || ''}
                  onChange={(event) => {
                    setSelectedDrill(drills.find((item) => item.id === Number(event.target.value)) || null);
                    setFeedback(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
                >
                  {drills.map((drill) => <option key={drill.id} value={drill.id}>{drill.type}: {drill.title}</option>)}
                </select>
              </label>
              {selectedDrill && (
                <form onSubmit={submitDrill} className="space-y-3">
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{selectedDrill.scenario}</p>
                  <p className="text-sm font-medium text-slate-800">{selectedDrill.task}</p>
                  <label htmlFor="drill-response" className="sr-only">Your drill response</label>
                  <textarea
                    id="drill-response"
                    rows={4}
                    maxLength={10000}
                    value={submission}
                    onChange={(event) => setSubmission(event.target.value)}
                    placeholder="Write your response..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" icon={Zap} loading={updating === `drill-${selectedDrill.id}`} disabled={Boolean(updating) || !submission.trim()}>
                      Submit for critique
                    </Button>
                  </div>
                </form>
              )}
              {feedback && (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-emerald-900">Drill feedback</h3>
                    <span className="text-lg font-extrabold text-emerald-800">{feedback.score}/100</span>
                  </div>
                  <p className="text-xs text-slate-500">Method: {feedback.analysis_method === 'gemini' ? 'Gemini' : 'Rule-based heuristic'}</p>
                  {feedback.strengths?.map((item) => <p key={item} className="text-sm text-slate-700">Strength: {item}</p>)}
                  {feedback.flaws?.map((item) => <p key={item} className="text-sm text-slate-700">Improve: {item}</p>)}
                  <p className="text-sm text-slate-700"><strong>Coach tip:</strong> {feedback.coachingTip}</p>
                  <p className="text-sm text-slate-700"><strong>Possible revision:</strong> {feedback.improved_version}</p>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};
