import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const formatLabel = (value) => value?.replaceAll('_', ' ') || ''

export default function DebateDetail() {
  const { debateId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [debate, setDebate] = useState(null)
  const [participants, setParticipants] = useState([])
  const [argumentsList, setArgumentsList] = useState([])
  const [coachingHistory, setCoachingHistory] = useState([])
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [position, setPosition] = useState('for')
  const [newArgument, setNewArgument] = useState({ content: '', position: 'neutral' })
  const [argumentKey, setArgumentKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [coachLoading, setCoachLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState('scheduled')

  async function load() {
    const [debateResult, participantResult, argumentResult, coachingResult] = await Promise.allSettled([
      api.get(`/debates/${debateId}`),
      api.get(`/debates/${debateId}/participants`),
      api.get(`/debates/${debateId}/arguments`),
      api.get(`/debates/${debateId}/coach-feedback`),
    ])

    if (debateResult.status === 'rejected') {
      setError(debateResult.reason.response?.data?.detail || 'Unable to load this session.')
      setLoading(false)
      return
    }

    const loadedDebate = debateResult.value.data
    const loadedParticipants = participantResult.status === 'fulfilled' ? participantResult.value.data : []
    setDebate(loadedDebate)
    setStatus(loadedDebate.status)
    setParticipants(loadedParticipants)
    const loadedArguments = argumentResult.status === 'fulfilled' ? argumentResult.value.data : []
    setArgumentsList(loadedArguments)

    const lastMessage = loadedArguments[loadedArguments.length - 1]
    const isPending = Boolean(
      loadedDebate.ai_opponent &&
      lastMessage &&
      !lastMessage.is_ai &&
      lastMessage.user_id === user?.id
    )

    if (isPending && lastMessage.request_key) {
      setArgumentKey(lastMessage.request_key)
    } else {
      setArgumentKey('')
    }

    const savedFeedback = coachingResult.status === 'fulfilled' ? coachingResult.value.data : []
    setCoachingHistory(savedFeedback)

    if (argumentResult.status === 'rejected') {
      setError(argumentResult.reason.response?.data?.detail || 'Unable to load debate messages.')
    } else if (participantResult.status === 'rejected' || coachingResult.status === 'rejected') {
      setError('Some session history could not be loaded. Refresh to retry.')
    } else {
      setError('')
    }
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [debateId])

  async function join() {
    try {
      setError('')
      await api.post(`/debates/${debateId}/join?position=${position}`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to join session.')
    }
  }

  async function leaveSession() {
    try {
      setError('')
      await api.delete(`/debates/${debateId}/participants/${user.id}`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to leave this session.')
    }
  }

  async function submitArgument(event) {
    event.preventDefault()
    if (submitting || !newArgument.content.trim()) return

    const idempotencyKey = argumentKey || globalThis.crypto?.randomUUID?.() || `turn-${Date.now()}`
    setArgumentKey(idempotencyKey)
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/debates/${debateId}/arguments`, {
        content: newArgument.content,
        position: currentParticipant?.position || newArgument.position,
        idempotency_key: idempotencyKey,
      })
      setNewArgument({ content: '', position: currentParticipant?.position || 'neutral' })
      setArgumentKey('')
      await load()
    } catch (requestError) {
      await load()
      setError(requestError.response?.data?.detail || 'Unable to submit your argument.')
    } finally {
      setSubmitting(false)
    }
  }

  async function retryOpponent() {
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/debates/${debateId}/retry-opponent`)
      await load()
    } catch (requestError) {
      await load()
      setError(requestError.response?.data?.detail || 'Unable to generate opponent response. Please retry in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  async function requestCoachFeedback() {
    setCoachLoading(true)
    setError('')
    try {
      await api.post(`/debates/${debateId}/coach-feedback`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to generate coaching feedback.')
    } finally {
      setCoachLoading(false)
    }
  }

  async function updateStatus() {
    try {
      await api.put(`/debates/${debateId}`, { status })
      setEditing(false)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to update session.')
    }
  }

  async function deleteDebate() {
    if (!window.confirm('Delete this debate session?')) return
    try {
      await api.delete(`/debates/${debateId}`)
      navigate('/debates')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to delete session.')
    }
  }

  async function downloadReport(format) {
    try {
      const response = await api.get(`/reports/debate/${debateId}/export?format=${format}`, {
        responseType: 'blob',
      })
      const ext = format === 'excel' ? 'xls' : format
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `debate-${debateId}-report.${ext}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to export debate report.')
    }
  }

  if (loading) return <div className="loading-state">Loading debate history...</div>
  if (!debate) return <section className="page-stack"><p className="error-message">{error || 'This debate could not be loaded.'}</p><Link to="/debates">Back to sessions</Link></section>

  const creator = debate.created_by === user?.id
  const currentParticipant = participants.find((participant) => participant.user_id === user?.id)
  const canJoin = !creator && !currentParticipant && debate.status !== 'completed' && debate.status !== 'cancelled'
  const ownArguments = argumentsList.filter((argument) => argument.user_id === user?.id && !argument.is_ai)

  const activeFeedback = (selectedReportId ? coachingHistory.find((r) => r.id === selectedReportId) : null) || coachingHistory[0] || null
  const plan = activeFeedback?.improvement_plan

  const lastMessage = argumentsList[argumentsList.length - 1]
  const isOpponentPending = Boolean(
    debate.ai_opponent &&
    lastMessage &&
    !lastMessage.is_ai &&
    lastMessage.user_id === user?.id
  )

  const userPosition = currentParticipant?.position || 'neutral'
  const aiParticipant = participants.find((p) => p.is_ai)
  const aiPosition = aiParticipant?.position || (userPosition === 'for' ? 'against' : userPosition === 'against' ? 'for' : 'opposing')

  return (
    <section className="page-stack debate-workspace">
      <Link to="/debates" className="back-link">← Back to sessions</Link>

      <div className="page-heading">
        <div>
          <p className="eyebrow">Debate / Sparring Workspace</p>
          <h1>{debate.topic}</h1>
        </div>
        <div className="heading-actions">
          <span className={`status status-${debate.status}`}>{debate.status}</span>
          <div className="export-pill-group">
            <button type="button" className="small-button secondary" onClick={() => downloadReport('pdf')}>Export PDF</button>
            <button type="button" className="small-button secondary" onClick={() => downloadReport('excel')}>Export Excel</button>
          </div>
        </div>
      </div>

      {/* 1 / DEBATE DETAILS & POSITIONS */}
      <article className="detail-panel">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">1 / Debate Setup & Positions</p>
            <h2>{formatLabel(debate.format)} Debate</h2>
          </div>
          {creator && (
            <div className="inline-form">
              {editing ? (
                <>
                  <select aria-label="Debate status" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="scheduled">scheduled</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button type="button" className="button" onClick={updateStatus}>Save status</button>
                </>
              ) : (
                <>
                  <button type="button" className="button secondary" onClick={() => setEditing(true)}>Edit status</button>
                  <button type="button" className="button danger" onClick={deleteDebate}>Delete session</button>
                </>
              )}
            </div>
          )}
        </div>

        <p style={{ margin: '6px 0 16px', color: 'var(--text-muted)' }}>
          {debate.description || 'No additional rules or description provided.'}
        </p>

        {/* Positions Grid */}
        <div className="positions-grid">
          <div className="position-card user-stance">
            <div className="position-avatar user-avatar">{user?.name ? user.name[0].toUpperCase() : 'U'}</div>
            <div className="position-card-content">
              <span className="position-role-title">Your Assigned Stance</span>
              <span className="position-name">{user?.name || 'You'}</span>
              <span className={`stance-pill ${userPosition}`}>{userPosition.toUpperCase()}</span>
            </div>
          </div>
          {debate.ai_opponent && (
            <div className="position-card ai-stance">
              <div className="position-avatar ai-avatar">🤖</div>
              <div className="position-card-content">
                <span className="position-role-title">AI Debate Opponent</span>
                <span className="position-name">AI Opponent</span>
                <span className={`stance-pill ${aiPosition}`}>{aiPosition.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Join / Leave Actions */}
        {currentParticipant ? (
          <div className="inline-form" style={{ marginTop: 12 }}>
            <span className="muted">Your position: <strong>{currentParticipant.position.toUpperCase()}</strong></span>
            {!creator && <button type="button" className="button secondary" onClick={leaveSession}>Leave session</button>}
          </div>
        ) : canJoin ? (
          <div className="inline-form" style={{ marginTop: 12 }}>
            <label className="join-position">
              Choose your position
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                <option value="neutral">Neutral</option>
                <option value="for">For</option>
                <option value="against">Against</option>
              </select>
            </label>
            <button type="button" className="button" onClick={join}>Join debate</button>
          </div>
        ) : null}
      </article>

      {/* 2 / AI OPPONENT & CONVERSATION STREAM */}
      <article className="detail-panel">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">2 / AI Opponent & Sparring</p>
            <h2>{debate.ai_opponent ? 'Debate Conversation' : 'Participant Messages'}</h2>
          </div>
          <span className="turn-pill">{argumentsList.length} {argumentsList.length === 1 ? 'Turn' : 'Turns'}</span>
        </div>

        {debate.ai_opponent && argumentsList.length === 0 && (
          <p className="muted">The AI opponent will respond with a short, 2–4 sentence counterargument after your opening turn.</p>
        )}

        <div className="conversation-stream" aria-live="polite">
          {argumentsList.map((argument) => {
            const isAI = argument.is_ai
            const words = argument.content?.trim().split(/\s+/).filter(Boolean).length || 0
            return (
              <article className={`conversation-card ${isAI ? 'opponent-card' : 'user-card'}`} key={argument.id}>
                <div className="conversation-card-header">
                  <div className="conversation-card-author">
                    <div className={`author-icon ${isAI ? 'ai' : 'user'}`}>
                      {isAI ? '🤖' : (argument.author_name ? argument.author_name[0].toUpperCase() : 'U')}
                    </div>
                    <div>
                      <span className="author-name-text">
                        {isAI ? 'AI Opponent' : (argument.author_name || (argument.user_id === user?.id ? 'You' : `User #${argument.user_id}`))}
                      </span>
                    </div>
                    <span className={`stance-pill ${argument.position}`}>{argument.position.toUpperCase()}</span>
                  </div>
                  <span className="turn-pill">Turn {argument.turn_order}</span>
                </div>

                <p className="conversation-card-body">{argument.content}</p>

                <div className="conversation-card-footer">
                  <time dateTime={argument.created_at}>{new Date(argument.created_at).toLocaleString()}</time>
                  <span className="word-count-badge">{words} {words === 1 ? 'word' : 'words'}</span>
                </div>
              </article>
            )
          })}

          {/* Pending Opponent Loading State */}
          {submitting && (
            <div className="pending-ai-card">
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
              <span className="pending-ai-text">AI Opponent is thinking and crafting a short counterargument...</span>
            </div>
          )}

          {/* Inline Retry Box when AI Opponent response failed */}
          {isOpponentPending && !submitting && error && (
            <div className="inline-retry-box" role="alert">
              <div className="inline-retry-content">
                <span className="inline-retry-title">⚠️ Opponent response could not be generated</span>
                <span className="inline-retry-desc">{error}</span>
                <span className="help-text">Your argument was safely recorded. Click retry below to generate the opponent's rebuttal.</span>
              </div>
              <div className="retry-action-row">
                <button type="button" className="retry-action-btn" onClick={retryOpponent} disabled={submitting}>
                  🔄 Retry Opponent Response
                </button>
              </div>
            </div>
          )}

          {argumentsList.length === 0 && !submitting && (
            <p className="empty-state">No messages yet. Submit your opening argument below to begin the debate.</p>
          )}
        </div>
      </article>

      {/* 3 / YOUR ARGUMENT */}
      <article className="detail-panel">
        <p className="eyebrow">3 / Your Argument</p>
        <h2>{isOpponentPending ? 'Opponent Turn in Progress' : 'Make Your Next Point'}</h2>

        {currentParticipant || creator ? (
          isOpponentPending ? (
            <div className="opponent-waiting-box">
              <div className="opponent-waiting-header">
                <span>⏳ Your argument (Turn {lastMessage.turn_order}) is saved</span>
                <span className={`stance-pill ${lastMessage.position}`}>{lastMessage.position.toUpperCase()}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                The AI opponent must respond before you can take your next turn.
              </p>
              {error ? (
                <div className="inline-retry-box">
                  <span className="inline-retry-desc">{error}</span>
                  <button type="button" className="retry-action-btn" onClick={retryOpponent} disabled={submitting}>
                    {submitting ? 'Generating counterargument...' : '🔄 Retry Opponent Response'}
                  </button>
                </div>
              ) : (
                <button type="button" className="button secondary" onClick={retryOpponent} disabled={submitting}>
                  {submitting ? 'Generating counterargument...' : '🔄 Request / Retry Opponent Response'}
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={submitArgument} className="form-card">
              <div className="inline-form" style={{ marginBottom: 4 }}>
                <label style={{ flex: 1 }}>
                  Position
                  <select
                    value={currentParticipant?.position !== 'neutral' ? currentParticipant.position : newArgument.position}
                    disabled={Boolean(currentParticipant && currentParticipant.position !== 'neutral')}
                    onChange={(event) => setNewArgument({ ...newArgument, position: event.target.value })}
                  >
                    <option value="neutral">Neutral</option>
                    <option value="for">For</option>
                    <option value="against">Against</option>
                  </select>
                </label>
              </div>
              <label>
                Argument or Rebuttal
                <textarea
                  rows="4"
                  value={newArgument.content}
                  onChange={(event) => setNewArgument({ ...newArgument, content: event.target.value })}
                  placeholder="State a single, focused claim with supporting evidence or reasoning (2-4 sentences recommended)..."
                  required
                  minLength="10"
                  maxLength="5000"
                  disabled={submitting}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="help-text">
                  {newArgument.content.length > 0 ? `${newArgument.content.trim().split(/\s+/).filter(Boolean).length} words` : 'Minimum 10 characters'}
                </span>
                <button className="button" type="submit" disabled={submitting || newArgument.content.trim().length < 10}>
                  {submitting ? 'Sending argument...' : debate.ai_opponent ? 'Submit & get AI response' : 'Submit argument'}
                </button>
              </div>
              {submitting && <p role="status" className="muted">Saving your argument and requesting the AI opponent counterpoint...</p>}
            </form>
          )
        ) : (
          <p className="muted">Join the debate to submit an argument.</p>
        )}
      </article>

      {/* 4 / COACH FEEDBACK */}
      <article className="detail-panel">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">4 / Coach Feedback</p>
            <h2>Review Your Debate Performance</h2>
          </div>
          <button
            type="button"
            className="button"
            onClick={requestCoachFeedback}
            disabled={coachLoading || ownArguments.length === 0}
          >
            {coachLoading ? 'Generating feedback...' : 'Request Coaching Assessment'}
          </button>
        </div>

        <p className="ai-disclaimer-note">
          ℹ️ Assessment is automated AI-generated instructional feedback based on your debate turns, not an objective or guaranteed measurement.
        </p>

        {ownArguments.length === 0 && (
          <p className="muted" style={{ marginTop: 8 }}>
            Submit at least one argument before requesting coaching feedback.
          </p>
        )}

        {activeFeedback ? (
          <div className="coaching-section">
            {/* Overall Score Banner */}
            <div className="coaching-hero-card">
              <div className="score-ring-badge">
                {activeFeedback.overall_score === null ? '—' : Math.round(activeFeedback.overall_score)}
                <small>/ 100</small>
              </div>
              <div className="score-summary-text">
                <h2>Overall Coaching Assessment</h2>
                <p>{activeFeedback.overall_assessment}</p>
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Evaluated from {activeFeedback.source_argument_count} user turns · Generated {new Date(activeFeedback.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Individual Score Meters */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '14px 0 8px', color: 'var(--text-main)' }}>
                Core Debate Competency Breakdown
              </h3>
              <div className="score-grid">
                {Object.entries(activeFeedback.category_scores || {}).map(([name, detail]) => {
                  const scoreVal = detail.score ?? 0
                  return (
                    <div className="score-card" key={name}>
                      <div className="score-card-header">
                        <span className="score-card-criterion">{formatLabel(name)}</span>
                        <span className="score-card-value">
                          {detail.score === null ? 'N/A' : `${detail.score}/100`}
                        </span>
                      </div>
                      <div className="score-meter-bar">
                        <div
                          className="score-meter-fill"
                          style={{ width: `${Math.min(100, Math.max(0, scoreVal))}%` }}
                        />
                      </div>
                      <p>{detail.explanation}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Structured Strengths / Weaknesses / Suggestions */}
            <div className="feedback-columns">
              <div className="feedback-col-card strengths">
                <h3>Key Strengths</h3>
                <ul>
                  {activeFeedback.strengths?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="feedback-col-card improvements">
                <h3>Areas to Improve</h3>
                <ul>
                  {activeFeedback.weaknesses?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="feedback-col-card suggestions">
                <h3>Actionable Suggestions</h3>
                <ul>
                  {activeFeedback.improvement_suggestions?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-state">No saved coaching feedback for this debate yet.</p>
        )}
      </article>

      {/* 5 / IMPROVEMENT PLAN */}
      <article className="detail-panel">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">5 / Improvement Plan</p>
            <h2>Targeted Practice For Next Debate</h2>
          </div>
        </div>

        {plan ? (
          <div className="plan-grid">
            <div className="plan-card">
              <h3>⭐ Strongest Skills</h3>
              <ul>
                {plan.strongest_skills?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="plan-card">
              <h3>🎯 Focus Areas</h3>
              <ul>
                {plan.areas_for_improvement?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="plan-card">
              <h3>💡 Practice Recommendations</h3>
              <ul>
                {plan.practice_recommendations?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="plan-card">
              <h3>🏁 Next Debate Goal</h3>
              <p style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {plan.measurable_next_debate_goal || 'Aim for one focused claim backed with concrete evidence in each turn.'}
              </p>
            </div>

            <div className="plan-card">
              <h3>📋 Actionable Next Steps</h3>
              <ul>
                {plan.next_steps?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="plan-card">
              <h3>📈 Progress Indicators</h3>
              {plan.progress_indicators?.length ? (
                <ul>
                  {plan.progress_indicators.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Participate in more rounds to unlock longitudinal progress trends.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="empty-state">Request coaching above to generate a tailored improvement plan from your debate messages.</p>
        )}
      </article>

      {/* 6 / DEBATE HISTORY */}
      <article className="detail-panel">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">6 / Debate History</p>
            <h2>Saved Coaching Reports ({coachingHistory.length})</h2>
          </div>
        </div>

        {coachingHistory.length ? (
          <div className="coaching-reports-grid">
            {coachingHistory.map((record) => {
              const isSelected = activeFeedback?.id === record.id
              return (
                <div
                  className={`coaching-report-card ${isSelected ? 'active-report' : ''}`}
                  key={record.id}
                  onClick={() => setSelectedReportId(record.id)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-light)',
                    background: isSelected ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.04), #ffffff)' : '#ffffff',
                    borderLeft: isSelected ? '4px solid var(--primary)' : '1px solid var(--border-light)',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedReportId(record.id) }}
                >
                  <div className="coaching-report-card-header">
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {new Date(record.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="analysis-card-score">
                      {record.overall_score === null ? 'N/A' : `${Math.round(record.overall_score)}/100`}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-main)',
                    margin: '4px 0',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {record.overall_assessment}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <small style={{ color: 'var(--text-light)', fontSize: '0.74rem' }}>
                      {record.source_argument_count} {record.source_argument_count === 1 ? 'argument' : 'arguments'} evaluated
                    </small>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                    }}>
                      {isSelected ? '✓ Currently Viewing' : 'Click to view'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="empty-state">No saved coaching reports for this debate yet.</p>
        )}
      </article>
    </section>
  )
}
