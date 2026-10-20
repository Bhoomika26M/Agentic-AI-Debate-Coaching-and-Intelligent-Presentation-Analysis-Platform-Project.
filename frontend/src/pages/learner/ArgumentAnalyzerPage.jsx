import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { argumentApi } from '../../api/argumentApi';
import { debateApi } from '../../api/debateApi';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';

const scoreItems = [
  ['Clarity', 'clarity', 'How clearly the argument is expressed'],
  ['Relevance', 'relevance', 'How well the points address the claim and context'],
  ['Evidence strength', 'evidence', 'The explicit support and evidence provided'],
  ['Logical consistency', 'logic', 'How well the reasoning holds together'],
  ['Persuasiveness', 'persuasiveness', 'The combined effect of the argument'],
];

const errorMessage = (error) => {
  const detail = error.response?.data?.detail;
  if (detail) return detail;
  const fieldError = error.response?.data?.argument_text;
  if (Array.isArray(fieldError)) return fieldError[0];
  return 'The analysis could not be completed. Check your connection and try again.';
};

export const ArgumentAnalyzerPage = () => {
  const [argumentText, setArgumentText] = useState('');
  const [context, setContext] = useState('');
  const [debateSessionId, setDebateSessionId] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [debateSessions, setDebateSessions] = useState([]);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    let active = true;
    argumentApi.getHistory()
      .then((data) => {
        if (active) setHistory(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(() => {
        if (active) setHistoryError('Saved report history is currently unavailable.');
      });
    debateApi.getSessions()
      .then((data) => {
        if (active) setDebateSessions(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(() => {
        if (active) setSessionError('Debate sessions could not be loaded; reports can still be analyzed without one.');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!argumentText.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const data = await argumentApi.analyzeArgument(
        argumentText.trim(),
        context.trim(),
        debateSessionId,
      );
      setResult(data);
      if (data.id) setHistory((items) => [data, ...items.filter((item) => item.id !== data.id)]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openReport = async (id) => {
    setError('');
    try {
      const report = await argumentApi.getDetail(id);
      setResult(report);
      setArgumentText(report.raw_text);
      setContext(report.context || '');
      setDebateSessionId(report.debate_session || '');
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const scores = result?.scores || {};
  const fallacies = result?.fallacies || [];
  const isRuleBased = result?.analysis_method === 'rule_based';

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Argument Analysis &amp; Fallacy Detection
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review the claim, supporting points, evidence, reasoning, and possible logical fallacies in your argument.
        </p>
      </header>

      <Card>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label htmlFor="argument-text" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Argument
            </label>
            <textarea
              id="argument-text"
              rows={6}
              maxLength={10000}
              value={argumentText}
              onChange={(event) => setArgumentText(event.target.value)}
              placeholder="Enter your debate argument, including any supporting evidence..."
              required
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1E3A8A] focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="argument-context" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Debate context <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="argument-context"
              maxLength={2000}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Topic or resolution to help assess relevance"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1E3A8A] focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="debate-session" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Debate session <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <select
              id="debate-session"
              value={debateSessionId}
              onChange={(event) => setDebateSessionId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Do not attach to a debate session</option>
              {debateSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.topic_title || session.custom_topic_title || 'Debate'} · {new Date(session.started_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            {sessionError && <p className="mt-1 text-xs text-amber-700">{sessionError}</p>}
          </div>
          <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center">
            <span className="text-xs font-medium text-slate-400">
              {argumentText.trim().split(/\s+/).filter(Boolean).length} words · {argumentText.length}/10,000 characters
            </span>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isAnalyzing}
              disabled={isAnalyzing || !argumentText.trim()}
              icon={Sparkles}
            >
              {isAnalyzing ? 'Analyzing…' : 'Analyze Argument'}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Analysis report</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {isRuleBased
                    ? 'Transparent rule-based baseline · heuristic results may miss context-dependent reasoning.'
                    : 'Gemini-assisted analysis · generated conclusions should be checked against the original argument.'}
                </p>
              </div>
              <Badge variant={isRuleBased ? 'amber' : 'green'} size="sm">
                {isRuleBased ? 'Rule-based baseline' : 'Gemini analysis'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 border-t border-slate-100 pt-4">
              <span className="text-sm font-medium text-slate-600">Overall argument quality</span>
              <strong className="text-3xl font-extrabold text-[#172554]">{scores.overall ?? '—'}</strong>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
            <ProgressBar value={scores.overall || 0} variant="blue" size="lg" />
            <p className="text-sm leading-relaxed text-slate-700">{result.feedback}</p>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-slate-900">Original argument</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {result.raw_text || argumentText}
            </p>
          </Card>

          <section aria-labelledby="score-heading" className="space-y-3">
            <h2 id="score-heading" className="text-lg font-bold text-slate-900">Score breakdown</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scoreItems.map(([label, key, description]) => (
                <Card key={key} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
                    <span className="text-xl font-bold text-[#172554]">{scores[key] ?? '—'}<span className="text-xs font-medium text-slate-400"> / 100</span></span>
                  </div>
                  <ProgressBar value={scores[key] || 0} variant="navy" />
                  <p className="text-xs text-slate-500">{description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="structure-heading" className="space-y-3">
            <h2 id="structure-heading" className="text-lg font-bold text-slate-900">Argument structure</h2>
            <Card className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Main claim</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{result.toulmin?.claim || 'No distinct claim could be isolated.'}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supporting points</h3>
                {result.supporting_claims?.length ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {result.supporting_claims.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
                  </ul>
                ) : <p className="mt-1 text-sm text-slate-500">No separate supporting points were identified.</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence and examples</h3>
                {result.evidence?.length ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {result.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                  </ul>
                ) : <p className="mt-1 text-sm text-slate-500">No explicit evidence or example was identified.</p>}
              </div>
            </Card>
          </section>

          <section aria-labelledby="fallacy-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="fallacy-heading" className="text-lg font-bold text-slate-900">Possible logical fallacies</h2>
              <Badge variant={fallacies.length ? 'amber' : 'green'} size="sm">{fallacies.length} detected</Badge>
            </div>
            {fallacies.length === 0 ? (
              <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50/50 text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm">
                  No clear supported fallacy was identified. This is an uncertain result, not proof that the argument is fallacy-free.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fallacies.map((fallacy, index) => (
                  <Card key={`${fallacy.type}-${index}`} className="space-y-3 border-amber-200 bg-amber-50/30">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-amber-950">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        {fallacy.type}
                      </h3>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        {fallacy.confidence}% confidence
                      </span>
                    </div>
                    <blockquote className="border-l-2 border-amber-300 pl-3 text-sm italic leading-relaxed text-slate-700">
                      “{fallacy.excerpt}”
                    </blockquote>
                    <p className="text-sm leading-relaxed text-slate-700">{fallacy.explanation}</p>
                    <p className="border-t border-amber-200 pt-3 text-sm leading-relaxed text-emerald-800">
                      <strong>Correction:</strong> {fallacy.correction}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Reasoning weaknesses
              </h2>
              {result.reasoning_weaknesses?.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                  {result.reasoning_weaknesses.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-500">No additional reasoning weakness was identified.</p>}
            </Card>
            <Card>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Lightbulb className="h-4 w-4 text-purple-600" /> Recommendations
              </h2>
              {result.recommendations?.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                  {result.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-500">No additional recommendations are available.</p>}
            </Card>
          </div>

          <Card className="border-blue-100 bg-blue-50/30">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileText className="h-4 w-4 text-blue-700" /> A more careful version
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {result.improved_argument || 'No improved version was generated.'}
            </p>
          </Card>
        </div>
      )}

      <section aria-labelledby="history-heading" className="space-y-3">
        <h2 id="history-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Clock3 className="h-5 w-5 text-slate-500" /> Your saved analyses
        </h2>
        {historyError && <p className="text-sm text-slate-500">{historyError}</p>}
        {history.length === 0 && !historyError ? (
          <p className="text-sm text-slate-500">Your completed analyses will appear here.</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 8).map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => openReport(report.id)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <span className="line-clamp-2 text-sm text-slate-700">{report.raw_text}</span>
                <span className="shrink-0 text-sm font-bold text-[#172554]">
                  {report.scores?.overall ?? report.overall_score}/100
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
