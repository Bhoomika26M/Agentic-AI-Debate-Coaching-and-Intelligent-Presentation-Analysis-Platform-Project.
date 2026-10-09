'use client';

import React, { useState } from 'react';
import { generateCounterarguments } from '@/lib/rebuttal-engine';
import { CounterargumentOption, FallacyType } from '@/lib/types';
import { Zap, ShieldAlert, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

export default function RebuttalLab() {
  const [argumentInput, setArgumentInput] = useState(
    'The government should mandate 100% remote work for all software companies to eliminate commuter carbon emissions.'
  );

  const [counterarguments, setCounterarguments] = useState<CounterargumentOption[]>(() =>
    generateCounterarguments(argumentInput)
  );

  const [activeTab, setActiveTab] = useState<'generator' | 'fallacy-game'>('generator');

  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<FallacyType | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const QUIZ_QUESTIONS: { snippet: string; correctFallacy: FallacyType; explanation: string }[] = [
    {
      snippet: '"We cannot accept Dr. Smith\'s energy plan because he was once fined for a parking violation 10 years ago."',
      correctFallacy: 'Ad Hominem',
      explanation: 'Attacks Dr. Smith\'s personal history rather than evaluating his scientific energy data.'
    },
    {
      snippet: '"Either we completely prohibit autonomous vehicle testing, or thousands of pedestrians will die on our roads every month."',
      correctFallacy: 'False Dilemma',
      explanation: 'Presents a binary extreme, ignoring intermediate safety standards and phased testing corridors.'
    },
    {
      snippet: '"If we permit students to use calculator apps in class today, next year nobody will learn math and university engineering programs will collapse."',
      correctFallacy: 'Slippery Slope',
      explanation: 'Assumes an unchecked catastrophic chain reaction without proving causal links between calculator apps and collapse.'
    },
    {
      snippet: '"Our new marketing strategy is superior because it generates far better outcomes than any alternative strategy."',
      correctFallacy: 'Circular Reasoning',
      explanation: 'Uses the claim to justify itself without citing independent benchmark data.'
    }
  ];

  const handleGenerate = () => {
    const res = generateCounterarguments(argumentInput);
    setCounterarguments(res);
  };

  const handleQuizAnswer = (answer: FallacyType) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    if (answer === QUIZ_QUESTIONS[currentQuizIdx].correctFallacy) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentQuizIdx(prev => (prev + 1) % QUIZ_QUESTIONS.length);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Rebuttal Generator & Fallacy Lab</h1>
            <p className="text-xs text-slate-400">Deconstruct opponent arguments across 5 counterargument dimensions & practice logical fallacy identification</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 rounded-2xl bg-slate-950 border border-slate-800 p-1.5">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'generator'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Rebuttal Generator
          </button>
          <button
            onClick={() => setActiveTab('fallacy-game')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'fallacy-game'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Fallacy Training Game
          </button>
        </div>
      </div>

      {activeTab === 'generator' ? (
        <div className="space-y-6">
          
          {/* Input Box */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <label className="block text-xs font-bold text-white uppercase tracking-wider">Opponent Claim / Argument to Deconstruct</label>
            <textarea
              rows={3}
              value={argumentInput}
              onChange={(e) => setArgumentInput(e.target.value)}
              placeholder="Paste opponent claim or argument snippet..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                <Zap className="h-4 w-4" />
                Generate 5 Counterargument Dimensions
              </button>
            </div>
          </div>

          {/* 5 Counterargument Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {counterarguments.map((ca) => (
              <div key={ca.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-2">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {ca.type}
                  </span>
                  <h3 className="text-sm font-bold text-white">{ca.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{ca.content}</p>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="rounded-xl bg-slate-950 p-2.5 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" /> Challenge Question
                    </span>
                    <p className="text-[11px] text-slate-300 italic">"{ca.challengeQuestion}"</p>
                  </div>
                  <p className="text-[10px] text-slate-400">💡 <strong>Strategy:</strong> {ca.strategyTip}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        /* Fallacy Training Game */
        <div className="max-w-2xl mx-auto rounded-3xl border border-slate-800 bg-slate-900 p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Fallacy Training Arena</span>
              <h2 className="text-lg font-bold text-white mt-0.5">Identify the Logical Fallacy</h2>
            </div>
            <div className="rounded-full bg-slate-950 border border-slate-800 px-4 py-1 text-xs font-mono text-emerald-400">
              Score: {quizScore} / {QUIZ_QUESTIONS.length}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 font-serif italic text-sm text-slate-200 leading-relaxed">
            {QUIZ_QUESTIONS[currentQuizIdx].snippet}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['Ad Hominem', 'Straw Man', 'False Dilemma', 'Slippery Slope', 'Appeal to Authority', 'Circular Reasoning'] as FallacyType[]).map((type) => {
              const isCorrect = type === QUIZ_QUESTIONS[currentQuizIdx].correctFallacy;
              const isSelected = selectedAnswer === type;

              let btnStyle = 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700';
              if (showResult) {
                if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold';
                else if (isSelected) btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-300';
              }

              return (
                <button
                  key={type}
                  disabled={showResult}
                  onClick={() => handleQuizAnswer(type)}
                  className={`rounded-2xl border p-3.5 text-xs font-medium text-left transition-all ${btnStyle}`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <p className={`text-xs font-bold ${selectedAnswer === QUIZ_QUESTIONS[currentQuizIdx].correctFallacy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedAnswer === QUIZ_QUESTIONS[currentQuizIdx].correctFallacy ? '✓ Correct Identification!' : '✗ Incorrect'}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{QUIZ_QUESTIONS[currentQuizIdx].explanation}</p>
              
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all"
                >
                  Next Challenge <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
