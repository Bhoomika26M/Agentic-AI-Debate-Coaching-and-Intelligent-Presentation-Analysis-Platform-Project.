import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ChevronRight, Calendar, Users, CheckCircle2, AlertCircle } from 'lucide-react';

const DEBATE_FORMATS = [
  { id: 'ONE_ON_ONE', name: '1-on-1 Lincoln Douglas', desc: 'Direct philosophical clash between Proposition and Opposition.' },
  { id: 'OXFORD', name: 'Oxford Union Debate', desc: 'Traditional resolution debate with audience division vote.' },
  { id: 'PARLIAMENTARY', name: 'British Parliamentary', desc: 'Four teams competing in government versus loyal opposition.' },
  { id: 'POLICY', name: 'Cross-Examination Policy', desc: 'In-depth evidence interrogation regarding systemic reform.' },
  { id: 'PUBLIC_FORUM', name: 'Public Forum', desc: 'Rapid, accessible forensics modeled on contemporary affairs.' },
  { id: 'AI_SIMULATION', name: 'AI Chamber Simulation', desc: 'Solo practice with synthetic AI opponents.' },
];

export const CreateSessionWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form selections
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [format, setFormat] = useState('ONE_ON_ONE');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMin, setDurationMin] = useState(45);
  const [position, setPosition] = useState('PROPOSITION');
  const [error, setError] = useState('');

  // 1. Fetch available topics
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await apiClient.get('/topics?limit=100');
      return res.data;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData) => {
      const res = await apiClient.post('/sessions', sessionData);
      return res.data;
    },
    onSuccess: (data) => {
      navigate(`/sessions/${data.id}`);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to schedule session.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTopicId) {
      setError('Please pick a debate motion.');
      return;
    }
    if (!scheduledAt) {
      setError('Please pick a date and time.');
      return;
    }

    createSessionMutation.mutate({
      topic_id: selectedTopicId,
      format,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_min: Number(durationMin),
    });
  };

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber block mb-1">
          Chamber Scheduling Wizard
        </span>
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
          Convene a Debate Session
        </h1>
        <p className="text-sm text-arena-muted mt-1">
          Follow the 3-step protocol: select motion, designate format, and establish the roster.
        </p>

        {/* Stepper bar */}
        <div className="flex items-center gap-4 mt-6">
          {['1. Select Motion', '2. Format & Rules', '3. Position & Schedule'].map((st, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === i + 1
                    ? 'bg-arena-amber text-black'
                    : step > i + 1
                    ? 'bg-arena-prop text-white'
                    : 'bg-arena-bg-elevated text-arena-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-white' : 'text-arena-muted'}`}>
                {st}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-arena-opp/10 border border-arena-opp/30 flex items-center gap-2 text-arena-opp text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Topic */}
      {step === 1 && (
        <Card className="space-y-4">
          <h3 className="font-serif font-bold text-lg text-white">Choose a Motion for Deliberation</h3>
          {loadingTopics ? (
            <p className="text-xs text-arena-muted">Loading motions...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopicId(t.id)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    selectedTopicId === t.id
                      ? 'border-arena-amber bg-arena-amber/15 shadow-spotlight'
                      : 'border-white/5 bg-arena-bg-elevated hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="amber">{t.category}</Badge>
                    <span className="text-[10px] font-mono text-arena-muted">{t.difficulty}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-1 leading-snug">{t.title}</h4>
                  <p className="text-[11px] text-arena-muted line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedTopicId}
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              Proceed to Format <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Debate Format */}
      {step === 2 && (
        <Card className="space-y-4">
          <h3 className="font-serif font-bold text-lg text-white">Select Parliamentary Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEBATE_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setFormat(fmt.id)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  format === fmt.id
                    ? 'border-arena-amber bg-arena-amber/15 shadow-spotlight'
                    : 'border-white/5 bg-arena-bg-elevated hover:bg-white/5'
                }`}
              >
                <div className="font-semibold text-white text-sm mb-1">{fmt.name}</div>
                <div className="text-xs text-arena-muted leading-relaxed">{fmt.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-white/5">
            <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => setStep(3)}>
              Proceed to Schedule <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Position & Schedule */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <Card className="space-y-6">
            <h3 className="font-serif font-bold text-lg text-white">Chamber Date & Roster</h3>

            {/* Motion Recap */}
            {selectedTopic && (
              <div className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5">
                <span className="text-[10px] font-mono uppercase text-arena-amber block mb-1">
                  Selected Motion
                </span>
                <p className="text-xs font-semibold text-white">{selectedTopic.title}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                  Scheduled Chamber Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                  Duration (Minutes)
                </label>
                <select
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes (Standard)</option>
                  <option value={60}>60 Minutes (Full Oxford)</option>
                  <option value={90}>90 Minutes (Tournament)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <Button type="button" variant="secondary" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createSessionMutation.isPending}
              >
                Launch Session <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
