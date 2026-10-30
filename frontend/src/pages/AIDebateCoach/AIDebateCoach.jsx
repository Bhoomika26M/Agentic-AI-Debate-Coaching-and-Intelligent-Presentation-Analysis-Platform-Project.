import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Send,
  Clock,
  Award,
  Download,
  RotateCcw,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PRESET_TOPICS = [
  "This House would replace human judges with artificial intelligence in commercial civil disputes.",
  "Resolved: National governments should fund universal basic income through an automation dividend.",
  "This House would mandate public inspection of social media recommendation codebases.",
  "Resolved: Standardized tests do more harm than good in university admissions.",
  "This House believes algorithmic content feeds undermine democratic elections."
];

export default function AIDebateCoach() {
  const { user } = useAuth();
  const [inDebate, setInDebate] = useState(false);
  const [activeDebate, setActiveDebate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputTurn, setInputTurn] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingDebate, setLoadingDebate] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [aiEngineStatus, setAiEngineStatus] = useState(null);

  // Setup form
  const [title, setTitle] = useState("AI Adjudication & Civil Law");
  const [topic, setTopic] = useState(PRESET_TOPICS[0]);
  const [userPosition, setUserPosition] = useState("For");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [maxRounds, setMaxRounds] = useState(4);

  const messagesEndRef = useRef(null);

  // Restore debate from sessionStorage if active
  useEffect(() => {
    const restoreSession = async () => {
      const savedDebateId = sessionStorage.getItem('justitalk_active_debate_id');
      if (savedDebateId) {
        try {
          const res = await api.get(`/debates/${savedDebateId}`);
          if (res.data) {
            setActiveDebate(res.data);
            setMessages(res.data.messages || []);
            setInDebate(true);
            if (res.data.status === 'Completed' && res.data.evaluation) {
              setEvaluation(res.data.evaluation);
            }
          }
        } catch (err) {
          console.log('No active cached session found or session expired');
          sessionStorage.removeItem('justitalk_active_debate_id');
        }
      }
    };

    const fetchEngineStatus = async () => {
      try {
        const res = await api.get('/system/ai-status');
        setAiEngineStatus(res.data);
      } catch (e) {
        // Fallback default
      }
    };

    restoreSession();
    fetchEngineStatus();
  }, []);

  // Timer
  useEffect(() => {
    let timer;
    if (inDebate && activeDebate && activeDebate.status !== 'Completed') {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [inDebate, activeDebate]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleStartDebate = async (e) => {
    e.preventDefault();
    setLoadingDebate(true);
    try {
      const res = await api.post('/debates/', {
        title: title || 'Debate Match',
        topic,
        format: 'AI Debate Simulation',
        difficulty,
        duration_minutes: 15,
        user_position: userPosition,
        max_rounds: Number(maxRounds)
      });
      setActiveDebate(res.data);
      setMessages(res.data.messages || []);
      setInDebate(true);
      setSecondsElapsed(0);
      setEvaluation(null);
      sessionStorage.setItem('justitalk_active_debate_id', res.data.id);
    } catch (err) {
      console.error('Failed to start debate session:', err);
      alert('Could not start debate session. Please ensure backend is running.');
    } finally {
      setLoadingDebate(false);
    }
  };

  const handleSendTurn = async (e) => {
    e.preventDefault();
    if (!inputTurn.trim() || sending) return;

    const userText = inputTurn;
    setInputTurn('');
    setSending(true);

    try {
      const res = await api.post(`/debates/${activeDebate.id}/turn`, {
        content: userText
      });
      setActiveDebate(res.data);
      setMessages(res.data.messages || []);

      if (res.data.status === 'Completed') {
        handleEndAndEvaluate();
      }
    } catch (err) {
      console.error('Error submitting debate turn:', err);
      alert('Failed to submit turn. Please retry.');
    } finally {
      setSending(false);
    }
  };

  const handleEndAndEvaluate = async () => {
    if (!activeDebate) return;
    try {
      const res = await api.post(`/debates/${activeDebate.id}/evaluate`);
      setEvaluation(res.data);
      setShowEvalModal(true);
    } catch (err) {
      console.error('Failed to evaluate debate:', err);
      alert('Evaluation could not be finalized.');
    }
  };

  const handleResetDebate = () => {
    sessionStorage.removeItem('justitalk_active_debate_id');
    setInDebate(false);
    setActiveDebate(null);
    setMessages([]);
    setEvaluation(null);
    setShowEvalModal(false);
  };

  const handleDownloadPdf = async () => {
    if (!activeDebate) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/debates/${activeDebate.id}/export/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `debate_${activeDebate.id}_dossier.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download debate dossier PDF:', err);
      alert('Could not download debate dossier PDF. Please check authorization.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {!inDebate ? (
        /* SETUP DEBATE SCREEN */
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card space-y-8">
          <div className="border-b border-gray-100 pb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1E242B]">
                  Interactive AI Debate Simulator
                </h2>
                <p className="text-xs text-gray-500">
                  Select your debate topic, stance, and difficulty to spar against JustiTalk's agentic AI opponent.
                </p>
              </div>
            </div>

            {aiEngineStatus && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#FAF8F3] border border-[#ECE7DE] text-[11px] font-semibold text-gray-700">
                <span className={`w-2 h-2 rounded-full ${aiEngineStatus.mode === 'openai_gpt4o' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>AI Engine: {aiEngineStatus.mode === 'openai_gpt4o' ? 'OpenAI GPT-4o Online' : 'Deterministic Heuristic Mode'}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleStartDebate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Debate Motion / Topic
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border border-[#ECE7DE] focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19] bg-[#FCFBF8]"
                placeholder="Enter a motion or resolution (e.g. This House would...)"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[11px] font-semibold text-gray-400 self-center">Preset Motions:</span>
                {PRESET_TOPICS.map((t, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setTopic(t)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] text-gray-700 transition-colors"
                  >
                    Motion {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Position */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Your Stance
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserPosition("For")}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                      userPosition === "For"
                        ? "bg-[#FCF6E5] border-[#D49B19] text-[#B87E0E] shadow-xs"
                        : "bg-white border-[#ECE7DE] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    FOR (Affirmative)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserPosition("Against")}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                      userPosition === "Against"
                        ? "bg-[#181F25] border-[#181F25] text-white shadow-xs"
                        : "bg-white border-[#ECE7DE] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    AGAINST (Negative)
                  </button>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  AI Difficulty Tier
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
                >
                  <option value="Novice">Novice (Foundational logic & pacing)</option>
                  <option value="Intermediate">Intermediate (Structured collegiate)</option>
                  <option value="Advanced">Advanced (Aggressive cross-examination)</option>
                  <option value="Master">Master (Championship-level synthesis)</option>
                </select>
              </div>

              {/* Rounds */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Debate Length (Rounds)
                </label>
                <select
                  value={maxRounds}
                  onChange={(e) => setMaxRounds(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
                >
                  <option value="2">2 Rounds (Express Sprint)</option>
                  <option value="3">3 Rounds (Standard Match)</option>
                  <option value="4">4 Rounds (Full Parliamentary)</option>
                  <option value="5">5 Rounds (Deep Oxford Clash)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loadingDebate}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-sm shadow-sm hover:opacity-95 transition-all flex items-center space-x-2"
              >
                <span>{loadingDebate ? 'Generating Room...' : 'Enter Debate Arena'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* LIVE ACTIVE DEBATE ARENA */
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="bg-white rounded-2xl border border-[#ECE7DE] px-6 py-4 flex flex-wrap items-center justify-between shadow-card gap-4">
            <div className="space-y-0.5 max-w-xl">
              <span className="text-[10px] uppercase font-bold text-[#D49B19] tracking-wider">
                Round {activeDebate?.current_round} of {activeDebate?.max_rounds} • {difficulty} Tier
              </span>
              <h3 className="font-bold text-sm text-[#1E242B] line-clamp-1">
                {activeDebate?.topic}
              </h3>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] border border-[#ECE7DE] text-xs font-mono font-semibold text-gray-700">
                <Clock className="w-3.5 h-3.5 text-[#D49B19]" />
                <span>{formatTime(secondsElapsed)}</span>
              </div>

              <button
                onClick={handleEndAndEvaluate}
                className="px-3.5 py-1.5 rounded-lg bg-[#181F25] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                Conclude & Adjudicate
              </button>

              <button
                onClick={handleResetDebate}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Restart & Return"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transcript / Messages Window */}
          <div className="bg-white rounded-2xl border border-[#ECE7DE] shadow-card min-h-[460px] max-h-[560px] flex flex-col justify-between overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 text-gray-400 space-y-2">
                  <Bot className="w-10 h-10 text-gray-300 stroke-1" />
                  <p className="text-sm font-semibold text-gray-600">The Arena is Live!</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Deliver your opening statement below supporting the position <span className="font-bold text-[#D49B19]">{activeDebate?.user_position}</span>.
                  </p>
                </div>
              )}

              {messages.map((m, idx) => {
                const isUser = m.sender_type === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3.5 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        isUser
                          ? 'bg-[#FCF6E5] text-[#D49B19] border border-[#F4E9C0]'
                          : 'bg-[#181F25] text-white'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[75%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center space-x-2 text-[11px] text-gray-400 px-1">
                        <span className="font-bold text-gray-700">{m.sender_name}</span>
                        <span>•</span>
                        <span>Round {m.round_number}</span>
                      </div>

                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-[#FCF6E5] text-[#1E242B] border border-[#F4E9C0] rounded-tr-none'
                            : 'bg-[#FAF8F3] text-[#1E242B] border border-[#ECE7DE] rounded-tl-none'
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Instant Coach Critique Pill for AI turns */}
                      {m.instant_critique && (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-[11px] space-y-1 text-amber-900 mt-1 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center space-x-1">
                              <Sparkles className="w-3 h-3 text-[#D49B19]" />
                              <span>Round Feedback ({m.instant_critique.score}/100)</span>
                            </span>
                            {m.instant_critique.fallacy_warning && (
                              <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                {m.instant_critique.fallacy_warning}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-600">{m.instant_critique.punchline}</p>
                          <p className="text-[10px] text-[#B87E0E] italic">
                            💡 Tip: {m.instant_critique.coaching_tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex items-center space-x-3 text-gray-400 text-xs py-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="animate-pulse">AI Opponent is formulating counterargument...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission Area */}
            <form onSubmit={handleSendTurn} className="p-4 border-t border-[#ECE7DE] bg-[#FAF8F3] flex items-center space-x-3">
              <input
                type="text"
                value={inputTurn}
                onChange={(e) => setInputTurn(e.target.value)}
                disabled={sending || activeDebate?.status === 'Completed'}
                placeholder={
                  activeDebate?.status === 'Completed'
                    ? 'This match has ended. View evaluation below.'
                    : 'Articulate your argument or rebuttal for this round...'
                }
                className="flex-1 px-4 py-3 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19]"
              />
              <button
                type="submit"
                disabled={!inputTurn.trim() || sending || activeDebate?.status === 'Completed'}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-1.5"
              >
                <span>Submit Turn</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADJUDICATION & EVALUATION MODAL */}
      {showEvalModal && evaluation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#ECE7DE] shadow-2xl max-w-2xl w-full p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E242B]">
                    Debate Adjudication Dossier
                  </h3>
                  <p className="text-xs text-gray-500">
                    Calculated using strict weighted performance formula
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Score</span>
                <div className="text-2xl font-black text-[#D49B19]">
                  {evaluation.total_score} <span className="text-xs text-gray-400 font-normal">/ 100</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Formula Metric Weights
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                  <span className="text-[10px] text-gray-500 block">Arg Quality (30%)</span>
                  <span className="text-sm font-bold text-[#1E242B]">{evaluation.argument_quality}</span>
                </div>
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                  <span className="text-[10px] text-gray-500 block">Evidence (20%)</span>
                  <span className="text-sm font-bold text-[#1E242B]">{evaluation.evidence_usage}</span>
                </div>
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                  <span className="text-[10px] text-gray-500 block">Logic (20%)</span>
                  <span className="text-sm font-bold text-[#1E242B]">{evaluation.logical_consistency}</span>
                </div>
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                  <span className="text-[10px] text-gray-500 block">Rebuttal (15%)</span>
                  <span className="text-sm font-bold text-[#1E242B]">{evaluation.rebuttal_effectiveness}</span>
                </div>
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE]">
                  <span className="text-[10px] text-gray-500 block">Delivery (15%)</span>
                  <span className="text-sm font-bold text-[#1E242B]">{evaluation.communication_skills}</span>
                </div>
              </div>
            </div>

            {/* Verdict & Summary */}
            <div className="p-4 bg-[#FCF6E5] rounded-xl border border-[#F4E9C0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#B87E0E] uppercase tracking-wide">
                  Adjudicator Verdict
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white text-xs font-bold text-[#181F25] border border-[#F4E9C0]">
                  Winner: {evaluation.winner}
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed pt-1">
                {evaluation.summary}
              </p>
            </div>

            {/* Strengths & Actionable Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <h5 className="font-bold text-gray-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Demonstrated Strengths</span>
                </h5>
                <ul className="space-y-1 text-gray-600 list-disc list-inside">
                  {evaluation.strengths?.map((s, idx) => (
                    <li key={idx} className="line-clamp-2">{s}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <h5 className="font-bold text-gray-800 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D49B19]" />
                  <span>Actionable Coaching Tips</span>
                </h5>
                <ul className="space-y-1 text-gray-600 list-disc list-inside">
                  {evaluation.actionable_feedback?.map((f, idx) => (
                    <li key={idx} className="line-clamp-2">{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] text-xs font-bold text-gray-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-[#D49B19]" />
                <span>{downloadingPdf ? 'Exporting PDF...' : 'Export PDF Dossier'}</span>
              </button>

              <button
                onClick={handleResetDebate}
                className="px-6 py-2 rounded-xl bg-[#181F25] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
