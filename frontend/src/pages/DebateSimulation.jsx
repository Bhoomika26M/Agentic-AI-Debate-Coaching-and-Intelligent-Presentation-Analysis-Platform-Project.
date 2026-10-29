import { useState, useEffect, useRef } from 'react'
import api from '../api/client'
import PersonaSelector, { PERSONAS } from '../components/simulation/PersonaSelector'
import CounterargumentPanel from '../components/simulation/CounterargumentPanel'

const SAMPLE_TOPICS = [
  'Artificial intelligence should be regulated by international treaty',
  'Social media algorithms do more harm than good to democratic discourse',
  'Climate change mitigation requires carbon taxation over market incentives',
  'Universal basic income should replace traditional welfare entitlements',
  'Renewable energy can reliably meet 100% of global grid baseload demand',
]

/**
 * DebateSimulation Page Component — Milestone 3
 * ==============================================
 * Orchestrates multi-turn sparring against 8 distinct AI debater personas.
 * Features:
 * - Dynamic opening statements and persona traits
 * - Multi-turn conversational history management
 * - Real-time coaching challenges & strategy suggestions
 * - Typed counterargument synthesis tool
 */
export default function DebateSimulation() {
  const [phase, setPhase]             = useState('setup')  // 'setup' | 'debate' | 'results'
  const [topic, setTopic]             = useState(SAMPLE_TOPICS[0])
  const [userPos, setUserPos]         = useState('proposition')
  const [persona, setPersona]         = useState('balanced')
  const [turns, setTurns]             = useState([])
  const [userSpeech, setUserSpeech]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [totalTurns]                  = useState(6)
  const [aiPosition, setAiPosition]   = useState('opposition')
  const [sessionId, setSessionId]     = useState('')
  const [error, setError]             = useState('')
  const [coaching, setCoaching]       = useState('')
  const [strategy, setStrategy]       = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, coaching])

  const startSimulation = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/simulation/start', {
        topic,
        user_position: userPos,
        persona_key: persona,
        total_turns: totalTurns,
      })
      const d = res.data
      setAiPosition(d.ai_position)
      setSessionId(d.session_id)
      setTurns([{
        role: 'ai',
        content: d.ai_opening,
        label: `${d.persona} (Opening)`,
        turn: 0,
      }])
      setCurrentTurn(1)
      setPhase('debate')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start simulation.')
    } finally {
      setLoading(false)
    }
  }

  const submitSpeech = async () => {
    if (!userSpeech.trim() || userSpeech.trim().length < 10) {
      setError('Please enter at least 10 words before submitting.')
      return
    }
    setLoading(true)
    setError('')
    const newTurns = [
      ...turns,
      { role: 'user', content: userSpeech, label: `You (Turn ${currentTurn})`, turn: currentTurn }
    ]
    setTurns(newTurns)
    setUserSpeech('')

    try {
      const res = await api.post('/simulation/turn', {
        session_id: sessionId,
        topic,
        user_speech: userSpeech,
        persona_key: persona,
        turn_number: currentTurn,
        user_position: userPos,
        history: newTurns.map(t => ({ role: t.role, content: t.content })),
      })
      const d = res.data
      setCoaching(d.coaching_note || '')
      setStrategy(d.strategy_suggestion || '')
      setTurns(prev => [
        ...prev,
        {
          role: 'ai',
          content: d.ai_response,
          label: `AI Opponent (Turn ${currentTurn})`,
          turn: currentTurn,
          isFinal: d.is_final_turn,
        }
      ])
      if (d.is_final_turn) {
        setPhase('results')
      } else {
        setCurrentTurn(prev => prev + 1)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process turn.')
      setTurns(newTurns)
    } finally {
      setLoading(false)
    }
  }

  const resetSimulation = () => {
    setPhase('setup')
    setTurns([])
    setCurrentTurn(0)
    setCoaching('')
    setStrategy('')
    setError('')
    setUserSpeech('')
  }

  const selectedPersona = PERSONAS.find(p => p.key === persona)
  const progressPct = Math.min(100, (currentTurn / totalTurns) * 100)

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.8rem' }}>🤖</span>
            <h1 style={{ margin: 0 }}>AI Debate Simulation</h1>
          </div>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
            Engage in multi-turn debates with intelligent AI opponents on any motion
          </p>
        </div>
        {phase !== 'setup' && (
          <button className="btn btn-secondary" onClick={resetSimulation}>
            ↩ New Simulation
          </button>
        )}
      </div>

      {/* ── SETUP PHASE ── */}
      {phase === 'setup' && (
        <div className="sim-setup-grid">
          <div className="card">
            <h2 className="card-title">🎯 Debate Configuration</h2>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="sim-topic-input">MOTION / TOPIC</label>
              <input
                id="sim-topic-input"
                className="input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter any debate motion or question..."
              />
              <div className="sample-chips" style={{ marginTop: 10 }}>
                {SAMPLE_TOPICS.map(t => (
                  <button key={t} type="button" className="chip" onClick={() => setTopic(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="sim-position-select">YOUR POSITION</label>
              <select
                id="sim-position-select"
                className="input"
                value={userPos}
                onChange={e => setUserPos(e.target.value)}
              >
                <option value="proposition">Proposition (For the Motion)</option>
                <option value="opposition">Opposition (Against the Motion)</option>
              </select>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <button
              className="btn btn-primary btn-lg"
              onClick={startSimulation}
              disabled={loading || !topic.trim()}
              style={{ width: '100%' }}
            >
              {loading ? <span className="spinner" /> : '🚀 Enter Debate Arena'}
            </button>
          </div>

          <div className="card">
            <h2 className="card-title">🎭 Choose AI Opponent (8 Personas)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Select an opponent style to challenge your critical reasoning:
            </p>
            <PersonaSelector selectedPersona={persona} onSelect={setPersona} />
          </div>
        </div>
      )}

      {/* ── DEBATE & RESULTS PHASE ── */}
      {(phase === 'debate' || phase === 'results') && (
        <div className="debate-layout">
          {/* Main Arena */}
          <div className="debate-arena">
            {/* Progress Bar */}
            <div className="turn-progress">
              <div className="turn-info">
                <span>Turn {Math.min(currentTurn, totalTurns)} of {totalTurns}</span>
                <span style={{ color: selectedPersona?.color, fontWeight: 700 }}>
                  {selectedPersona?.icon} {selectedPersona?.label}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPct}%`, background: selectedPersona?.color }} />
              </div>
            </div>

            {/* Topic Badge */}
            <div className="topic-badge">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MOTION:</span>{' '}
                <span style={{ color: 'var(--text-primary)' }}>{topic}</span>
              </div>
              <div className="position-chips">
                <span className="chip chip-blue">You: {userPos}</span>
                <span className="chip chip-red">AI: {aiPosition}</span>
              </div>
            </div>

            {/* Turns Stream */}
            <div className="turns-list">
              {turns.map((turn, i) => (
                <div key={i} className={`turn-bubble ${turn.role === 'user' ? 'user-turn' : 'ai-turn'}`}>
                  <div className="turn-header">
                    <span>{turn.label}</span>
                    {turn.isFinal && <span className="badge badge-warning">🏁 Final Turn</span>}
                  </div>
                  <div className="turn-text" style={{ whiteSpace: 'pre-wrap' }}>{turn.content}</div>
                </div>
              ))}
              {loading && (
                <div className="turn-bubble ai-turn" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="spinner" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>AI Opponent is formulating counter-speech...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* User Speech Input Area */}
            {phase === 'debate' && (
              <div className="debate-input-card">
                {coaching && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(23,107,104,0.06)',
                    border: '1px solid rgba(23,107,104,0.2)',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}>
                    <strong style={{ color: 'var(--brand-primary)' }}>💬 Real-Time Coach Note:</strong>
                    <div style={{ marginTop: 4 }}>{coaching}</div>
                  </div>
                )}

                <textarea
                  className="speech-textarea"
                  placeholder={`Deliver your Turn ${currentTurn} speech... (${userPos === 'proposition' ? 'Argue FOR the motion' : 'Argue AGAINST the motion'})`}
                  value={userSpeech}
                  onChange={e => setUserSpeech(e.target.value)}
                  rows={4}
                  disabled={loading}
                />

                <div className="speech-footer">
                  <span>{userSpeech.split(/\s+/).filter(Boolean).length} words</span>
                  {error && <span style={{ color: 'var(--brand-danger)' }}>{error}</span>}
                  <button
                    className="btn btn-primary"
                    onClick={submitSpeech}
                    disabled={loading || !userSpeech.trim()}
                  >
                    {loading ? <span className="spinner" /> : '🎤 Submit Speech'}
                  </button>
                </div>
              </div>
            )}

            {/* Results Panel */}
            {phase === 'results' && (
              <div className="card" style={{ background: 'rgba(47,125,91,0.06)', border: '1px solid rgba(47,125,91,0.25)', textAlign: 'center', padding: 32 }}>
                <span style={{ fontSize: '2.5rem' }}>🏆</span>
                <h2 style={{ margin: '8px 0', color: 'var(--brand-success)' }}>Debate Simulation Complete!</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 16px' }}>
                  You completed all {totalTurns} sparring exchanges on: <em>"{topic}"</em> against <strong>{selectedPersona?.label}</strong>.
                </p>
                {strategy && (
                  <div style={{ padding: '12px 18px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxWidth: 520, margin: '0 auto 20px', textAlign: 'left' }}>
                    <strong style={{ color: 'var(--brand-accent)' }}>💡 Strategic Debrief:</strong>
                    <div style={{ marginTop: 4, fontSize: '0.88rem' }}>{strategy}</div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button className="btn btn-primary" onClick={resetSimulation}>
                    🔄 New Simulation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Tools */}
          <div className="sim-sidebar">
            {strategy && phase === 'debate' && (
              <div className="card" style={{ borderLeft: '4px solid var(--brand-accent)' }}>
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>💡 Tactical Strategy</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{strategy}</p>
              </div>
            )}

            {/* Modular Counterargument Generator */}
            <CounterargumentPanel currentTopic={topic} />
          </div>
        </div>
      )}
    </div>
  )
}
