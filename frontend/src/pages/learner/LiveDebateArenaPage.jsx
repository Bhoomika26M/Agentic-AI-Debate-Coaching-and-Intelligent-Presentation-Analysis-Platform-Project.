import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { debateApi } from '../../api/debateApi';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Swords,
  Send,
  Mic,
  MicOff,
  User,
  Bot,
  Flag,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const LiveDebateArenaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState({
    title: 'Universal Basic Income is Essential in the Era of Exponential AI',
    difficulty: 'Collegiate',
    user_stance: 'Affirmative',
    ai_stance: 'Negative',
    format: 'Oxford Parliamentary',
  });

  const [currentRound, setCurrentRound] = useState(1);

  const [turns, setTurns] = useState([
    {
      speaker: 'AI',
      transcript:
        'Welcome to this Oxford-style parliamentary debate. The proposition is: "Universal Basic Income is Essential in the Era of Exponential AI." You are arguing for the Affirmative. Whenever you are ready, please present your opening constructive speech.',
      round: 1,
      timestamp: 'Round 1 Start',
    },
  ]);

  const [currentInput, setCurrentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentInput((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your speech.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isSubmitting]);

  const handleSendTurn = async (e) => {
    e.preventDefault();
    if (!currentInput.trim() || isSubmitting) return;

    const userText = currentInput.trim();
    setCurrentInput('');
    setIsSubmitting(true);

    const newRound = Math.min(Math.floor(turns.length / 2) + 1, 3);
    setCurrentRound(newRound);

    // Append User argument
    const userTurn = {
      speaker: 'USER',
      transcript: userText,
      round: newRound,
      timestamp: 'Just now',
    };
    setTurns((prev) => [...prev, userTurn]);

    try {
      let turnResponse;
      if (id) {
        turnResponse = await debateApi.submitTurn(id, userText);
      } else {
        await new Promise((r) => setTimeout(r, 1400));
        turnResponse = {
          analysis: {
            claim: 'UBI is an indispensable hedge against algorithmic labor disruption.',
            grounds: 'Cognitive automation displaces jobs faster than retraining programs can scale.',
            warrant: 'Economic stability requires universal income security when labor share declines.',
            fallacies: [
              {
                type: 'Slippery Slope',
                explanation: 'Assumes complete employment obsolescence without factoring new AI industries.',
              },
            ],
            score: 84,
          },
          ai_rebuttal:
            'While the Affirmative raises reasonable concerns regarding displacement speed, asserting that UBI is the sole remedy overlooks critical fiscal reality. A universal stipend sufficient to meet living costs would cause substantial demand-pull inflation, quickly eroding purchasing power. Furthermore, evidence shows that targeted wage subsidies and technical education provide vastly better long-term upward mobility. How does the Affirmative address the risk of stagflation?',
        };
      }

      setLastAnalysis(turnResponse.analysis);

      // Append AI response
      const aiTurn = {
        speaker: 'AI',
        transcript: turnResponse.ai_rebuttal,
        round: newRound,
        timestamp: 'Just now',
      };
      setTurns((prev) => [...prev, aiTurn]);
    } catch (err) {
      console.error('Failed to submit turn', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-6xl mx-auto space-y-4">
      {/* 1. Clean Top Header */}
      <Card padding="sm" className="shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Debate Topic:
              </span>
              <Badge variant="blue" size="sm">
                Difficulty: {topic.difficulty}
              </Badge>
              <Badge variant="green" size="sm">
                Position: {topic.user_stance}
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
              {topic.title}
            </h2>
          </div>

          {/* Round Indicator: Round 1 / Round 2 / Round 3 */}
          <div className="flex items-center gap-1.5 self-end md:self-center bg-slate-100 p-1.5 rounded-xl">
            {[1, 2, 3].map((r) => (
              <span
                key={r}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  currentRound === r
                    ? 'bg-[#172554] text-white shadow-xs'
                    : currentRound > r
                    ? 'bg-white text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                Round {r}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Main Area: Left (User's Argument) and Right (AI Opponent Response) Chat Layout */}
      <Card padding="none" className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {turns.map((turn, index) => {
            const isUser = turn.speaker === 'USER';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-2xl ${
                  isUser ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-blue-100 text-[#172554] border border-blue-200'
                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Speech Bubble */}
                <div
                  className={`rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-blue-50/80 border border-blue-100 text-[#0F172A] rounded-tl-none'
                      : 'bg-white border border-slate-200/90 text-[#0F172A] rounded-tr-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                    <span className={isUser ? 'text-[#172554]' : 'text-purple-800'}>
                      {isUser ? "Your Argument" : 'AI Opponent Response'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Round {turn.round}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{turn.transcript}</p>
                </div>
              </div>
            );
          })}

          {/* AI Thinking State */}
          {isSubmitting && (
            <div className="flex gap-3 max-w-xl ml-auto flex-row-reverse">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-500 flex items-center gap-2 rounded-tr-none shadow-xs">
                <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>AI opponent is analyzing your claims and crafting rebuttal...</span>
              </div>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* 3. Bottom Bar: Text Input, Microphone Button, Send Button */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/70">
          <form onSubmit={handleSendTurn} className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                rows={2}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTurn(e);
                  }
                }}
                placeholder="Type your debate speech or click the mic to speak..."
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 rounded-xl p-3 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none resize-none transition-all"
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-2.5 bottom-3.5 p-2 rounded-lg transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={isListening ? 'Stop Recording' : 'Speak via Microphone'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !currentInput.trim()}
              className="h-12 px-5 shrink-0"
              icon={Send}
              iconPosition="right"
            >
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
