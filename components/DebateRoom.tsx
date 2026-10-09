'use client';

import React, { useState, useEffect } from 'react';
import { useModel } from '@/lib/model-context';
import { DebateFormat, DebateTurn, SpeechType, WeightedDebateScore } from '@/lib/types';
import { evaluateDebateSession } from '@/lib/debate-engine';
import JudgeScorecardModal from './JudgeScorecardModal';
import {
  Mic,
  MicOff,
  Send,
  Play,
  Award,
  AlertTriangle,
  RotateCcw,
  Clock,
  User,
  Bot
} from 'lucide-react';

export default function DebateRoom() {
  const { selectedModel } = useModel();

  const [topic, setTopic] = useState('This house would implement strict international regulations on sovereign autonomous AI weapons.');
  const [format, setFormat] = useState<DebateFormat>('parliamentary');
  const [userPosition, setUserPosition] = useState<'Affirmative' | 'Negative'>('Affirmative');
  const [sessionStarted, setSessionStarted] = useState(false);

  const [turns, setTurns] = useState<DebateTurn[]>([]);
  const [inputSpeech, setInputSpeech] = useState('');
  const [currentSpeechType, setCurrentSpeechType] = useState<SpeechType>('Constructive (Affirmative)');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [timerActive, setTimerActive] = useState(false);

  const [scorecard, setScorecard] = useState<WeightedDebateScore | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setTimerActive(true);
    const initialTurn: DebateTurn = {
      id: 'turn-init',
      speaker: 'Moderator',
      speakerName: 'Debate Moderator',
      role: 'Judge',
      speechType: 'Constructive (Affirmative)',
      content: `Welcome to this ${format.toUpperCase()} debate on: "${topic}". You are speaking as ${userPosition} against ${selectedModel.name} (${userPosition === 'Affirmative' ? 'Negative' : 'Affirmative'}). You hold the floor for your opening speech.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTurns([initialTurn]);
  };

  const handleSpeechSubmit = async () => {
    if (!inputSpeech.trim() || isProcessing) return;

    const userTurn: DebateTurn = {
      id: 'turn-' + Date.now(),
      speaker: 'User',
      speakerName: 'You (Speaker)',
      role: userPosition,
      speechType: currentSpeechType,
      content: inputSpeech.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newTurns = [...turns, userTurn];
    setTurns(newTurns);
    setInputSpeech('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          userPosition,
          history: newTurns,
          modelId: selectedModel.id
        })
      });
      const data = await res.json();

      const aiTurn: DebateTurn = {
        id: 'turn-ai-' + Date.now(),
        speaker: 'AI Opponent',
        speakerName: `${selectedModel.name} (${userPosition === 'Affirmative' ? 'Negative' : 'Affirmative'})`,
        role: userPosition === 'Affirmative' ? 'Negative' : 'Affirmative',
        speechType: userPosition === 'Affirmative' ? 'Constructive (Negative)' : 'Constructive (Affirmative)',
        content: data.content || 'The opposition contends that the proposal introduces unaccountable regulatory overhead.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setTurns([...newTurns, aiTurn]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setTimerSeconds(180);
    }
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is supported in Chrome/Edge. You can also type your speech.');
      return;
    }
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputSpeech(prev => (prev ? prev + ' ' + transcript : transcript));
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    }
  };

  const handleEvaluateSession = () => {
    const score = evaluateDebateSession(turns, userPosition);
    setScorecard(score);
    setShowScorecardModal(true);
  };

  const handleTriggerPOI = () => {
    const poiTurn: DebateTurn = {
      id: 'poi-' + Date.now(),
      speaker: 'AI Opponent',
      speakerName: `${selectedModel.name} (POI)`,
      role: userPosition === 'Affirmative' ? 'Negative' : 'Affirmative',
      speechType: 'Cross-Examination / POI',
      content: `[POINT OF INFORMATION]: How does your model enforce compliance in non-signatory international jurisdictions?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTurns(prev => [...prev, poiTurn]);
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4">
      
      {!sessionStarted ? (
        <div className="border-4 border-black bg-white p-10 sm:p-12 space-y-10 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
          <div className="space-y-3 border-b-4 border-black pb-8">
            <span className="text-xs font-mono font-black text-neutral-500 uppercase tracking-widest">ROUND CONFIGURATION</span>
            <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight uppercase">DEBATE ARENA SETUP</h1>
            <p className="text-sm font-semibold text-neutral-600">Configure debate motion, format, and position to launch the active round.</p>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-xs font-mono font-black text-black uppercase tracking-wider mb-3">Debate Motion / Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border-4 border-black bg-neutral-50 px-6 py-5 text-base sm:text-lg text-black font-bold placeholder-neutral-400 focus:outline-none focus:bg-white transition-all"
                placeholder="Enter debate topic..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-mono font-black text-black uppercase tracking-wider mb-3">Debate Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as DebateFormat)}
                  className="w-full border-4 border-black bg-neutral-50 px-6 py-4 text-sm font-black uppercase text-black focus:outline-none transition-all"
                >
                  <option value="parliamentary">World Schools Parliamentary (WSDC)</option>
                  <option value="oxford">Oxford Union Style</option>
                  <option value="one-on-one">One-on-One Lincoln Douglas</option>
                  <option value="policy">Policy Debate Synthesis</option>
                  <option value="public-forum">Public Forum Debate</option>
                  <option value="ai-simulation">AI Model vs AI Model Arena</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-black text-black uppercase tracking-wider mb-3">Assigned Position</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setUserPosition('Affirmative')}
                    className={`flex-1 border-4 border-black py-4 text-sm font-black uppercase tracking-wider transition-all ${
                      userPosition === 'Affirmative'
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    Affirmative (Pro)
                  </button>
                  <button
                    onClick={() => setUserPosition('Negative')}
                    className={`flex-1 border-4 border-black py-4 text-sm font-black uppercase tracking-wider transition-all ${
                      userPosition === 'Negative'
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    Negative (Con)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t-4 border-black pt-8">
              <div className="text-sm text-neutral-600 font-mono font-bold">
                AI OPPONENT: <strong className="text-black uppercase text-base">{selectedModel.name}</strong>
              </div>
              <button
                onClick={handleStartSession}
                className="flex items-center gap-3 bg-black text-white px-10 py-5 font-black text-sm sm:text-base uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-xl"
              >
                <Play className="h-5 w-5 fill-white" />
                START DEBATE ROUND
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Debate Arena Interface */
        <div className="space-y-8">
          
          {/* Header Bar */}
          <div className="border-4 border-black bg-neutral-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1">
              <span className="bg-black text-white px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider">
                {format} DEBATE
              </span>
              <h2 className="text-base sm:text-lg font-black text-black uppercase line-clamp-1">{topic}</h2>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-mono font-bold text-black">
                <Clock className="h-4 w-4" />
                {formatTimer(timerSeconds)}
              </div>

              <button
                onClick={handleEvaluateSession}
                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-neutral-800 transition-all"
              >
                <Award className="h-4 w-4" />
                EVALUATE & SCORE
              </button>
            </div>
          </div>

          {/* Speeches Feed */}
          <div className="border-4 border-black bg-white p-8 space-y-6 max-h-[580px] overflow-y-auto">
            {turns.map((turn) => {
              const isUser = turn.speaker === 'User';
              const isJudge = turn.speaker === 'Moderator';
              return (
                <div
                  key={turn.id}
                  className={`border-4 p-6 space-y-3 transition-all ${
                    isUser
                      ? 'border-black bg-neutral-50 text-black ml-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                      : isJudge
                      ? 'border-neutral-300 bg-neutral-100 text-neutral-800'
                      : 'border-black bg-white text-black mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between border-b-2 border-neutral-200 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm uppercase text-black">{turn.speakerName}</span>
                      <span className="border-2 border-black bg-black text-white px-2.5 py-0.5 text-xs font-mono font-bold uppercase">
                        {turn.speechType}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-neutral-500 font-bold">{turn.timestamp}</span>
                  </div>
                  <p className="text-sm sm:text-base text-neutral-900 leading-relaxed font-semibold whitespace-pre-wrap">{turn.content}</p>
                </div>
              );
            })}

            {isProcessing && (
              <div className="p-5 border-4 border-black bg-neutral-100 text-sm text-black font-mono font-bold animate-pulse flex items-center gap-4">
                <Bot className="h-5 w-5 text-black animate-spin" />
                <span>{selectedModel.name} IS FORMULATING REFUTATION RESPONSE...</span>
              </div>
            )}
          </div>

          {/* Speech Console */}
          <div className="border-4 border-black bg-white p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                {(['Constructive (Affirmative)', 'Rebuttal (Affirmative)', 'Cross-Examination / POI', 'Summary & Final Focus'] as SpeechType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCurrentSpeechType(type)}
                    className={`border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                      currentSpeechType === type
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTriggerPOI}
                className="flex items-center gap-2 text-xs font-mono font-bold text-black border-2 border-black bg-amber-200 px-4 py-2 hover:bg-amber-300 transition-all uppercase"
              >
                <AlertTriangle className="h-4 w-4" />
                REQUEST POI
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={inputSpeech}
                onChange={(e) => setInputSpeech(e.target.value)}
                placeholder="Type your speech argument or hit Record..."
                className="w-full border-4 border-black bg-neutral-50 p-5 pr-28 text-sm sm:text-base font-bold text-black placeholder-neutral-400 focus:outline-none focus:bg-white leading-relaxed transition-all"
              />

              <div className="absolute right-4 bottom-4 flex items-center gap-3">
                <button
                  onClick={toggleRecording}
                  className={`border-2 border-black p-3 transition-all ${
                    isRecording ? 'bg-black text-white animate-bounce' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                  title="Toggle Speech Recording"
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                <button
                  onClick={handleSpeechSubmit}
                  disabled={!inputSpeech.trim() || isProcessing}
                  className="flex items-center gap-2 border-2 border-black bg-black text-white px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-40 transition-all shadow"
                >
                  <Send className="h-4 w-4" />
                  DELIVER
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-500 font-mono font-bold">
              <button onClick={() => setSessionStarted(false)} className="hover:text-black flex items-center gap-1 uppercase">
                <RotateCcw className="h-4 w-4" /> RESET ROUND
              </button>
              <span>PDF SCORING: 30% ARG • 20% EV • 20% LOGIC • 15% REBUTTAL • 15% COMM</span>
            </div>
          </div>

        </div>
      )}

      {showScorecardModal && scorecard && (
        <JudgeScorecardModal
          scorecard={scorecard}
          topic={topic}
          userPosition={userPosition}
          modelName={selectedModel.name}
          onClose={() => setShowScorecardModal(false)}
        />
      )}

    </div>
  );
}
