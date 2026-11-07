import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { resetScrollTop } from '../components/ScrollToTop'
import SessionCard from '../components/SessionCard'
import SessionCreateModal, {
  FORMATS,
  SPEAKER_POSITIONS,
  SESSION_TYPES,
} from '../components/SessionCreateModal'
import api from '../api/client'

const EMPTY_FORM = {
  topic: '',
  format: FORMATS[0],
  position: '1st Proposition / Affirmative Speaker',
  session_type: SESSION_TYPES[0],
  user_id: '',
  scheduled_at: '',
  round_count: 1,
  duration_minutes: 15,
  notes: '',
  transcript: '',
}

export default function DebateSessions() {
  const { user } = useAuth()
  const isLearner = user?.role === 'learner'
  const isCoachOrAdmin = ['coach', 'educator', 'admin'].includes(user?.role)

  const [sessions, setSessions] = useState([])
  const [students, setStudents] = useState([])
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [viewSession, setViewSession] = useState(null)

  // Evaluation & Analysis state
  const [evalScore, setEvalScore] = useState(80)
  const [evalFeedback, setEvalFeedback] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [evalSuccess, setEvalSuccess] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [transcriptSavedMsg, setTranscriptSavedMsg] = useState(false)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [aiReport, setAiReport] = useState(null)
  const [aiError, setAiError] = useState('')

  const loadSessions = () => {
    api.get('/sessions')
      .then(r => setSessions(r.data || []))
      .catch(() => setSessions([]))
  }

  const loadStudents = () => {
    if (isCoachOrAdmin) {
      api.get('/reports/students')
        .then(r => setStudents(r.data || []))
        .catch(() => {})
    }
  }

  useEffect(() => {
    loadSessions()
    loadStudents()
  }, [user])

  const openSessionDetail = (s) => {
    setViewSession(s)
    setEvalScore(s.score != null ? s.score : 80)
    setEvalFeedback(s.feedback_summary || '')
    setTranscriptDraft(s.transcript || '')
    setEvalSuccess(false)
    setTranscriptSavedMsg(false)
    setAiReport(null)
    setAiError('')
  }

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter)

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleApplyPreset = (preset) => {
    const defaultDate = new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    setForm(prev => ({
      ...prev,
      topic: preset.topic,
      format: preset.format,
      position: preset.position,
      duration_minutes: preset.duration_minutes,
      notes: preset.notes,
      scheduled_at: defaultDate,
    }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
        duration_minutes: Number(form.duration_minutes),
        round_count: Number(form.round_count),
        user_id: form.user_id || undefined,
      }
      const { data } = await api.post('/sessions', payload)
      setSessions(s => [data, ...s])
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create session. Please check fields.')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveTranscript = async () => {
    if (!viewSession) return
    setSavingTranscript(true)
    setTranscriptSavedMsg(false)
    try {
      const { data } = await api.put(`/sessions/${viewSession.id}`, { transcript: transcriptDraft })
      setViewSession(data)
      setSessions(prev => prev.map(item => item.id === data.id ? data : item))
      setTranscriptSavedMsg(true)
      setTimeout(() => setTranscriptSavedMsg(false), 3000)
    } catch {
      setViewSession(prev => ({ ...prev, transcript: transcriptDraft }))
      setSessions(prev => prev.map(item => item.id === viewSession.id ? { ...item, transcript: transcriptDraft } : item))
      setTranscriptSavedMsg(true)
      setTimeout(() => setTranscriptSavedMsg(false), 3000)
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
      // First save draft if changed
      if (transcriptDraft !== viewSession.transcript) {
        await api.put(`/sessions/${viewSession.id}`, { transcript: transcriptDraft })
      }
      const { data } = await api.post(`/analysis/session/${viewSession.id}`)
      setAiReport(data)

      // Populate coach/educator evaluation form with AI recommendations for review/modification
      if (data.overall_score) {
        setEvalScore(data.overall_score)
      }
      if (data.executive_summary) {
        setEvalFeedback(data.executive_summary)
      }
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
    } catch (err) {
      setAiError(err.response?.data?.detail || 'Failed to submit evaluation.')
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
    { key: 'scheduled', label: '📅 Scheduled',  count: sessions.filter(s => s.status === 'scheduled').length },
    { key: 'active',    label: '🔴 Active',     count: sessions.filter(s => s.status === 'active').length },
    { key: 'completed', label: '🔒 Completed',  count: sessions.filter(s => s.status === 'completed').length },
    { key: 'expired',   label: '⏰ Expired',    count: sessions.filter(s => s.status === 'expired').length },
  ]

  const isSessionLocked = viewSession && (viewSession.score != null || viewSession.status === 'completed')

  // Ownership validation: If Educator created, Coach cannot grade (and vice-versa)
  let gradingOwnershipBlocked = false
  let gradingOwnershipMessage = ''
  if (viewSession && user?.role !== 'admin') {
    if (viewSession.creator_role === 'educator' && user?.role === 'coach') {
      gradingOwnershipBlocked = true
      gradingOwnershipMessage = `This session was created by Educator ${viewSession.creator_name || ''}. Only that Educator or an Admin can evaluate this session.`
    } else if (viewSession.creator_role === 'coach' && user?.role === 'educator') {
      gradingOwnershipBlocked = true
      gradingOwnershipMessage = `This session was created by Coach ${viewSession.creator_name || ''}. Only that Coach or an Admin can evaluate this session.`
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            {user?.role === 'learner' && 'My Debate Sessions'}
            {user?.role === 'coach' && 'Debate Adjudication & Sessions'}
            {user?.role === 'educator' && 'Class Debate Rounds'}
            {user?.role === 'admin' && 'Platform Debate Sessions (Admin)'}
            {!user?.role && 'Debate Sessions'}
          </h1>
          <p>
            {user?.role === 'learner' && 'Participate in debate rounds scheduled by your educator or coach. Submit your speech transcripts and track your official grades.'}
            {user?.role === 'coach' && 'Create debate rounds, review student transcripts, run AI assistance, and submit finalized scores.'}
            {user?.role === 'educator' && 'Schedule class debates, monitor participation, review speeches, and assign official grades.'}
            {user?.role === 'admin' && 'Full administrative oversight across all debate sessions, evaluations, and formats.'}
            {!user?.role && 'Create, schedule, and participate in debate sessions'}
          </p>
        </div>
        {/* Only Coaches, Educators, and Admins can create debate sessions */}
        {isCoachOrAdmin && (
          <button id="create-session-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ New Session
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(({ key, label, count }) => (
          <button
            key={key}
            id={`filter-${key}`}
            className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setFilter(key); resetScrollTop(); }}
          >
            {label}
            <span style={{ marginLeft: 6, padding: '1px 7px', background: 'rgba(255,255,255,0.15)', borderRadius: '9999px', fontSize: '0.72rem' }}>
              {count}
            </span>
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
            onDelete={isCoachOrAdmin ? handleDelete : undefined}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎙️</div>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No sessions in this view</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              {isLearner
                ? 'No active debate rounds available yet. Your educator or coach will schedule sessions for you.'
                : 'Create your first debate round to schedule practice or official adjudication.'}
            </p>
            {isCoachOrAdmin && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Session</button>
            )}
          </div>
        )}
      </div>

      {/* Create Session Modal (Staff Only) */}
      <SessionCreateModal
        show={showModal}
        canCreate={isCoachOrAdmin}
        form={form}
        error={error}
        creating={creating}
        students={students}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        onChange={onChange}
        onApplyPreset={handleApplyPreset}
      />

      {/* View & Participate / Evaluate Session Modal */}
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
                {viewSession.creator_name && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', marginTop: 4, fontWeight: 600 }}>
                    🏛️ Created by: {viewSession.creator_name} ({viewSession.creator_role || 'Staff'})
                  </div>
                )}
              </div>

              <div className="grid-3" style={{ gap: 10 }}>
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FORMAT</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{viewSession.format}</div>
                </div>
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SPEAKER POSITION</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{viewSession.position || 'Proposition'}</div>
                </div>
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>STATUS</div>
                  <span className={`badge badge-${viewSession.status === 'completed' ? 'warning' : viewSession.status === 'expired' ? 'secondary' : 'primary'}`} style={{ textTransform: 'capitalize', marginTop: 2 }}>
                    {viewSession.status === 'completed' ? '🔒 Completed' : viewSession.status}
                  </span>
                </div>
              </div>

              {viewSession.notes && (
                <div style={{ background: 'var(--bg-overlay)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>ROUND NOTES & INSTRUCTIONS</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{viewSession.notes}</div>
                </div>
              )}

              {/* Transcript & Speech Submission Section */}
              <div style={{ borderTop: '1px solid var(--border-medium)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label htmlFor="session-transcript" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Speech Transcript / Arguments {isLearner && <span style={{ color: 'var(--brand-primary)' }}>— Your Submission</span>}
                  </label>
                  {!isSessionLocked && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleSaveTranscript}
                        disabled={savingTranscript}
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      >
                        {savingTranscript ? 'Saving…' : '💾 Submit / Save Speech'}
                      </button>
                      {/* Strictly NO AI button for learners; only staff can run AI Adjudication */}
                      {isCoachOrAdmin && !gradingOwnershipBlocked && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleRunAIAnalysis}
                          disabled={analyzingAI || !transcriptDraft.trim()}
                          style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                        >
                          {analyzingAI ? 'Analyzing…' : '⚡ Run AI Adjudication'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <textarea
                  id="session-transcript"
                  className="input"
                  rows={4}
                  placeholder={isLearner ? "Type or paste your speech arguments, Toulmin claims, and evidence citations here to submit for grading..." : "Speech transcript of the debater..."}
                  value={transcriptDraft}
                  onChange={e => setTranscriptDraft(e.target.value)}
                  disabled={isSessionLocked}
                  style={{ resize: 'vertical', fontSize: '0.88rem' }}
                />

                {transcriptSavedMsg && (
                  <div style={{ color: 'var(--brand-success)', fontSize: '0.82rem', marginTop: 4, fontWeight: 600 }}>
                    ✅ Speech transcript draft saved successfully!
                  </div>
                )}

                {aiError && <div className="alert alert-error" style={{ marginTop: 8, fontSize: '0.82rem' }}>{String(aiError)}</div>}

                {aiReport && (
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ color: 'var(--brand-primary)', fontSize: '0.85rem' }}>AI Suggested Adjudication</strong>
                      <span className="badge badge-success" style={{ fontWeight: 800 }}>AI Score: {aiReport.overall_score}/100</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {aiReport.executive_summary}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      💡 You can adjust the score and refine this critique in the evaluation form below before finalizing the grade.
                    </div>
                  </div>
                )}
              </div>

              {/* Evaluated State: STRICTLY LOCKED Scorecard */}
              {isSessionLocked ? (
                <div style={{
                  padding: '18px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(108,99,255,0.08))',
                  border: '1px solid rgba(16,185,129,0.35)',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>🔒</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-success)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Official Adjudication Finalized & Locked
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Score & evaluation locked permanently
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-success)' }}>
                        {viewSession.score}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>/100</span>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    fontStyle: 'italic',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--brand-success)',
                    lineHeight: 1.5,
                  }}>
                    "{viewSession.feedback_summary || 'Satisfactory debate performance recorded.'}"
                  </div>
                </div>
              ) : viewSession.status === 'expired' ? (
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(107, 114, 128, 0.1)',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                }}>
                  ⏰ <strong>Session Expired:</strong> Scheduled debate time has elapsed. Adjudication is closed.
                </div>
              ) : isCoachOrAdmin ? (
                gradingOwnershipBlocked ? (
                  <div style={{
                    padding: '14px 18px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--brand-error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}>
                    {gradingOwnershipMessage}
                  </div>
                ) : (
                  /* Editable Evaluation Form for Coach / Educator / Admin */
                  <div style={{
                    padding: '16px',
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-secondary)', marginBottom: 10 }}>
                      🏆 {user?.role === 'educator' ? 'Educator Evaluation & Grading' : 'Coach Evaluation & Grading'}
                    </div>

                    {evalSuccess && (
                      <div className="alert alert-success" style={{ marginBottom: 12 }}>
                        ✅ Grade submitted and locked! Student has been notified in real time.
                      </div>
                    )}

                    <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group">
                        <label htmlFor="eval-score">Official Performance Score (0 - 100): <strong>{evalScore}</strong></label>
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
                        <label htmlFor="eval-feedback">Official Feedback & Critique *</label>
                        <textarea
                          id="eval-feedback"
                          className="input"
                          rows={2}
                          placeholder="Provide detailed feedback on argument structure, evidence support, and rebuttal effectiveness…"
                          value={evalFeedback}
                          onChange={e => setEvalFeedback(e.target.value)}
                          required
                          style={{ resize: 'vertical', fontSize: '0.88rem' }}
                        />
                      </div>
                      <div>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={evaluating}>
                          {evaluating ? 'Submitting & Locking…' : '⭐ Submit & Lock Final Grade'}
                        </button>
                      </div>
                    </form>
                  </div>
                )
              ) : (
                /* Learner view when pending evaluation */
                <div style={{
                  padding: '14px 18px',
                  background: 'var(--bg-overlay)',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <span style={{ fontSize: '1.4rem' }}>⏳</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Pending Staff Adjudication
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Make sure your speech transcript is saved above. Your coach or educator will review and finalize your grade.
                    </div>
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
