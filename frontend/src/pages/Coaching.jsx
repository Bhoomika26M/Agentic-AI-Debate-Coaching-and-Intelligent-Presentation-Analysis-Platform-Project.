import { useState, useEffect } from 'react'
import api from '../api/client'
import { resetScrollTop } from '../components/ScrollToTop'
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
    // Populate scores from student's historical performance if available
    api.get('/reports/performance')
      .then(res => {
        if (res.data?.skill_averages && Object.keys(res.data.skill_averages).length > 0) {
          setScores(prev => ({ ...prev, ...res.data.skill_averages }))
        }
      })
      .catch(() => {})
  }, [])

  const loadAll = async (customScores = null, customLevel = null) => {
    setLoading(true)
    setError('')
    const s = customScores || scores
    const l = customLevel || level
    try {
      const [recRes, planRes, gapRes, drillRes] = await Promise.all([
        api.post('/coaching/recommendations', { scores: s, user_level: l }),
        api.post('/coaching/learning-plan', {
          user_level: l,
          weak_skills: Object.entries(s).filter(([, v]) => v < 65).map(([k]) => k),
          sessions_per_week: 3,
        }),
        api.post('/coaching/skill-gap', { scores: s }),
        api.get('/coaching/drills'),
      ])
      setRecommendations(recRes.data)
      setLearningPlan(planRes.data)
      setSkillGap(gapRes.data)
      setDrills(drillRes.data || [])
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
            onClick={() => { setActiveTab(t.key); resetScrollTop(); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Empty State before Analysis */}
      {!recommendations && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-surface)', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏆</div>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Ready for AI Coaching & Curriculum</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 540, margin: '0 auto', fontSize: '0.9rem' }}>
            Adjust your 5 skill dials above or keep your current benchmarks, then click <strong>"Analyze & Synthesize Guidance"</strong> to generate your tailored AI coaching plan, 4-week study curriculum, and competitive gap analysis.
          </p>
        </div>
      )}

      {/* ── Recommendations Tab ── */}
      {recommendations && activeTab === 'recommendations' && (
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

          {recommendations.overall_assessment && (
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: 'var(--bg-overlay)', borderLeft: '4px solid var(--brand-primary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                💡 Coach Assessment
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {recommendations.overall_assessment}
              </p>
            </div>
          )}

          {(() => {
            const list = recommendations.primary_recommendations?.length
              ? recommendations.primary_recommendations
              : (recommendations.recommendations || [])

            if (list.length === 0) {
              return (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)' }}>
                  ✅ No urgent priority interventions needed. Skill levels are meeting competitive benchmarks!
                </div>
              )
            }

            return (
              <>
                <h3 className="section-title">🎯 Priority Interventions</h3>
                {list.map((rec, i) => (
                  <div key={i} className="rec-card">
                    <div className="rec-header">
                      <span className="rec-skill">{rec.skill}</span>
                      {rec.priority && (
                        <span className={`priority-badge ${String(rec.priority).toLowerCase() === 'high' ? 'high' : 'medium'}`}>
                          {rec.priority} Priority
                        </span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>
                        {rec.current_score} → {rec.target_score}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 10px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {rec.rationale}
                    </p>
                    {rec.exercises?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Targeted Exercises:</strong>
                        {rec.exercises.map((ex, j) => (
                          <div key={j} className="exercise-item">✏️ {ex}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Learning Plan Tab ── */}
      {recommendations && activeTab === 'learning-plan' && (
        <LearningPlanTab learningPlan={learningPlan} />
      )}

      {/* ── Skill Gap Tab ── */}
      {recommendations && activeTab === 'skill-gap' && (
        <SkillGapTab skillGap={skillGap} />
      )}

      {/* ── Drills Tab ── */}
      {recommendations && activeTab === 'drills' && (
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
            {(drills.length > 0 ? drills : (learningPlan?.recommended_drills || [])).map((drill, i) => (
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
