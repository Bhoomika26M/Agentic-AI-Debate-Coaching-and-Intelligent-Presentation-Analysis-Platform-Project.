import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bot, CheckCircle2, Flag, Mic, MicOff, Send, Swords, User } from 'lucide-react';
import { debateApi } from '../../api/debateApi';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';

const errorMessage = (error) => (
  error.response?.data?.detail || 'The request could not be completed. Check your connection and try again.'
);

const makeTurnId = () => (
  window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    })
);

export const LiveDebateArenaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topicInput, setTopicInput] = useState('');
  const [position, setPosition] = useState('AFFIRMATIVE');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedSessionId, setLoadedSessionId] = useState(null);
  const [error, setError] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const pendingTurnIdRef = useRef(null);

  useEffect(() => {
    let active = true;
    debateApi.getSessions()
      .then((data) => {
        if (active) setSessions(Array.isArray(data) ? data : data.results || []);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      });
    if (id) {
      debateApi.getSessionDetail(id)
        .then((data) => {
          if (!active) return;
          setSession(data);
          setTopicInput(data.topic_title || data.custom_topic_title || '');
          setPosition(data.user_stance);
          setDifficulty(data.difficulty || 'INTERMEDIATE');
          setEvaluation(data.evaluation?.scores ? data.evaluation : null);
          const userTurns = (data.turns || []).filter((turn) => turn.speaker === 'USER' && turn.analysis);
          setLastFeedback(userTurns[userTurns.length - 1]?.analysis || null);
        })
        .catch((requestError) => {
          if (active) setError(errorMessage(requestError));
        })
        .finally(() => {
          if (active) setLoadedSessionId(id);
        });
    } else {
      setSession(null);
      setLoadedSessionId(null);
    }
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.turns, busy]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;
    setSpeechSupported(true);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join(' ');
      setInput((current) => `${current}${current ? ' ' : ''}${text}`.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  const startDebate = async (event) => {
    event.preventDefault();
    if (busy || !topicInput.trim()) return;
    setBusy(true);
    setError('');
    try {
      const created = await debateApi.createSession({
        custom_topic_title: topicInput.trim(),
        user_stance: position,
        difficulty,
        format: 'OXFORD',
      });
      navigate(`/debates/${created.id}`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const sendTurn = async (event) => {
    event.preventDefault();
    if (!session || !input.trim() || busy || session.status !== 'IN_PROGRESS') return;
    setBusy(true);
    setError('');
    const message = input.trim();
    pendingTurnIdRef.current ||= makeTurnId();
    setInput('');
    try {
      const result = await debateApi.submitTurn(session.id, message, pendingTurnIdRef.current);
      const updated = await debateApi.getSessionDetail(session.id);
      setSession(updated);
      setLastFeedback(result);
      pendingTurnIdRef.current = null;
    } catch (requestError) {
      setInput((current) => current || message);
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const finishDebate = async () => {
    if (!session || busy || session.status !== 'IN_PROGRESS') return;
    setBusy(true);
    setError('');
    try {
      const completed = await debateApi.concludeSession(session.id);
      setSession(completed);
      setEvaluation(completed.evaluation);
      setSessions((items) => [completed, ...items.filter((item) => item.id !== completed.id)]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const turns = session?.turns || [];
  if (id && loadedSessionId !== id) {
    return <p className="mx-auto max-w-5xl p-8 text-center text-slate-500">Loading saved debate…</p>;
  }

  if (!id || !session) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">AI Debate Arena</h1>
          <p className="mt-1 text-sm text-slate-500">Start a saved, multi-turn debate against an opponent arguing the opposite side.</p>
        </header>
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <Card>
          <form onSubmit={startDebate} className="space-y-5">
            <label htmlFor="debate-topic" className="block text-sm font-semibold text-slate-700">
              Debate topic
              <input
                id="debate-topic"
                maxLength={500}
                required
                value={topicInput}
                onChange={(event) => setTopicInput(event.target.value)}
                placeholder="For example: Schools should limit phone use during class"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Your position
                <select value={position} onChange={(event) => setPosition(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal">
                  <option value="AFFIRMATIVE">For the resolution</option>
                  <option value="NEGATIVE">Against the resolution</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Difficulty
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal">
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-slate-500">Gemini is used when configured; otherwise responses are marked as a rule-based baseline. Neither mode verifies external evidence.</p>
            <Button type="submit" loading={busy} disabled={busy || !topicInput.trim()} icon={Swords}>Start Debate</Button>
          </form>
        </Card>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Your debate history</h2>
          {sessions.length === 0 ? <p className="text-sm text-slate-500">No saved debates yet.</p> : sessions.map((item) => (
            <Link key={item.id} to={`/debates/${item.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-slate-800">{item.topic_title || item.custom_topic_title}</span>
                <Badge variant={item.status === 'COMPLETED' ? 'green' : 'blue'}>{item.status === 'COMPLETED' ? 'Completed' : 'In progress'}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.user_stance} · {item.difficulty || 'INTERMEDIATE'} · {item.overall_score == null ? 'Not evaluated' : `${item.overall_score}/100`}</p>
            </Link>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-6xl flex-col gap-4 pb-4">
      <Card padding="sm" className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex flex-wrap gap-2">
              <Badge variant="blue">{session.difficulty || 'INTERMEDIATE'}</Badge>
              <Badge variant="green">You: {session.user_stance}</Badge>
              <Badge variant="purple">AI: {session.ai_stance}</Badge>
              <Badge variant={session.status === 'IN_PROGRESS' ? 'amber' : 'gray'}>{session.status}</Badge>
            </div>
            <h1 className="text-lg font-bold text-slate-900">{session.topic_title || session.custom_topic_title}</h1>
            <p className="mt-1 text-xs text-slate-500">Saved turns and feedback are based on your actual debate. Scores do not independently verify cited facts.</p>
          </div>
          {session.status === 'IN_PROGRESS' && <Button variant="outline" size="sm" disabled={busy} icon={Flag} onClick={finishDebate}>Finish &amp; Evaluate</Button>}
        </div>
      </Card>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <Card padding="none" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {turns.map((turn) => {
            const isUser = turn.speaker === 'USER';
            return (
              <div key={turn.id} className={`flex max-w-3xl gap-3 ${isUser ? '' : 'ml-auto flex-row-reverse'}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isUser ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <article className={`min-w-0 rounded-2xl border p-4 text-sm leading-relaxed ${isUser ? 'rounded-tl-none border-blue-100 bg-blue-50/70' : 'rounded-tr-none border-slate-200 bg-white'}`}>
                  <header className="mb-1 text-xs font-semibold text-slate-500">{isUser ? 'Your argument' : 'AI opponent'} · turn {turn.turn_number}</header>
                  <p className="whitespace-pre-wrap text-slate-800">{turn.transcript}</p>
                </article>
              </div>
            );
          })}
          {busy && session.status === 'IN_PROGRESS' && <p className="text-right text-sm text-slate-500">Generating and saving the opponent response…</p>}
          <div ref={endRef} />
        </div>
        {session.status === 'IN_PROGRESS' && (
          <form onSubmit={sendTurn} className="flex items-end gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
            <label htmlFor="debate-argument" className="sr-only">Your next debate argument</label>
            <textarea
              id="debate-argument"
              rows={3}
              maxLength={10000}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form.requestSubmit();
                }
              }}
              placeholder="Respond to the opponent and support your point…"
              className="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            {speechSupported && (
              <button type="button" aria-label={listening ? 'Stop voice input' : 'Start voice input'} onClick={() => {
                if (listening) recognitionRef.current.stop();
                else recognitionRef.current.start();
                setListening(!listening);
              }} className="rounded-lg p-3 text-slate-600 hover:bg-slate-200">
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
            <Button type="submit" disabled={busy || !input.trim()} loading={busy} icon={Send}>Send</Button>
          </form>
        )}
      </Card>

      {lastFeedback && (
        <Card padding="sm" className="max-h-64 shrink-0 space-y-2 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Response coaching</h2>
            <Badge variant={lastFeedback.response_method === 'gemini' ? 'green' : 'amber'}>
              {lastFeedback.response_method === 'gemini' ? 'Gemini' : 'Rule-based baseline'}
            </Badge>
          </div>
          {[
            ['Counterargument', lastFeedback.strongest_counterargument],
            ['Reasoning response', lastFeedback.logical_rebuttal],
            ['Alternative perspective', lastFeedback.alternative_perspective],
            ['Evidence guidance', lastFeedback.evidence_guidance],
            ['Question', lastFeedback.follow_up_question],
          ].filter(([, value]) => value).map(([label, value]) => (
            <p key={label} className="text-xs text-slate-700"><strong>{label}:</strong> {value}</p>
          ))}
          {!!lastFeedback.next_response_suggestions?.length && (
            <ul className="list-inside list-disc text-xs text-slate-600">
              {lastFeedback.next_response_suggestions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
            </ul>
          )}
        </Card>
      )}
      {evaluation && (
        <Card className="max-h-80 shrink-0 space-y-3 overflow-y-auto">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Debate evaluation</h2>
          {evaluation.overall_score == null ? (
            <p className="text-sm text-slate-600">{evaluation.limitations || 'No scored argument turns were available.'}</p>
          ) : (
            <>
              <p className="text-xl font-extrabold text-blue-900">{evaluation.overall_score}/100</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(evaluation.scores || {}).map(([key, value]) => (
                  <div key={key} className="text-xs text-slate-600">
                    <div className="mb-1 flex justify-between"><span className="capitalize">{key}</span><strong>{value ?? '—'}</strong></div>
                    <ProgressBar value={value || 0} size="sm" variant="blue" />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                <span><strong>Strengths:</strong> {evaluation.strengths?.join(' ') || 'Not identified.'}</span>
                <span><strong>Focus:</strong> {evaluation.weaknesses?.join(' ') || 'No priority weaknesses identified.'}</span>
              </div>
              {evaluation.limitations && <p className="text-xs text-slate-500">{evaluation.limitations}</p>}
            </>
          )}
        </Card>
      )}
      {lastFeedback?.analysis?.fallacies?.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4" /> Possible fallacies are heuristic flags; review the excerpts and explanations before relying on them.</p>
      )}
    </div>
  );
};
