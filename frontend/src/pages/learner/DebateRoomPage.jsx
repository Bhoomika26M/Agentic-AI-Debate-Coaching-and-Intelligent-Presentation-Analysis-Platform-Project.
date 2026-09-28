import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Send, Mic, MicOff, Clock, User, Bot, AlertCircle, 
  Sparkles, CheckCircle2, Award, ChevronRight, StopCircle, BrainCircuit
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CoachingPanel } from '../../components/debate/CoachingPanel';

export const DebateRoomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [currentCoaching, setCurrentCoaching] = useState(null);
  const [currentFallacies, setCurrentFallacies] = useState([]);
  const [currentScores, setCurrentScores] = useState({});
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load session
  const fetchSession = async () => {
    try {
      const res = await api.get(`/debates/${id}`);
      setSession(res.data);
      if (res.data.status === 'completed') {
        navigate(`/learner/debates/${id}/report`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  // Round Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Speech API for voice dictation
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please use keyboard text input.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(prev => prev + ' ' + transcript);
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  };

  // Submit round argument
  const handleSubmitArgument = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || submitting) return;

    const argumentToSend = inputText.trim();
    setInputText('');
    setSubmitting(true);

    try {
      const res = await api.post(`/debates/${id}/rounds`, {
        argument_text: argumentToSend
      });

      // Update live coaching panel state
      setCurrentCoaching(res.data.coaching);
      setCurrentFallacies(res.data.fallacies || []);
      setCurrentScores(res.data.score || {});

      // Refresh session
      await fetchSession();
      setTimerSeconds(180); // reset timer for next turn

      if (res.data.is_final_round) {
        // Automatically conclude and view report
        const endRes = await api.post(`/debates/${id}/end`);
        navigate(`/learner/debates/${id}/report`);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit argument.');
    } finally {
      setSubmitting(false);
    }
  };

  // Manual End Debate
  const handleEndDebate = async () => {
    if (confirm("Are you sure you want to end this debate now and generate your comprehensive scorecard?")) {
      try {
        await api.post(`/debates/${id}/end`);
        navigate(`/learner/debates/${id}/report`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Initializing Debate Room & AI Opponent...</p>
        </div>
      </div>
    );
  }

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col gap-4">
      {/* 3-Column Layout: Left (Info/Timer) | Center (Debate Conversation) | Right (Live Coach) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* LEFT PANEL: Resolution & Debater Info (3 Cols) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-3">
          <Card className="p-4 space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Motion Under Debate</span>
              <h3 className="text-sm font-bold text-white mt-1 leading-snug">{session.topic}</h3>
            </div>

            <div className="pt-2 border-t border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Your Stance:</span>
                <Badge variant={session.position === 'For' ? 'success' : 'danger'} size="sm">
                  {session.position}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Format:</span>
                <span className="text-slate-200 font-medium">{session.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Difficulty:</span>
                <span className="text-slate-200 font-medium">{session.difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI Personality:</span>
                <span className="text-amber-400 font-semibold">{session.ai_opponent_personality}</span>
              </div>
            </div>
          </Card>

          {/* Round & Timer Card */}
          <Card className="p-4 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-primary-400" /> Remaining Round Time
            </div>
            <div className={`text-3xl font-mono font-black ${timerSeconds < 30 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {formatTime(timerSeconds)}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Round <span className="text-white font-bold">{session.current_round}</span> of {session.rounds_count}
            </div>
          </Card>

          {/* Action buttons */}
          <div className="mt-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEndDebate}
              className="w-full text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
            >
              <StopCircle className="w-4 h-4 mr-1.5" /> End Debate & View Scorecard
            </Button>
          </div>
        </div>

        {/* CENTER PANEL: Debate Dialogue Stream (6 Cols) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-850 border-b border-slate-850/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">AI Opponent ({session.ai_opponent_personality})</span>
            </div>
            <span className="text-xs text-slate-400">Round {session.current_round} of {session.rounds_count}</span>
          </div>

          {/* Conversation Transcript List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.rounds.map((r, idx) => (
              <div key={idx} className="space-y-3">
                {/* AI Speech Bubble */}
                {r.ai_transcript && (
                  <div className="flex gap-3 max-w-[88%]">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-200 leading-relaxed shadow-md">
                      <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">
                        Opponent • Round {r.round_number}
                      </div>
                      <p>{r.ai_transcript}</p>
                    </div>
                  </div>
                )}

                {/* User Speech Bubble */}
                {r.user_transcript && (
                  <div className="flex gap-3 max-w-[88%] ml-auto justify-end">
                    <div className="bg-primary-900/40 border border-primary-500/40 rounded-2xl rounded-tr-none p-3.5 text-xs text-slate-100 leading-relaxed shadow-md">
                      <div className="text-[10px] text-primary-300 font-bold uppercase mb-1 text-right">
                        You ({session.position}) • Round {r.round_number}
                      </div>
                      <p>{r.user_transcript}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls at Bottom */}
          <div className="p-3 bg-slate-850/90 border-t border-slate-800">
            <form onSubmit={handleSubmitArgument} className="space-y-2">
              <div className="relative flex items-center">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Deliver your argument, rebuttal, or contention... (or speak via microphone)"
                  className="w-full pl-3 pr-24 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500 resize-none placeholder-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitArgument();
                    }
                  }}
                />
                
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Dictate with Microphone'}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <Button
                    type="submit"
                    size="sm"
                    loading={submitting}
                    disabled={!inputText.trim()}
                    className="h-8 px-3"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {isRecording && (
                <div className="flex items-center gap-2 text-[11px] text-rose-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Listening to speech... Speak clearly.
                </div>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Live AI Coaching & Fallacy Radar (3 Cols) */}
        <div className="hidden lg:block lg:col-span-3">
          <CoachingPanel
            coaching={currentCoaching}
            fallacies={currentFallacies}
            scores={currentScores}
          />
        </div>

      </div>
    </div>
  );
};
