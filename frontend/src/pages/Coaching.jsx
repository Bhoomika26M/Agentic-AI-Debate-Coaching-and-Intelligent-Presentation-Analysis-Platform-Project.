import { useState, useEffect } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'

const SKILL_LABELS = {
  argument_quality:       { label: 'Argument Quality',       icon: '🎯', weight: '30%' },
  evidence_usage:         { label: 'Evidence Usage',         icon: '📚', weight: '20%' },
  logical_consistency:    { label: 'Logical Consistency',    icon: '🔗', weight: '20%' },
  rebuttal_effectiveness: { label: 'Rebuttal Effectiveness', icon: '⚔️', weight: '15%' },
  communication_skills:   { label: 'Communication Skills',   icon: '🎤', weight: '15%' },
}

const DEFAULT_SCORES = {
  argument_quality: 65,
  evidence_usage: 55,
  logical_consistency: 70,
  rebuttal_effectiveness: 50,
  communication_skills: 60,
}

export default function Coaching() {
  const [scores, setScores]             = useState(DEFAULT_SCORES)
  const [level, setLevel]               = useState('intermediate')
  const [recommendations, setRecommendations] = useState(null)
  const [learningPlan, setLearningPlan] = useState(null)
  const [skillGap, setSkillGap]         = useState(null)
  const [drills, setDrills]             = useState([])
  const [loading, setLoading]           = useState(false)
  const [activeTab, setActiveTab]       = useState('recommendations')
  const [drillFilter, setDrillFilter]   = useState('')
  const [error, setError]               = useState('')

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
          weak_skills: Object.entries(s).filter(([,v]) => v < 65).map(([k]) => k),
          sessions_per_week: 3,
        }),
        api.post('/coaching/skill-gap', { scores: s }),
      ])
      setRecommendations(recRes.data)
      setLearningPlan(planRes.data)
      setSkillGap(gapRes.data)
    } catch (err) {
      setError('Failed to load coaching data. Make sure you are logged in.')
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
    const newScores = { ...scores, [skill]: Number(val) }
    setScores(newScores)
  }

  const applyScores = () => loadAll(scores, level)

  const scoreColor = (score) => {
    if (score >= 80) return '#10b981'
    if (score >= 65) return '#f59e0b'
    return '#ef4444'
  }

  const gapSeverityColor = (severity) => {
    if (severity === 'critical') return '#ef4444'
    if (severity === 'moderate') return '#f59e0b'
    return '#10b981'
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">🏆 Coaching & Learning</h1>
            <p className="page-subtitle">Personalised skill development, gap analysis, and learning plans</p>
          </div>
        </div>

        {/* Score Inputs */}
        <div className="card score-input-card">
          <h2 className="card-title">📊 Your Skill Scores</h2>
          <p className="card-subtitle">Adjust your current skill levels to get personalised recommendations</p>
          <div className="skill-sliders">
            {Object.entries(SKILL_LABELS).map(([key, meta]) => (
              <div key={key} className="skill-slider-row">
                <div className="slider-label">
                  <span>{meta.icon} {meta.label}</span>
                  <span className="weight-badge">{meta.weight}</span>
                  <span className="score-value" style={{ color: scoreColor(scores[key]) }}>
                    {scores[key]}/100
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={100}
                  value={scores[key]}
                  onChange={e => handleScoreChange(key, e.target.value)}
                  className="skill-range"
                  style={{ '--track-color': scoreColor(scores[key]) }}
                />
              </div>
            ))}
          </div>
          <div className="score-actions">
            <select className="form-input level-select" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button className="btn btn-primary" onClick={applyScores} disabled={loading}>
              {loading ? '⏳ Analysing...' : '🔍 Analyse My Skills'}
            </button>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {['recommendations', 'learning-plan', 'skill-gap', 'drills'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'recommendations' && '📋 Recommendations'}
              {tab === 'learning-plan' && '📅 Learning Plan'}
              {tab === 'skill-gap' && '🎯 Skill Gap'}
              {tab === 'drills' && '💪 Drills'}
            </button>
          ))}
        </div>

        {/* ── Recommendations ── */}
        {activeTab === 'recommendations' && recommendations && (
          <div className="coaching-content">
            <div className="overall-score-card">
              <div className="oc-score" style={{ color: scoreColor(recommendations.overall_score) }}>
                {recommendations.overall_score}
              </div>
              <div className="oc-meta">
                <div className="oc-grade">{recommendations.grade}</div>
                <div className="oc-level">Level: {recommendations.user_level}</div>
                <div className="oc-potential">+{recommendations.improvement_potential} pts potential</div>
              </div>
            </div>

            <h3 className="section-title">🎯 Primary Focus Areas</h3>
            {recommendations.primary_recommendations?.map((rec, i) => (
              <div key={i} className="rec-card">
                <div className="rec-header">
                  <span className="rec-skill">{rec.skill}</span>
                  <span className={`priority-badge ${rec.priority === 'High' ? 'high' : 'medium'}`}>{rec.priority} Priority</span>
                  <span className="rec-score">{rec.current_score} → {rec.target_score}</span>
                </div>
                <p className="rec-rationale">{rec.rationale}</p>
                <div className="rec-exercises">
                  <strong>Exercises:</strong>
                  {rec.exercises?.map((ex, j) => (
                    <div key={j} className="exercise-item">✏️ {ex}</div>
                  ))}
                </div>
                {rec.resources?.length > 0 && (
                  <div className="rec-resources">
                    <strong>Resources:</strong>
                    {rec.resources.map((r, j) => (
                      <div key={j} className="resource-item">📖 {r}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {recommendations.strengths_to_maintain?.length > 0 && (
              <>
                <h3 className="section-title">✅ Strengths to Maintain</h3>
                <div className="strengths-grid">
                  {recommendations.strengths_to_maintain.map((s, i) => (
                    <div key={i} className="strength-card">
                      <div className="strength-score">{s.score}/100</div>
                      <div className="strength-label">{s.skill}</div>
                      <div className="strength-tip">{s.maintenance_tip}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Learning Plan ── */}
        {activeTab === 'learning-plan' && learningPlan && (
          <div className="coaching-content">
            <div className="plan-header">
              <div className="plan-meta">
                <span>📅 4-Week Plan</span>
                <span>🎯 {learningPlan.user_level}</span>
                <span>⏱️ {learningPlan.daily_commitment_minutes} min/day</span>
                <span>📆 {learningPlan.sessions_per_week}x/week</span>
              </div>
            </div>
            <div className="weekly-plan">
              {learningPlan.weekly_plan?.map((week, i) => (
                <div key={i} className="week-card">
                  <div className="week-number">Week {week.week}</div>
                  <div className="week-focus">{week.focus}</div>
                  <div className="week-goal">🎯 Goal: {week.goal}</div>
                  <div className="week-practice">⏱️ Daily: {week.daily_practice}</div>
                </div>
              ))}
            </div>

            {learningPlan.targeted_skill_exercises?.length > 0 && (
              <>
                <h3 className="section-title">🔧 Targeted Exercises</h3>
                <div className="exercises-list">
                  {learningPlan.targeted_skill_exercises.map((ex, i) => (
                    <div key={i} className="exercise-item-full">✏️ {ex}</div>
                  ))}
                </div>
              </>
            )}

            <h3 className="section-title">🏁 Milestones</h3>
            <div className="milestones-list">
              {learningPlan.milestones?.map((m, i) => (
                <div key={i} className="milestone-item">
                  <div className="milestone-week">Week {m.week}</div>
                  <div className="milestone-check">✅ {m.checkpoint}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Skill Gap ── */}
        {activeTab === 'skill-gap' && skillGap && (
          <div className="coaching-content">
            <div className="gap-summary">
              <div className="gap-overall">Overall Gap: <strong>{skillGap.overall_gap} pts</strong></div>
              {skillGap.priority_skill && (
                <div className="gap-priority">Priority Skill: <strong>{skillGap.priority_skill?.replace(/_/g, ' ')}</strong></div>
              )}
            </div>
            <div className="gap-cards">
              {Object.entries(skillGap.skill_gaps || {}).map(([key, gap]) => (
                <div key={key} className="gap-card" style={{ '--gap-color': gapSeverityColor(gap.gap_severity) }}>
                  <div className="gap-card-header">
                    <span className="gap-skill-label">{gap.label}</span>
                    <span className="gap-severity-badge" style={{ background: gapSeverityColor(gap.gap_severity) }}>
                      {gap.gap_severity}
                    </span>
                  </div>
                  <div className="gap-bar-container">
                    <div className="gap-bar-track">
                      <div className="gap-bar-current" style={{ width: `${gap.current}%`, background: gapSeverityColor(gap.gap_severity) }} />
                      <div className="gap-bar-target" style={{ left: `${gap.target}%` }} title="Target" />
                    </div>
                    <div className="gap-bar-labels">
                      <span>Current: {gap.current}</span>
                      <span>Target: {gap.target}</span>
                      <span>Gap: {gap.gap} pts</span>
                    </div>
                  </div>
                  <div className="gap-exercise">💡 {gap.top_exercise}</div>
                  <div className="gap-timeline">⏱️ Est. {gap.estimated_weeks_to_close} week{gap.estimated_weeks_to_close !== 1 ? 's' : ''} to close</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Drills ── */}
        {activeTab === 'drills' && (
          <div className="coaching-content">
            <div className="drill-filters">
              {['', 'beginner', 'intermediate', 'advanced'].map(d => (
                <button
                  key={d}
                  className={`chip ${drillFilter === d ? 'chip-active' : ''}`}
                  onClick={() => { setDrillFilter(d); loadDrills(d) }}
                >
                  {d || 'All Levels'}
                </button>
              ))}
            </div>
            <div className="drills-grid">
              {drills.map((drill, i) => (
                <div key={i} className="drill-card">
                  <div className="drill-header">
                    <span className="drill-name">{drill.name}</span>
                    <span className={`drill-difficulty ${drill.difficulty}`}>{drill.difficulty}</span>
                  </div>
                  <div className="drill-type">🏷️ {drill.type?.replace(/_/g, ' ')}</div>
                  <p className="drill-desc">{drill.description}</p>
                  <button className="btn btn-secondary btn-sm">▶ Start Drill</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
