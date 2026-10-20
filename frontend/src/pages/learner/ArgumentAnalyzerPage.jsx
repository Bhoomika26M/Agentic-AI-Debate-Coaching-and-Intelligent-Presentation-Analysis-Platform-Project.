import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
import { argumentApi } from '../../api/argumentApi';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';

const scoreDimensions = [
  ['clarity', 'Clarity', 'Organization and ease of understanding'],
  ['relevance', 'Relevance', 'Connection to the topic or context'],
  ['evidence', 'Evidence strength', 'Support from examples, data, or sources'],
  ['logic', 'Logical consistency', 'How well the reasoning supports the claim'],
  ['persuasiveness', 'Persuasiveness', 'Overall effectiveness of the case'],
];

export const ArgumentAnalyzerPage = () => {
  const [argumentText, setArgumentText] = useState('');
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!argumentText.trim()) {
      setError('Enter an argument before analyzing.');
      return;
    }
    setError('');
    setIsAnalyzing(true);
    try {
      const data = await argumentApi.analyzeArgument(argumentText.trim(), context.trim());
      setResult(data);
    } catch (requestError) {
      setResult(null);
      setError(
        requestError.response?.data?.detail
          || 'The argument could not be analyzed. Check your connection and try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistory = async () => {
    setError('');
    setIsLoadingHistory(true);
    try {
      const data = await argumentApi.getHistory();
      setHistory(Array.isArray(data) ? data : data.results || []);
    } catch (requestError) {
      setError(
        requestError.response?.status === 401
          ? 'Sign in to view saved analysis reports.'
          : requestError.response?.data?.detail || 'Analysis history could not be loaded.',
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadReport = async (id) => {
    setError('');
    try {
      setResult(await argumentApi.getDetail(id));
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'That saved report could not be loaded.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Argument Analysis &amp; Fallacy Scanner
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the structure, support, and reasoning in an argument. Results are heuristic coaching feedback,
          not a fact check.
        </p>
      </header>

      <Card>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label htmlFor="argument-text" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Your argument
            </label>
            <textarea
              id="argument-text"
              rows={5}
              maxLength={10000}
              value={argumentText}
              onChange={(event) => setArgumentText(event.target.value)}
              placeholder="Paste or write your argument here..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 outline-none transition-all hover:bg-slate-50/80 focus:border-[#1E3A8A] focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="argument-context" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Topic or debate context (optional)
            </label>
            <input
              id="argument-context"
              maxLength={2000}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="What question or resolution is this argument addressing?"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-[#1E3A8A] focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center">
            <span className="text-xs font-medium text-slate-400">
              {argumentText.trim() ? argumentText.trim().split(/\s+/).length : 0} words
            </span>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isAnalyzing}
              disabled={isAnalyzing || !argumentText.trim()}
              icon={Sparkles}
              iconPosition="left"
            >
              Analyze Argument
            </Button>
          </div>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </Card>

      <section aria-labelledby="history-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="history-heading" className="text-lg font-bold tracking-tight text-[#0F172A]">
            Saved analysis history
          </h3>
          <Button type="button" variant="secondary" loading={isLoadingHistory} onClick={loadHistory}>
            Load history
          </Button>
        </div>
        {history.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => loadReport(item.id)}
                className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="block truncate">{item.raw_text}</span>
                <span className="mt-1 block text-slate-500">
                  Score {item.scores?.overall ?? '--'} · {new Date(item.created_at).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {result && (
        <div className="animate-in space-y-8 fade-in duration-200">
          <section className="space-y-4" aria-labelledby="scores-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="scores-heading" className="text-lg font-bold tracking-tight text-[#0F172A]">
                Evaluation summary
              </h3>
              <div className="flex items-baseline gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1 text-[#172554]">
                <span className="text-xs font-medium">Overall score:</span>
                <span className="text-xl font-extrabold">{result.scores?.overall ?? '--'}</span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scoreDimensions.map(([key, label, description]) => {
                const score = result.scores?.[key] ?? 0;
                return (
                  <Card key={key} padding="sm" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                      <span className="text-sm font-bold text-[#172554]">{score}/100</span>
                    </div>
                    <ProgressBar
                      value={score}
                      max={100}
                      variant={score >= 80 ? 'green' : score >= 60 ? 'blue' : 'amber'}
                      size="sm"
                    />
                    <p className="text-[11px] text-slate-500">{description}</p>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              {result.analysis_method === 'gemini'
                ? 'Analyzed with Gemini. Overall score uses the configured weighted formula.'
                : 'Rule-based baseline: pattern matching can miss context and does not verify factual claims. Overall score uses the configured weighted formula.'}
            </p>
          </section>

          <Card className="space-y-3">
            <h3 className="font-bold text-slate-900">Argument structure</h3>
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Original argument</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{result.raw_text || argumentText}</p>
            </div>
            <p className="text-sm"><strong>Main claim:</strong> {result.toulmin?.claim || 'Not confidently identified.'}</p>
            {result.toulmin?.grounds && (
              <p className="text-sm"><strong>Grounds:</strong> {result.toulmin.grounds}</p>
            )}
            {result.toulmin?.warrant && (
              <p className="text-sm"><strong>Reasoning link:</strong> {result.toulmin.warrant}</p>
            )}
            {result.supporting_claims?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700">Supporting points</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {result.supporting_claims.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
                </ul>
              </div>
            )}
            {result.evidence?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700">Evidence and examples</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {result.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              </div>
            )}
          </Card>

          <section className="space-y-3" aria-labelledby="fallacies-heading">
            <div className="flex items-center justify-between">
              <h3 id="fallacies-heading" className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Possible logical fallacies
              </h3>
              <Badge variant="amber" size="sm">{result.fallacies?.length || 0} found</Badge>
            </div>
            {result.fallacies?.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {result.fallacies.map((fallacy, index) => (
                  <Card key={`${fallacy.type}-${index}`} className="space-y-3 border-amber-200/90 bg-amber-50/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-amber-900">{fallacy.type}</span>
                      <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {fallacy.confidence}% confidence
                      </span>
                    </div>
                    <blockquote className="border-l-2 border-amber-300 pl-3 text-xs italic text-slate-600">
                      “{fallacy.excerpt}”
                    </blockquote>
                    <p className="text-xs leading-relaxed text-slate-700">{fallacy.explanation}</p>
                    <p className="border-t border-amber-200/60 pt-2 text-xs leading-relaxed text-emerald-800">
                      <strong>Suggested correction:</strong> {fallacy.correction}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50/50 text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span className="text-sm">
                  No clear supported instance of the eight fallacy types was identified. This does not prove the argument is fallacy-free.
                </span>
              </Card>
            )}
          </section>

          {(result.reasoning_weaknesses?.length > 0 || result.recommendations?.length > 0) && (
            <Card className="space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-900">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                Reasoning weaknesses and recommendations
              </h3>
              {result.reasoning_weaknesses?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {result.reasoning_weaknesses.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              )}
              {result.recommendations?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {result.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              )}
            </Card>
          )}

          {result.improved_argument && (
            <Card className="space-y-2 border-blue-100 bg-blue-50/30">
              <h3 className="font-bold text-slate-900">Possible improved version</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{result.improved_argument}</p>
            </Card>
          )}
          {result.counterarguments?.length > 0 && (
            <Card className="space-y-3">
              <h3 className="font-bold text-slate-900">Possible counterarguments</h3>
              {result.counterarguments.map((item, index) => (
                <div key={`${item.perspective}-${index}`} className="rounded-lg bg-purple-50/60 p-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-purple-800">{item.perspective}</h4>
                  <p className="mt-1 text-sm text-slate-700">{item.claim}</p>
                  {item.counter_evidence && (
                    <p className="mt-1 text-xs text-slate-600">{item.counter_evidence}</p>
                  )}
                </div>
              ))}
            </Card>
          )}
          {result.feedback && (
            <Card>
              <h3 className="mb-2 font-bold text-slate-900">Overall feedback</h3>
              <p className="text-sm leading-relaxed text-slate-700">{result.feedback}</p>
            </Card>
          )}
          {result.id && <p className="text-xs text-slate-500">This report was saved to your account.</p>}
        </div>
      )}
    </div>
  );
};
