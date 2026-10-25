import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Bot,
  Sparkles,
  Send,
  Zap,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Target,
  RefreshCw,
  Award
} from 'lucide-react';

export const AISimulationPage = () => {
  const [selectedPersona, setSelectedPersona] = useState('EMPIRICAL');
  const [motion, setMotion] = useState('Universal Basic Income is Essential in the Post-Automation Economy');
  const [turnNumber, setTurnNumber] = useState(1);
  const [userSpeech, setUserSpeech] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentPOI, setCurrentPOI] = useState(null);
  const [coachingPlan, setCoachingPlan] = useState(null);

  // 1. Fetch available opponent personas
  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const res = await apiClient.get('/simulation/personas');
      return res.data;
    }
  });

  // 2. Fetch debate topics for quick selector
  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await apiClient.get('/topics?limit=10');
      return res.data;
    }
  });

  // 3. Process turn mutation
  const turnMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/simulation/turn', {
        motion,
        user_speech: userSpeech,
        turn_number: turnNumber,
        persona: selectedPersona
      });
      return res.data;
    },
    onSuccess: (data) => {
      // Append user turn and AI response to clash history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', text: userSpeech, turn: turnNumber },
        { role: 'ai', response: data, turn: turnNumber }
      ]);
      setUserSpeech('');
      setTurnNumber((prev) => prev + 1);
      if (data.point_of_information) {
        setCurrentPOI(data.point_of_information);
      }
    }
  });

  // 4. Generate coaching pathway
  const coachingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/simulation/coaching-pathway', {
        weakest_skill: selectedPersona === 'EMPIRICAL' ? 'EVIDENCE' : selectedPersona === 'SOCRATIC' ? 'LOGIC' : 'REBUTTAL',
        current_composite: 72.0
      });
      return res.data;
    },
    onSuccess: (data) => {
      setCoachingPlan(data);
    }
  });

  const activePersonaObj = personas.find((p) => p.id === selectedPersona) || personas[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Chamber Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber block mb-1">
            Chamber Sparring Engine
          </span>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            AI Debate Simulation & Opponent Sparring
          </h1>
          <p className="text-sm text-arena-muted mt-1">
            Clash in real-time with autonomous philosophical personas and test your case against 5 counterargument typologies.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => coachingMutation.mutate()}
          isLoading={coachingMutation.isPending}
        >
          <Award className="w-4 h-4 mr-2 text-arena-amber" />
          Generate Coaching Roadmap
        </Button>
      </div>

      {/* Opponent Persona Selection Grid */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-arena-muted block">
          Choose Autonomous Sparring Partner
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {personas.map((p) => {
            const isSelected = selectedPersona === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPersona(p.id)}
                className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-arena-amber bg-arena-amber/15 shadow-spotlight'
                    : 'border-white/5 bg-arena-bg-card hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-10 h-10 rounded-xl bg-arena-bg-elevated border border-white/10"
                    />
                    <div>
                      <h4 className="font-serif font-bold text-sm text-white">{p.name}</h4>
                      <span className="text-[10px] text-arena-amber font-mono">{p.title}</span>
                    </div>
                  </div>
                  <p className="text-xs text-arena-muted leading-relaxed line-clamp-2">
                    {p.style}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-arena-muted">
                  {p.id} PARADIGM
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Motion Banner */}
      <Card className="border-arena-amber/20 bg-gradient-to-r from-arena-bg-card via-arena-bg-elevated to-arena-bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-arena-amber tracking-wider block mb-1">
              Deliberation Motion
            </span>
            <h3 className="font-serif font-bold text-white text-base">"{motion}"</h3>
          </div>
          <select
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
            className="bg-arena-bg-card border border-white/10 rounded-xl px-3 py-1.5 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.title}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Multi-Turn Clash Chamber */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Span 2): Conversation Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-arena-amber" />
              Chamber Clash Timeline (Turn #{turnNumber})
            </h3>
            <button
              onClick={() => {
                setConversationHistory([]);
                setTurnNumber(1);
                setCurrentPOI(null);
              }}
              className="text-xs text-arena-muted hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Sparring
            </button>
          </div>

          {conversationHistory.length === 0 ? (
            <Card className="p-12 text-center text-arena-muted space-y-3">
              <Bot className="w-10 h-10 mx-auto text-arena-amber/60" />
              <h4 className="font-serif font-bold text-white text-base">
                Chamber is in order. You hold the floor.
              </h4>
              <p className="text-xs max-w-md mx-auto leading-relaxed">
                Deliver your Proposition constructive speech below. {activePersonaObj?.name} will analyze your claims, generate counterarguments, and test your warrants!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {conversationHistory.map((item, idx) => {
                if (item.role === 'user') {
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-arena-prop/10 border border-arena-prop/30 text-xs space-y-2">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-arena-prop-glow uppercase">Proposition Speaker (You)</span>
                        <span className="text-arena-muted">Turn #{item.turn}</span>
                      </div>
                      <p className="text-arena-parchment leading-relaxed">{item.text}</p>
                    </div>
                  );
                } else {
                  const resp = item.response;
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-arena-bg-card border border-arena-amber/30 text-xs space-y-3">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-arena-amber flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          {resp.opponent_name} ({resp.opponent_persona})
                        </span>
                        <span className="text-arena-muted">Turn #{item.turn} Rebuttal</span>
                      </div>
                      <p className="text-white/90 leading-relaxed italic bg-black/20 p-3 rounded-xl border border-white/5">
                        "{resp.speech_rebuttal}"
                      </p>

                      {/* Primary Counterargument Badge Card */}
                      <div className="p-3 rounded-xl bg-arena-opp/10 border border-arena-opp/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-arena-opp-glow text-[11px]">
                            {resp.primary_counterargument.title}
                          </span>
                          <Badge variant="opp">{resp.primary_counterargument.type}</Badge>
                        </div>
                        <p className="text-arena-muted text-[11px] leading-relaxed">
                          {resp.primary_counterargument.content}
                        </p>
                        <span className="text-[10px] text-arena-amber block">
                          <strong>Strategy:</strong> {resp.primary_counterargument.rebuttal_strategy}
                        </span>
                      </div>

                      <div className="text-[11px] text-sky-400 bg-sky-950/30 p-2.5 rounded-xl border border-sky-500/20">
                        <strong>Coaching Tip:</strong> {resp.coaching_tip}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}

          {/* User Speech Input Field */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-arena-muted">
                Your Speech Constructive / Rebuttal
              </label>
              <button
                type="button"
                onClick={() => setUserSpeech("We must enact this motion because automation will displace 30% of workers by 2030, and empirical trials prove that guaranteed income creates sustainable entrepreneurship.")}
                className="text-[10px] text-arena-amber hover:underline"
              >
                Insert Sample Constructive
              </button>
            </div>
            <textarea
              rows={3}
              value={userSpeech}
              onChange={(e) => setUserSpeech(e.target.value)}
              placeholder="State your claims, warrants, and evidence backing to answer the opponent..."
              className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl p-3 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => turnMutation.mutate()}
                isLoading={turnMutation.isPending}
                disabled={!userSpeech.trim()}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Deliver Turn
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: POI Popup & 5 Counterargument Inspector */}
        <div className="space-y-6">
          {/* Active POI Card */}
          {currentPOI && (
            <Card className="border-red-500/50 bg-red-950/20 p-5 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Point of Information!
                </span>
                <span className="text-[10px] font-mono text-red-300">15s Clock</span>
              </div>
              <p className="text-xs text-white italic font-serif">
                "{currentPOI.challenge_question}"
              </p>
              <span className="text-[10px] text-arena-muted block">
                <strong>Speaker:</strong> {currentPOI.speaker_tag}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => setCurrentPOI(null)}
              >
                Acknowledge & Rebut Challenge
              </Button>
            </Card>
          )}

          {/* Counterargument Typology Guide */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-arena-amber">
              <BookOpen className="w-4 h-4" />
              <h4 className="font-serif font-bold text-sm text-white">5 Counterargument Archetypes</h4>
            </div>
            <p className="text-xs text-arena-muted leading-relaxed">
              Every turn, your autonomous opponent generates rebuttals mapped to forensic debate theory:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-arena-bg-elevated border border-white/5">
                <strong className="text-arena-prop block text-[11px]">1. Logical Rebuttals</strong>
                <span className="text-arena-muted text-[10px]">Identifies non-sequiturs, circular logic, and false dilemmas.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-arena-bg-elevated border border-white/5">
                <strong className="text-arena-amber block text-[11px]">2. Evidence-Based Rebuttals</strong>
                <span className="text-arena-muted text-[10px]">Counters with contradictory studies, meta-analyses, and sample biases.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-arena-bg-elevated border border-white/5">
                <strong className="text-purple-400 block text-[11px]">3. Ethical Counterarguments</strong>
                <span className="text-arena-muted text-[10px]">Deconstructs rights-violations and distributive systemic injustices.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-arena-bg-elevated border border-white/5">
                <strong className="text-sky-400 block text-[11px]">4. Practical / Feasibility</strong>
                <span className="text-arena-muted text-[10px]">Targets capital expenditures, enforcement hurdles, and bureaucracy.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-arena-bg-elevated border border-white/5">
                <strong className="text-emerald-400 block text-[11px]">5. Policy Counterarguments</strong>
                <span className="text-arena-muted text-[10px]">Presents superior non-coercive counter-proposals that achieve goals cleanly.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Personalized Coaching Pathway Modal */}
      {coachingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-arena-bg-card border-arena-amber/30 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-arena-amber">
                <Award className="w-5 h-5" />
                <h3 className="font-serif font-bold text-white text-lg">Personalized Coaching Pathway</h3>
              </div>
              <Badge variant="amber">{coachingPlan.target_skill_focus}</Badge>
            </div>

            <p className="text-xs text-arena-muted leading-relaxed">
              {coachingPlan.diagnostic_summary}
            </p>

            <div className="p-3 rounded-xl bg-arena-amber/10 border border-arena-amber/20 text-xs text-arena-amber">
              <strong>Forensic Strategy:</strong> {coachingPlan.strategic_advice}
            </div>

            <div>
              <h4 className="font-serif font-bold text-white text-xs uppercase tracking-wider mb-2">Mastery Milestones</h4>
              <ul className="space-y-1.5 text-xs text-arena-parchment">
                {coachingPlan.mastery_milestones.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-arena-prop font-bold">✓</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-bold text-white text-xs uppercase tracking-wider mb-2">Targeted Practice Drills</h4>
              <div className="space-y-2">
                {coachingPlan.recommended_drills.map((drill, i) => (
                  <div key={i} className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-white block">{drill.title}</span>
                      <span className="text-[11px] text-arena-muted block">{drill.objective}</span>
                    </div>
                    <span className="text-[10px] font-mono text-arena-amber shrink-0">{drill.estimated_min}m</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button variant="primary" size="sm" onClick={() => setCoachingPlan(null)}>
                Apply to My Training
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
