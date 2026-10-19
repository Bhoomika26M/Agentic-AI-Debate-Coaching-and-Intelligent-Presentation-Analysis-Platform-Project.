import { useState, useEffect, useRef } from 'react'
import api from '../api/client'

const PERSONAS = [
  { key: 'balanced',       icon: '⚖️',  label: 'Balanced Moderator',    color: '#6366f1' },
  { key: 'analytical',     icon: '🔬',  label: 'Analytical Scholar',    color: '#0ea5e9' },
  { key: 'aggressive',     icon: '⚔️',  label: 'Aggressive Debater',    color: '#ef4444' },
  { key: 'philosophical',  icon: '🧠',  label: 'Philosopher',           color: '#a855f7' },
  { key: 'pragmatic',      icon: '📊',  label: 'Policy Pragmatist',     color: '#10b981' },
  { key: 'ethical',        icon: '🌍',  label: 'Ethical Advocate',      color: '#f59e0b' },
  { key: 'devil_advocate', icon: '😈',  label: "Devil's Advocate",      color: '#f97316' },
  { key: 'coach',          icon: '🏆',  label: 'Socratic Coach',        color: '#14b8a6' },
]

const SAMPLE_TOPICS = [
  'Artificial intelligence should be regulated by governments',
  'Social media does more harm than good',
  'Climate change requires immediate radical action',
  'Universal basic income should be implemented',
  'Renewable energy can fully replace fossil fuels by 2040',
]

export default function DebateSimulation() {
  const [phase, setPhase]           = useState('setup')  // setup | debate | results
  const [topic, setTopic]           = useState(SAMPLE_TOPICS[0])
  const [userPos, setUserPos]       = useState('proposition')
  const [persona, setPersona]       = useState('balanced')
  const [turns, setTurns]           = useState([])
  const [userSpeech, setUserSpeech] = useState('')
  const [loading, setLoading]       = useState(false)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [totalTurns]                = useState(6)
  const [aiPosition, setAiPosition] = useState('opposition')
  const [sessionId, setSessionId]   = useState('')
  const [error, setError]           = useState('')
  const [coaching, setCoaching]     = useState('')
  const [strategy, setStrategy]     = useState('')
  const bottomRef = useRef(null)

  // Counterargument tool
  const [counterText, setCounterText] = useState('')
  const [counterResult, setCounterResult] = useState(null)
  const [counterLoading, setCounterLoading] = useState(false)
  const [showCounter, setShowCounter] = useState(false)

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
    const newTurns = [...turns, { role: 'user', content: userSpeech, label: `You (Turn ${currentTurn})`, turn: currentTurn }]
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
      setTurns(prev => [...prev, {
        role: 'ai',
        content: d.ai_response,
        label: `AI Opponent (Turn ${currentTurn})`,
        turn: currentTurn,
        isFinal: d.is_final_turn,
      }])
      if (d.is_final_turn) {
        setPhase('results')
      } else {
        setCurrentTurn(prev => prev + 1)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process turn.')
      setTurns(newTurns) // keep user speech visible
    } finally {
      setLoading(false)
    }
  }

  const generateCounters = async () => {
    if (!counterText.trim() || counterText.trim().length < 20) return
    setCounterLoading(true)
    try {
      const res = await api.post('/simulation/counterarguments', {
        argument_text: counterText,
        topic: topic || undefined,
        num_counters: 3,
      })
      setCounterResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate counterarguments.')
    } finally {
      setCounterLoading(false)
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
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">🤖 AI Debate Simulation</h1>
            <p className="page-subtitle">Engage in multi-turn debates with intelligent AI opponents</p>
          </div>
          {phase !== 'setup' && (
            <button className="btn btn-secondary" onClick={resetSimulation}>↩ New Simulation</button>
          )}
        </div>

        {/* ── SETUP PHASE ── */}
        {phase === 'setup' && (
          <div className="sim-setup-grid">
            <div className="card">
              <h2 className="card-title">🎯 Debate Configuration</h2>
              <div className="form-group">
                <label>Motion / Topic</label>
                <input
                  className="form-input"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Enter debate motion..."
                />
                <div className="sample-chips">
                  {SAMPLE_TOPICS.map(t => (
                    <button key={t} className="chip" onClick={() => setTopic(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Your Position</label>
                  <select className="form-input" value={userPos} onChange={e => setUserPos(e.target.value)}>
                    <option value="proposition">Proposition (For)</option>
                    <option value="opposition">Opposition (Against)</option>
                  </select>
                </div>
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button
                className="btn btn-primary btn-lg"
                onClick={startSimulation}
                disabled={loading || !topic.trim()}
              >
                {loading ? '⏳ Starting...' : '🚀 Start Debate'}
              </button>
            </div>

            <div className="card">
              <h2 className="card-title">🎭 Choose AI Opponent</h2>
              <div className="persona-grid">
                {PERSONAS.map(p => (
                  <button
                    key={p.key}
                    className={`persona-card ${persona === p.key ? 'selected' : ''}`}
                    style={{ '--persona-color': p.color }}
                    onClick={() => setPersona(p.key)}
                  >
                    <span className="persona-icon">{p.icon}</span>
                    <span className="persona-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DEBATE PHASE ── */}
        {(phase === 'debate' || phase === 'results') && (
          <div className="debate-layout">
            {/* Main debate arena */}
            <div className="debate-arena">
              {/* Progress bar */}
              <div className="turn-progress">
                <div className="turn-info">
                  <span>Turn {Math.min(currentTurn, totalTurns)} of {totalTurns}</span>
                  <span style={{ color: selectedPersona?.color }}>{selectedPersona?.icon} {selectedPersona?.label}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressPct}%`, background: selectedPersona?.color }} />
                </div>
              </div>

              {/* Topic badge */}
              <div className="topic-badge">
                <span className="badge-label">Motion:</span> {topic}
                <span className="position-chips">
                  <span className="chip chip-blue">You: {userPos}</span>
                  <span className="chip chip-red">AI: {aiPosition}</span>
                </span>
              </div>

              {/* Turns */}
              <div className="turns-list">
                {turns.map((turn, i) => (
                  <div key={i} className={`turn-bubble ${turn.role === 'user' ? 'user-turn' : 'ai-turn'}`}>
                    <div className="turn-header">
                      <span className="turn-label">{turn.label}</span>
                      {turn.isFinal && <span className="badge badge-gold">🏁 Final Turn</span>}
                    </div>
                    <div className="turn-text">{turn.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="turn-bubble ai-turn typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              {phase === 'debate' && (
                <div className="speech-input-area">
                  {coaching && (
                    <div className="coaching-banner">
                      <div className="coaching-header">💬 Coaching Feedback</div>
                      <pre className="coaching-text">{coaching}</pre>
                    </div>
                  )}
                  <textarea
                    className="speech-textarea"
                    placeholder={`Deliver your Turn ${currentTurn} speech... (${userPos === 'proposition' ? 'Argue FOR the motion' : 'Argue AGAINST the motion'})`}
                    value={userSpeech}
                    onChange={e => setUserSpeech(e.target.value)}
                    rows={5}
                    disabled={loading}
                  />
                  <div className="speech-footer">
                    <span className="word-count">{userSpeech.split(/\s+/).filter(Boolean).length} words</span>
                    {error && <span className="error-inline">{error}</span>}
                    <button
                      className="btn btn-primary"
                      onClick={submitSpeech}
                      disabled={loading || !userSpeech.trim()}
                    >
                      {loading ? '⏳ Processing...' : '🎤 Submit Speech'}
                    </button>
                  </div>
                </div>
              )}

              {/* Results */}
              {phase === 'results' && (
                <div className="results-panel">
                  <h3>🏁 Debate Complete</h3>
                  <p>You completed {totalTurns} turns on: <em>{topic}</em></p>
                  <p>Position: <strong>{userPos}</strong> | Opponent: <strong>{selectedPersona?.label}</strong></p>
                  {strategy && (
                    <div className="strategy-tip">
                      <strong>💡 Final Strategy Tip:</strong> {strategy}
                    </div>
                  )}
                  <div className="results-actions">
                    <button className="btn btn-primary" onClick={resetSimulation}>🔄 New Simulation</button>
                    <button className="btn btn-secondary" onClick={() => setShowCounter(true)}>🥊 Generate Counterarguments</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar panel */}
            <div className="sim-sidebar">
              {strategy && (
                <div className="card strategy-card">
                  <h3 className="card-title">💡 Strategy Tip</h3>
                  <p className="strategy-text">{strategy}</p>
                </div>
              )}

              {/* Counterargument tool */}
              <div className="card">
                <h3 className="card-title">🥊 Counterargument Generator</h3>
                <textarea
                  className="form-input"
                  placeholder="Paste any argument to generate counters..."
                  value={counterText}
                  onChange={e => setCounterText(e.target.value)}
                  rows={4}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={generateCounters}
                  disabled={counterLoading || counterText.length < 20}
                >
                  {counterLoading ? '⏳ Generating...' : '⚡ Generate Counters'}
                </button>
                {counterResult && (
                  <div className="counter-results">
                    {counterResult.counterarguments?.map((c, i) => (
                      <div key={i} className="counter-item">
                        <div className="counter-type">{c.type}</div>
                        <p className="counter-text">{c.counter}</p>
                      </div>
                    ))}
                    <div className="challenge-questions">
                      <strong>Challenge Questions:</strong>
                      {counterResult.challenge_questions?.map((q, i) => (
                        <div key={i} className="challenge-q">❓ {q}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
