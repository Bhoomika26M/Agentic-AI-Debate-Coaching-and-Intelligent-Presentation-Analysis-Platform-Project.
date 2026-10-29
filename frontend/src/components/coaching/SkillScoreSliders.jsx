/**
 * SkillScoreSliders Component
 * ============================
 * Interactive rubric score input sliders for the 5 debate dimensions:
 * 1. Argument Quality (30%)
 * 2. Evidence Usage (20%)
 * 3. Logical Consistency (20%)
 * 4. Rebuttal Effectiveness (15%)
 * 5. Communication Skills (15%)
 */
export const SKILL_LABELS = {
  argument_quality:       { label: 'Argument Quality',       icon: '🎯', weight: '30%' },
  evidence_usage:         { label: 'Evidence Usage',         icon: '📚', weight: '20%' },
  logical_consistency:    { label: 'Logical Consistency',    icon: '🔗', weight: '20%' },
  rebuttal_effectiveness: { label: 'Rebuttal Effectiveness', icon: '⚔️', weight: '15%' },
  communication_skills:   { label: 'Communication Skills',   icon: '🎤', weight: '15%' },
}

export default function SkillScoreSliders({ scores, onScoreChange, level, onLevelChange, onApply, loading, error }) {
  const scoreColor = (score) => {
    if (score >= 80) return '#2f7d5b'
    if (score >= 65) return '#176b68'
    return '#b84c4c'
  }

  return (
    <div className="card score-input-card" style={{ marginBottom: 24, background: 'var(--bg-surface)' }}>
      <h2 className="card-title">📊 Your Skill Scores (5-Dimensional Rubric)</h2>
      <p className="card-subtitle">Adjust your scores to synthesize personalized coaching recommendations & 4-week plans</p>
      
      <div className="skill-sliders">
        {Object.entries(SKILL_LABELS).map(([key, meta]) => (
          <div key={key} className="skill-slider-row">
            <div className="slider-label">
              <span>{meta.icon} {meta.label}</span>
              <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{meta.weight}</span>
              <span className="score-value" style={{ color: scoreColor(scores[key]), fontWeight: 700 }}>
                {scores[key]}/100
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={scores[key]}
              onChange={e => onScoreChange(key, e.target.value)}
              className="skill-range"
            />
          </div>
        ))}
      </div>

      <div className="score-actions" style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>EXPERIENCE LEVEL:</label>
          <select className="input" style={{ width: 'auto', padding: '8px 12px' }} value={level} onChange={e => onLevelChange(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={onApply} disabled={loading}>
          {loading ? <span className="spinner" /> : '🔍 Analyze & Synthesize Guidance'}
        </button>
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  )
}

