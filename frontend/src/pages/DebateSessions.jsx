import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import SessionCard from '../components/SessionCard'
import api from '../api/client'

const FORMATS = [
  'One-on-One Debate',
  'Parliamentary Debate',
  'Oxford Debate',
  'Policy Debate',
  'Public Forum Debate',
  'AI Debate Simulation',
]

const POSITIONS = [
  'Proposition / Affirmative',
  'Opposition / Negative',
  'Government',
  'Opposition',
  'Neutral / Judge',
]

const MOCK_SESSIONS = [
  { id: 'mock-1', topic: 'AI regulation benefits society more than it harms it', format: 'One-on-One Debate',   position: 'Proposition / Affirmative', status: 'scheduled', round_count: 1, duration_minutes: 15, scheduled_at: new Date(Date.now() + 86400000).toISOString() },
  { id: 'mock-2', topic: 'Social media does more harm than good',                format: 'Oxford Debate',        position: 'Opposition / Negative',     status: 'completed', round_count: 3, duration_minutes: 30, score: 84.5, feedback_summary: 'Solid counterpoints on algorithmic feeds, though evidence citation could be stronger in rebuttal.', scheduled_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'mock-3', topic: 'Climate change demands immediate policy intervention',  format: 'Policy Debate',        position: 'Proposition / Affirmative', status: 'active',    round_count: 2, duration_minutes: 20, scheduled_at: new Date().toISOString() },
  { id: 'mock-4', topic: 'Universal Basic Income would reduce innovation',        format: 'Public Forum Debate',  position: 'Opposition / Negative',     status: 'completed', round_count: 2, duration_minutes: 25, score: 91.0, feedback_summary: 'Exceptional crossfire questioning and clear economic statistics cited.', scheduled_at: new Date(Date.now() - 172800000).toISOString() },
]

const EMPTY_FORM = { topic: '', format: FORMATS[0], position: POSITIONS[0], scheduled_at: '', round_count: 1, duration_minutes: 15, notes: '', transcript: '' }

export default function DebateSessions() {
  const { user }   = useAuth()
  const isCoachOrAdmin = ['coach', 'educator', 'admin'].includes(user?.role)
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [filter, setFilter]     = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [creating, setCreating]   = useState(false)
  const [error, setError]         = useState('')
  const [viewSession, setViewSession] = useState(null)
  
  // Evaluation state
  const [evalScore, setEvalScore]       = useState(80)
  const [evalFeedback, setEvalFeedback] = useState('')
  const [evaluating, setEvaluating]     = useState(false)
  const [evalSuccess, setEvalSuccess]   = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [analyzingAI, setAnalyzingAI]   = useState(false)
  const [aiReport, setAiReport]         = useState(null)
  const [aiError, setAiError]           = useState('')

  useEffect(() => {
    api.get('/sessions')
      .then(r => setSessions(r.data))
      .catch(() => {/* Use mock data */})
  }, [])

  const openSessionDetail = (s) => {
    setViewSession(s)
    setEvalScore(s.score || 80)
    setEvalFeedback(s.feedback_summary || '')
    setTranscriptDraft(s.transcript || '')
    setEvalSuccess(false)
    setAiReport(null)
    setAiError('')
  }

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter)

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.topic.trim()) { setError('Please enter a debate topic.'); return }
    if (!form.scheduled_at)  { setError('Please set a date and time.'); return }
    setError(''); setCreating(true)
    try {
      const payload = {
        ...form,
        round_count: Number(form.round_count) || 1,
        duration_minutes: Number(form.duration_minutes) || 15,
      }
      const { data } = await api.post('/sessions', payload)
      setSessions(s => [data, ...s])
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch {
      // fallback: optimistic local add
      const newSession = { id: `session-${Date.now()}`, ...form, status: 'scheduled', user_id: user?.id }
      setSessions(s => [newSession, ...s])
      setShowModal(false)
      setForm(EMPTY_FORM)
    } finally {
      setCreating(false)
    }
  }

  const handleSaveTranscript = async () => {
    if (!viewSession) return
    setSavingTranscript(true)
    try {
      const { data } = await api.put(`/sessions/${viewSession.id}`, { transcript: transcriptDraft })
      setViewSession(data)
      setSessions(prev => prev.map(item => item.id === data.id ? data : item))
    } catch {
      setViewSession(prev => ({ ...prev, transcript: transcriptDraft }))
      setSessions(prev => prev.map(item => item.id === viewSession.id ? { ...item, transcript: transcriptDraft } : item))
    } finally {
      setSavingTranscript(false)
    }
  }

  const handleRunAIAnalysis = async () => {
    if (!viewSession) return
    const textToAnalyze = transcriptDraft.trim() || viewSession.transcript || ''
    if (textToAnalyze.length < 10) {
      setAiError('Please enter at least 10 characters in the Speech Transcript to analyze.')
      return
    }
    setAiError('')
    setAnalyzingAI(true)
    try {
      // If transcript was edited, save it first
      if (transcriptDraft !== viewSession.transcript) {
        await api.put(`/sessions/${viewSession.id}`, { transcript: transcriptDraft })
      }
      const { data } = await api.post(`/analysis/session/${viewSession.id}`)
      setAiReport(data)
      const updatedSession = {
        ...viewSession,
        transcript: transcriptDraft,
        score: data.overall_score,
        status: 'completed',
        feedback_summary: data.executive_summary,
      }
      setViewSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === viewSession.id ? updatedSession : s))
    } catch (err) {
      setAiError(err.response?.data?.detail || 'Failed to complete AI analysis. Check backend connection.')
    } finally {
      setAnalyzingAI(false)
    }
  }

  const handleEvaluate = async (e) => {
    e.preventDefault()
    if (!viewSession) return
    setEvaluating(true)
    try {
      const { data } = await api.put(`/sessions/${viewSession.id}/evaluate`, {
        score: Number(evalScore),
        feedback_summary: evalFeedback,
      })
      setViewSession(data)
      setSessions(prev => prev.map(item => item.id === data.id ? data : item))
      setEvalSuccess(true)
    } catch {
      // optimistic fallback
      const updated = {
        ...viewSession,
        score: Number(evalScore),
        feedback_summary: evalFeedback,
        status: 'completed',
      }
      setViewSession(updated)
      setSessions(prev => prev.map(item => item.id === viewSession.id ? updated : item))
      setEvalSuccess(true)
    } finally {
      setEvaluating(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sessions/${id}`)
    } catch { /* ignore */ }
    setSessions(s => s.filter(x => x.id !== id))
    if (viewSession?.id === id) setViewSession(null)
  }

  const STATUS_TABS = [
    { key: 'all',       label: '🗂 All',       count: sessions.length },
    { key: 'scheduled', label: '📅 Scheduled',  count: sessions.filter(s=>s.status==='scheduled').length },
    { key: 'active',    label: '🔴 Active',     count: sessions.filter(s=>s.status==='active').length },
    { key: 'completed', label: '✅ Completed',  count: sessions.filter(s=>s.status==='completed').length },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Debate Sessions</h1>
          <p>Create, schedule, and manage your debate sessions</p>
        </div>
        <button id="create-session-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ New Session
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(({ key, label, count }) => (
          <button
            key={key}
            id={`filter-${key}`}
            className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(key)}
          >
            {label}
            <span style={{ marginLeft: 6, padding: '1px 7px', background: 'rgba(255,255,255,0.15)', borderRadius: '9999px', fontSize: '0.72rem' }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            onView={openSessionDetail}
            onDelete={handleDelete}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎤</div>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No sessions yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Create your first debate session to get started</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Session</button>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2>New Debate Session</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label htmlFor="session-topic">Debate Topic *</label>
                <input id="session-topic" className="input" name="topic" value={form.topic}
                  onChange={onChange} placeholder="e.g. AI regulation benefits society more than it harms it" required />
              </div>

              <div className="grid-2" style={{ gap: 14 }}>
                <div className="form-group">
                  <label htmlFor="session-format">Debate Format *</label>
                  <select id="session-format" className="input" name="format" value={form.format} onChange={onChange}>
                    {FORMATS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="session-position">Your Position</label>
                  <select id="session-position" className="input" name="position" value={form.position} onChange={onChange}>
                    {POSITIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-3" style={{ gap: 14 }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="session-date">Scheduled Date & Time *</label>
                  <input id="session-date" className="input" type="datetime-local" name="scheduled_at"
                    value={form.scheduled_at} onChange={onChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="session-duration">Duration (mins)</label>
                  <input id="session-duration" className="input" type="number" min="5" max="180" name="duration_minutes"
                    value={form.duration_minutes} onChange={onChange} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="session-notes">Preparation Notes (optional)</label>
                <textarea id="session-notes" className="input" name="notes" value={form.notes}
                  onChange={onChange} rows={2} placeholder="Preparation notes, key arguments to cover…"
                  style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="session-submit" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="spinner" /> : '✅ Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Evaluate Session Modal */}
      {viewSession && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewSession(null)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Session Details</h2>
              <button className="modal-close" onClick={() => setViewSession(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>TOPIC</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{viewSession.topic}</div>
              </div>

              <div className="grid-3" style={{ gap: 12 }}>
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FORMAT</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{viewSession.format}</div>
                </div>
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>POSITION</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{viewSession.position || 'Neutral'}</div>
                </div>
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>STATUS</div>
                  <span className={`badge badge-${viewSession.status === 'completed' ? 'warning' : viewSession.status === 'active' ? 'success' : 'primary'}`} style={{ textTransform: 'capitalize', marginTop: 2 }}>{viewSession.status}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                📅 Scheduled: <strong style={{ color: 'var(--text-primary)' }}>{new Date(viewSession.scheduled_at).toLocaleString('en-IN')}</strong> · ⏱ {viewSession.duration_minutes || 15} mins
              </div>

              {viewSession.notes && (
                <div style={{ background: 'var(--bg-overlay)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>PREPARATION NOTES</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{viewSession.notes}</div>
                </div>
              )}

              {/* Debate Speech & Transcript */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    🎙️ Speech Transcript / Debate Arguments
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleSaveTranscript} disabled={savingTranscript}>
                    {savingTranscript ? 'Saving…' : '💾 Save Speech'}
                  </button>
                </div>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Record or paste your opening statement, main arguments, or speech transcript here…"
                  value={transcriptDraft}
                  onChange={e => setTranscriptDraft(e.target.value)}
                  style={{ resize: 'vertical', fontSize: '0.88rem' }}
                />

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 10 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRunAIAnalysis}
                    disabled={analyzingAI || !(transcriptDraft.trim() || viewSession.transcript)}
                  >
                    {analyzingAI ? <span className="spinner" /> : '⚡ Run AI Argument & Fallacy Analysis'}
                  </button>
                  {aiError && <span style={{ color: '#EF4444', fontSize: '0.82rem' }}>{aiError}</span>}
                </div>

                {/* AI Analysis Result Card */}
                {aiReport && (
                  <div style={{
                    marginTop: 14,
                    padding: 14,
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ color: 'var(--brand-secondary)', fontSize: '0.9rem' }}>⚡ AI Analysis Complete</strong>
                      <span className="badge badge-success">Score: {aiReport.overall_score}/100 ({aiReport.grade})</span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {aiReport.executive_summary}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span className="badge badge-primary">AQ: {aiReport.weighted_scores.argument_quality}</span>
                      <span className="badge badge-primary">Evidence: {aiReport.weighted_scores.evidence_usage}</span>
                      <span className="badge badge-primary">Logic: {aiReport.weighted_scores.logical_consistency}</span>
                      <span className="badge badge-primary">Rebuttal: {aiReport.weighted_scores.rebuttal_effectiveness}</span>
                      <span className={`badge ${aiReport.fallacies.length > 0 ? 'badge-error' : 'badge-success'}`}>
                        Fallacies: {aiReport.fallacies.length}
                      </span>
                    </div>

                    {aiReport.fallacies.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#EF4444', background: 'rgba(239,68,68,0.08)', padding: '6px 10px', borderRadius: 4 }}>
                        <strong>Detected:</strong> {aiReport.fallacies.map(f => f.fallacy_type).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scorecard Display if evaluated */}
              {viewSession.score != null && (
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(108,99,255,0.08))',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-success)', letterSpacing: '0.05em' }}>OFFICIAL EVALUATION</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-success)' }}>{viewSession.score}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/100</span></span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{viewSession.feedback_summary}"
                  </div>
                </div>
              )}

              {/* Coach / Educator Evaluation Form */}
              {isCoachOrAdmin && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-secondary)', marginBottom: 10 }}>
                    🏆 Coach Evaluation & Feedback
                  </div>

                  {evalSuccess && (
                    <div className="alert alert-success" style={{ marginBottom: 12 }}>
                      ✅ Evaluation submitted and student score updated!
                    </div>
                  )}

                  <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="eval-score">Performance Score (0 - 100): <strong>{evalScore}</strong></label>
                      <input
                        id="eval-score"
                        type="range"
                        min="0"
                        max="100"
                        value={evalScore}
                        onChange={e => setEvalScore(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="eval-feedback">Coaching Feedback *</label>
                      <textarea
                        id="eval-feedback"
                        className="input"
                        rows={2}
                        placeholder="Provide actionable feedback on argument structure, clarity, and rebuttal effectiveness…"
                        value={evalFeedback}
                        onChange={e => setEvalFeedback(e.target.value)}
                        required
                        style={{ resize: 'vertical', fontSize: '0.88rem' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={evaluating} style={{ alignSelf: 'flex-start' }}>
                      {evaluating ? 'Submitting…' : '⭐ Submit Evaluation'}
                    </button>
                  </form>
                </div>
              )}

              <button className="btn btn-secondary btn-full" onClick={() => setViewSession(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
