import { useState, useEffect } from 'react'
import api from '../api/client'
import SkillScoreSliders from '../components/coaching/SkillScoreSliders'
import LearningPlanTab from '../components/coaching/LearningPlanTab'
import SkillGapTab from '../components/coaching/SkillGapTab'

const DEFAULT_SCORES = {
  argument_quality: 65,
  evidence_usage: 55,
  logical_consistency: 70,
  rebuttal_effectiveness: 50,
  communication_skills: 60,
}

/**
 * Coaching Page Component — Milestone 3
 * =====================================
 * Generates personalized coaching feedback, 4-week learning plans,
 * skill gap analysis against competitive standards, and a curated drill library.
 */
export default function Coaching() {
  const [scores, setScores]                   = useState(DEFAULT_SCORES)
  const [level, setLevel]                     = useState('intermediate')
  const [recommendations, setRecommendations] = useState(null)
  const [learningPlan, setLearningPlan]       = useState(null)
  const [skillGap, setSkillGap]               = useState(null)
  const [drills, setDrills]                   = useState([])
  const [loading, setLoading]                 = useState(false)
  const [activeTab, setActiveTab]             = useState('recommendations')
  const [drillFilter, setDrillFilter]         = useState('')
  const [error, setError]                     = useState('')

  useEffect(() => {
    loadDrills()
    loadAll()
  }, [])

  const loadAll = async (customScores = null, customLevel = null) => {
    setLoading(true)
    setError('')
    const s = customScores || scores
    const l = customLevel || level
    try {
      const [recRes, planRes, gapRes] = await Promise.all([
        api.post('/coaching/recommendations', { scores: s, user_level: l }),
        api.post('/coaching/learning-plan', {
          user_level: l,
          weak_skills: Object.entries(s).filter(([, v]) => v < 65).map(([k]) => k),
          sessions_per_week: 3,
        }),
        api.post('/coaching/skill-gap', { scores: s }),
      ])
      setRecommendations(recRes.data)
      setLearningPlan(planRes.data)
      setSkillGap(gapRes.data)
    } catch (err) {
      setError('Failed to load coaching data. Ensure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const loadDrills = async (filter = '') => {
    try {
      const params = {}
      if (filter) params.difficulty = filter
      const res = await api.get('/coaching/drills', { params })
      setDrills(res.data)
    } catch {}
  }

  const handleScoreChange = (skill, val) => {
    setScores(prev => ({ ...prev, [skill]: Number(val) }))
  }

  const applyScores = () => loadAll(scores, level)

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.8rem' }}>🏆</span>
          <h1 style={{ margin: 0 }}>Coaching & Learning Plans</h1>
        </div>
        <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
          Personalized skill development, benchmark gap diagnostics, and interactive debate drills
        </p>
      </div>

      {/* Modular Score Sliders Card */}
      <SkillScoreSliders
        scores={scores}
        onScoreChange={handleScoreChange}
        level={level}
        onLevelChange={setLevel}
        onApply={applyScores}
        loading={loading}
        error={error}
      />

      {/* Tab Bar */}
      <div className="tab-bar">
        {[
          { key: 'recommendations', label: '📋 Recommendations' },
          { key: 'learning-plan',   label: '📅 4-Week Plan' },
          { key: 'skill-gap',       label: '🎯 Benchmark Gap' },
          { key: 'drills',          label: '💪 Drill Library' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Recommendations Tab ── */}
      {activeTab === 'recommendations' && recommendations && (
        <div className="coaching-content">
          <div className="overall-score-card">
            <div className="oc-score" style={{ color: 'var(--brand-primary)' }}>
              {recommendations.overall_score}
            </div>
            <div className="oc-meta">
              <div className="oc-grade">Weighted Performance: {recommendations.grade}</div>
              <div className="oc-level">Assessed Level: <strong style={{ textTransform: 'capitalize' }}>{recommendations.user_level}</strong></div>
              <div className="oc-potential">+{recommendations.improvement_potential} pts improvement potential</div>
            </div>
          </div>

          <h3 className="section-title">🎯 Priority Interventions</h3>
          {recommendations.primary_recommendations?.map((rec, i) => (
            <div key={i} className="rec-card">
              <div className="rec-header">
                <span className="rec-skill">{rec.skill}</span>
                <span className={`priority-badge ${rec.priority === 'High' ? 'high' : 'medium'}`}>
                  {rec.priority} Priority
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>
                  {rec.current_score} → {rec.target_score}
                </span>
              </div>
              <p style={{ margin: '4px 0 10px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {rec.rationale}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Targeted Exercises:</strong>
                {rec.exercises?.map((ex, j) => (
                  <div key={j} className="exercise-item">✏️ {ex}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Learning Plan Tab ── */}
      {activeTab === 'learning-plan' && (
        <LearningPlanTab learningPlan={learningPlan} />
      )}

      {/* ── Skill Gap Tab ── */}
      {activeTab === 'skill-gap' && (
        <SkillGapTab skillGap={skillGap} />
      )}

      {/* ── Drills Tab ── */}
      {activeTab === 'drills' && (
        <div className="coaching-content">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['', 'beginner', 'intermediate', 'advanced'].map(d => (
              <button
                key={d}
                type="button"
                className={`chip ${drillFilter === d ? 'chip-active' : ''}`}
                onClick={() => { setDrillFilter(d); loadDrills(d) }}
              >
                {d ? d.toUpperCase() : 'ALL LEVELS'}
              </button>
            ))}
          </div>

          <div className="drills-grid">
            {drills.map((drill, i) => (
              <div key={i} className="drill-card">
                <div className="drill-header">
                  <span className="drill-name">{drill.name}</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {drill.difficulty}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', fontWeight: 600, marginBottom: 6 }}>
                  🏷️ {drill.type?.replace(/_/g, ' ')}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                  {drill.description}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ⏱️ Duration: ~{drill.duration_minutes || 15} mins
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
