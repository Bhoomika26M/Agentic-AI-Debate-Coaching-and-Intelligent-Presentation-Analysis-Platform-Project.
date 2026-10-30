import { useEffect, useState } from 'react'
import api from '../services/api'

const skillKeys = [
  {
    key: 'communication_score',
    name: 'Communication & Diction',
    description: 'Speech clarity, vocal pacing, diction, and audience engagement.',
    icon: '🗣️',
  },
  {
    key: 'critical_thinking_score',
    name: 'Critical Thinking & Logic',
    description: 'Logical consistency, soundness of warrants, and absence of logical fallacies.',
    icon: '🧠',
  },
  {
    key: 'argumentation_score',
    name: 'Argumentation & Rebuttal',
    description: 'Claim structure, empirical evidence warranting, and effective refutation.',
    icon: '⚔️',
  },
  {
    key: 'confidence_score',
    name: 'Speaking Confidence',
    description: 'Optimal speech cadence (130-165 WPM), low filler disfluency, and assertiveness.',
    icon: '✨',
  },
  {
    key: 'presentation_score',
    name: 'Presentation Delivery',
    description: 'Overall speech coherence, topic engagement, and persuasive delivery.',
    icon: '🎙️',
  },
]

function getSkillLevel(score) {
  if (score >= 85) return { label: 'Mastery', color: '#047857', bg: '#ecfdf5' }
  if (score >= 70) return { label: 'Advanced', color: '#1d4ed8', bg: '#eff6ff' }
  if (score >= 50) return { label: 'Proficient', color: '#6d28d9', bg: '#f5f3ff' }
  if (score >= 30) return { label: 'Developing', color: '#b45309', bg: '#fffbeb' }
  return { label: 'Novice / Baseline', color: '#64748b', bg: '#f1f5f9' }
}

export default function Skills() {
  const [skillData, setSkillData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showManualBaseline, setShowManualBaseline] = useState(false)
  const [manualForm, setManualForm] = useState({})

  const loadSkills = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/skills/me')
      setSkillData(res.data)
      setManualForm({
        communication_score: res.data.communication_score || 0,
        critical_thinking_score: res.data.critical_thinking_score || 0,
        argumentation_score: res.data.argumentation_score || 0,
        confidence_score: res.data.confidence_score || 0,
        presentation_score: res.data.presentation_score || 0,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load skill competencies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSkills()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post('/skills/sync')
      setSkillData(res.data)
      setNotice('Competencies successfully synchronized with your latest practice history!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync skill competencies.')
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveManualBaseline = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    try {
      const res = await api.put('/skills/me', manualForm)
      setSkillData(res.data)
      setNotice('Manual baseline preferences saved.')
      setShowManualBaseline(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Scores must be between 0 and 100.')
    }
  }

  if (loading) return <div className="loading-state">Loading competency analytics...</div>

  const provenance = skillData?.provenance || {}
  const hasActivity = skillData?.has_activity || false

  return (
    <section className="page-stack skills-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Competency Tracking & Skill Progression</p>
          <h1>Skill Competency Matrix</h1>
          <p className="lede">
            Skills are automatically calculated from your debate argumentation, speech clarity, filler word counts, and AI coaching evaluations.
          </p>
        </div>

        <div className="dashboard-actions-row">
          <button
            type="button"
            className="button"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Synchronizing...' : '🔄 Sync with Recent Practice'}
          </button>
        </div>
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
      {notice && <p className="success-message" role="status">{notice}</p>}

      {/* Activity Provenance Summary Banner */}
      <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid #4f46e5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              {hasActivity ? '⚡ Automated Assessment Active' : 'ℹ️ New Learner Baseline'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              {hasActivity
                ? `Calculated from ${provenance.debates_count || 0} debates, ${provenance.arguments_count || 0} argument turns, ${provenance.analyses_count || 0} argument analyses, and ${provenance.presentations_count || 0} speech recordings.`
                : 'Complete debate sessions or presentation recordings to build your automated practice scores.'}
            </p>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => setShowManualBaseline(!showManualBaseline)}
          >
            {showManualBaseline ? 'Hide Manual Settings' : '⚙️ Adjust Self-Reported Baseline'}
          </button>
        </div>
      </div>

      {/* Optional Manual Baseline Drawer */}
      {showManualBaseline && (
        <article className="detail-panel">
          <div className="card-title-row">
            <div>
              <h3>Self-Reported Baseline</h3>
              <p className="muted" style={{ fontSize: '0.82rem' }}>
                Set your initial comfort level manually. Practice activities will dynamically build upon these benchmarks.
              </p>
            </div>
          </div>
          <form onSubmit={handleSaveManualBaseline} className="form-grid" style={{ marginTop: '14px' }}>
            {skillKeys.map(({ key, name }) => (
              <label key={key}>
                {name} (0-100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manualForm[key] ?? 0}
                  onChange={(e) => setManualForm({ ...manualForm, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
              <button type="submit" className="button">Save Baseline</button>
              <button type="button" className="button secondary" onClick={() => setShowManualBaseline(false)}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {/* 5 Core Competency Metric Cards */}
      <div className="debates-list-grid">
        {skillKeys.map(({ key, name, description, icon }) => {
          const score = skillData?.[key] || 0
          const level = getSkillLevel(score)
          const explKey = key.replace('_score', '')
          const explanation = provenance.explanations?.[explKey]

          return (
            <article key={key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '2rem' }}>{icon}</span>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{name}</h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: level.color,
                      backgroundColor: level.bg,
                    }}
                  >
                    {level.label}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>{score}</strong>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/100</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-track" style={{ height: '10px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, score)}%`,
                    background: score >= 70 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #4f46e5, #8b5cf6)',
                  }}
                />
              </div>

              {/* Contributing explanation */}
              {explanation && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                  <strong>Activity Provenance:</strong> {explanation}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
