import { useEffect, useState } from 'react'
import api from '../services/api'

const skillKeys = [
  {
    key: 'communication_score',
    explKey: 'communication',
    name: 'Communication & Diction',
    description: 'Speech clarity, vocal pacing, diction, and audience engagement.',
    icon: '🗣️',
    suggestedDrill: 'Record a speech presentation or participate in debate sparring to evaluate clarity and pacing.',
  },
  {
    key: 'critical_thinking_score',
    explKey: 'critical_thinking',
    name: 'Critical Thinking & Logic',
    description: 'Logical consistency, soundness of warrants, and absence of logical fallacies.',
    icon: '🧠',
    suggestedDrill: 'Submit complex arguments to Argument Studio to test consistency and identify fallacies.',
  },
  {
    key: 'argumentation_score',
    explKey: 'argumentation',
    name: 'Argumentation & Rebuttal',
    description: 'Claim structure, empirical evidence warranting, and effective refutation.',
    icon: '⚔️',
    suggestedDrill: 'Complete a multi-turn AI debate session with direct counterargument rebuttals.',
  },
  {
    key: 'confidence_score',
    explKey: 'confidence',
    name: 'Speaking Confidence',
    description: 'Optimal speech cadence (130-165 WPM), low filler disfluency, and assertiveness.',
    icon: '✨',
    suggestedDrill: 'Record an audio presentation to measure speaking pace and reduce filler words.',
  },
  {
    key: 'presentation_score',
    explKey: 'presentation',
    name: 'Presentation Delivery',
    description: 'Overall speech coherence, topic engagement, and persuasive delivery.',
    icon: '🎙️',
    suggestedDrill: 'Upload or record an audio presentation to generate comprehensive delivery analytics.',
  },
]

function getSkillLevel(score) {
  if (score >= 85) return { label: 'Mastery', color: '#047857', bg: '#ecfdf5' }
  if (score >= 70) return { label: 'Advanced', color: '#1d4ed8', bg: '#eff6ff' }
  if (score >= 50) return { label: 'Proficient', color: '#6d28d9', bg: '#f5f3ff' }
  if (score >= 30) return { label: 'Developing', color: '#b45309', bg: '#fffbeb' }
  return { label: 'Novice', color: '#64748b', bg: '#f1f5f9' }
}

export default function Skills() {
  const [skillData, setSkillData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSkills = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/skills/me')
      setSkillData(res.data)
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
      if (res.data.has_activity) {
        setNotice('Competencies successfully synchronized with your latest practice history!')
      } else {
        setNotice('No completed assessments available yet. Complete a debate or presentation assessment to build your competency profile.')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync skill competencies.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="loading-state">Loading competency analytics...</div>

  const provenance = skillData?.provenance || {}
  const hasActivity = skillData?.has_activity || false
  const dataPoints = provenance.data_points || {}

  return (
    <section className="page-stack skills-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Performance-Based Competency Tracking</p>
          <h1>Skill Competency Matrix</h1>
          <p className="lede">
            Every competency is computed strictly from your verified completed performance: debate argument evaluations, speech pace measurements, filler-word counts, and AI coaching assessments.
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

      {/* Assessment Status Bar — 5 Actual Persisted Metric Counts */}
      <div className="stats-grid" style={{ marginBottom: '8px' }}>
        <div className="stat-card">
          <span>Debate Sessions</span>
          <strong>{provenance.debates_count ?? 0}</strong>
          <small>Completed & active sessions</small>
        </div>
        <div className="stat-card">
          <span>User Arguments</span>
          <strong>{provenance.arguments_count ?? 0}</strong>
          <small>Evaluated user debate turns</small>
        </div>
        <div className="stat-card">
          <span>Argument Analyses</span>
          <strong>{provenance.analyses_count ?? 0}</strong>
          <small>Reasoning & fallacy evaluations</small>
        </div>
        <div className="stat-card">
          <span>Speech Recordings</span>
          <strong>{provenance.presentations_count ?? 0}</strong>
          <small>Completed audio presentations</small>
        </div>
        <div className="stat-card">
          <span>Coaching Reviews</span>
          <strong>{provenance.coaching_reviews_count ?? 0}</strong>
          <small>5-rubric comprehensive evaluations</small>
        </div>
      </div>

      {/* Activity Overview Banner */}
      <div className="card" style={{ background: '#f8fafc', borderLeft: hasActivity ? '4px solid #4f46e5' : '4px solid #94a3b8' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 600 }}>
          {hasActivity ? '⚡ Automated Performance-Based Assessment Active' : 'ℹ️ Practice Assessment Profile Ready'}
        </h3>
        <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '3px' }}>
          {hasActivity
            ? `Your competencies are continuously verified across ${provenance.debates_count || 0} debates, ${provenance.arguments_count || 0} debate turns, ${provenance.analyses_count || 0} argument analyses, and ${provenance.presentations_count || 0} speech recordings.`
            : 'No completed assessments are on record yet. Participate in debate sparring or record speech presentations to begin generating your scores.'}
        </p>
      </div>

      {/* 5 Core Competency Metric Cards */}
      <div className="debates-list-grid">
        {skillKeys.map(({ key, explKey, name, description, icon, suggestedDrill }) => {
          const rawScore = skillData?.[key]
          const isAssessed = rawScore !== null && rawScore !== undefined
          const score = isAssessed ? Number(rawScore) : null
          const level = isAssessed ? getSkillLevel(score) : { label: 'Not Assessed', color: '#64748b', bg: '#f1f5f9' }
          const pointsCount = dataPoints[explKey] ?? 0
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
                    {isAssessed ? (
                      <>
                        <strong style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>{score}</strong>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/100</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#64748b' }}>
                        Not assessed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar — Only displayed if assessed */}
              <div className="progress-track" style={{ height: '10px' }}>
                {isAssessed ? (
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, score))}%`,
                      background: score >= 70 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #4f46e5, #8b5cf6)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)',
                      borderRadius: '9999px',
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>

              {/* Contributing Evidence / Provenance */}
              <div style={{ fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#334155' }}>
                    {isAssessed ? `Evidence Provenance (${pointsCount} metric${pointsCount === 1 ? '' : 's'}):` : 'Assessment Status:'}
                  </strong>{' '}
                  {explanation}
                </div>
                <div style={{ marginTop: '6px', color: '#475569', fontSize: '0.8rem' }}>
                  <strong>🎯 Recommended Practice Drill:</strong> {suggestedDrill}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
