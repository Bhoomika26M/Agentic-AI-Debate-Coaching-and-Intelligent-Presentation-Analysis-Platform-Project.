import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquare, ArrowRight, ShieldCheck, Flame, HelpCircle } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const CreateDebatePage = () => {
  const [topic, setTopic] = useState('');
  const [position, setPosition] = useState('For');
  const [format, setFormat] = useState('Oxford Debate');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [duration, setDuration] = useState(10);
  const [personality, setPersonality] = useState('Analytical');
  const [roundsCount, setRoundsCount] = useState(3);
  const [recommendedTopics, setRecommendedTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/debates/topics/recommended')
      .then(res => setRecommendedTopics(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleStartDebate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please provide or select a debate topic.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/debates', {
        topic,
        position,
        format,
        difficulty,
        duration_minutes: parseInt(duration),
        ai_opponent_personality: personality,
        rounds_count: parseInt(roundsCount)
      });
      navigate(`/learner/debates/${res.data.id}/room`);
    } catch (err) {
      setError(err.message || 'Failed to initialize debate simulation.');
    } finally {
      setLoading(false);
    }
  };

  const personalities = [
    { name: 'Analytical', desc: 'Dissects logical fallacies and empirical trade-offs with calm precision.' },
    { name: 'Aggressive', desc: 'Relentlessly pressures premises and highlights critical operational liabilities.' },
    { name: 'Evidence-focused', desc: 'Challenges assertions lacking statistical or academic methodology.' },
    { name: 'Socratic', desc: 'Interrogates assumptions through probing philosophical inquiries.' },
    { name: 'Skeptical', desc: 'Demands extraordinary proof and questions speculative leaps.' },
    { name: 'Friendly', desc: 'Constructive and collegial, steel-manning opposing points while posing dilemmas.' }
  ];

  const formats = [
    'One-on-One Debate',
    'Parliamentary Debate',
    'Oxford Debate',
    'Policy Debate',
    'Public Forum Debate',
    'AI Debate Simulation'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Configure New AI Debate Simulation</h1>
        <p className="text-xs text-slate-400 mt-1">
          Select your resolution, debate format, and AI opponent demeanor to begin your live sparring session.
        </p>
      </div>

      <form onSubmit={handleStartDebate} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Topic Input & Quick Picks */}
        <Card title="1. Debate Resolution / Topic">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Enter Topic / Resolution Motion *
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Should artificial intelligence replace traditional education?"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500 placeholder-slate-500"
              />
            </div>

            {recommendedTopics.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Or select a recommended debate prompt:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedTopics.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTopic(t.title); setDifficulty(t.difficulty); }}
                      className="text-left text-xs bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Position, Difficulty & Format */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="2. Your Position">
            <div className="space-y-2">
              {['For', 'Against', 'Neutral / Exploratory'].map(pos => (
                <label
                  key={pos}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    position === pos
                      ? 'bg-primary-600/15 border-primary-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{pos}</span>
                  <input
                    type="radio"
                    name="position"
                    value={pos}
                    checked={position === pos}
                    onChange={() => setPosition(pos)}
                    className="accent-primary-500"
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card title="3. Debate Format">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500 mb-3"
            >
              {formats.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
              Format rules: Structured turn-taking with opening statements, targeted cross-examinations, rebuttals, and final scoring.
            </div>
          </Card>

          <Card title="4. Difficulty & Rounds">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Debate Rounds</label>
                <select
                  value={roundsCount}
                  onChange={(e) => setRoundsCount(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value={2}>2 Rounds (Quick Spar)</option>
                  <option value={3}>3 Rounds (Standard Match)</option>
                  <option value={5}>5 Rounds (Championship Length)</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Opponent Personality */}
        <Card title="5. AI Opponent Personality Archetype" subtitle="Select the rhetorical style of your AI adversary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personalities.map(p => (
              <div
                key={p.name}
                onClick={() => setPersonality(p.name)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  personality === p.name
                    ? 'bg-primary-600/15 border-primary-500 shadow-md ring-1 ring-primary-500'
                    : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-white mb-1">
                  <span>{p.name}</span>
                  {personality === p.name && <Badge variant="primary" size="sm">Active</Badge>}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{p.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="submit" size="lg" loading={loading} className="px-8 shadow-xl shadow-primary-600/30">
            Initialize Debate Room <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
};
