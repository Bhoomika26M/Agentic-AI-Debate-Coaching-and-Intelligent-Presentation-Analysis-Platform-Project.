/**
 * LearningPlanTab Component
 * =========================
 * Displays a structured 4-week debate curriculum:
 * - Weekly goals and daily practice commitment
 * - Targeted skill-building exercises
 * - Progress milestones & checkpoints
 */
export default function LearningPlanTab({ learningPlan }) {
  if (!learningPlan) return null

  return (
    <div className="coaching-content">
      <div style={{
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: 'var(--text-secondary)'
      }}>
        <span>📅 Duration: 4 Weeks</span>
        <span>🎯 Target Level: <strong style={{ textTransform: 'capitalize', color: 'var(--brand-primary)' }}>{learningPlan.user_level}</strong></span>
        <span>⏱️ Daily Commitment: <strong>{learningPlan.daily_commitment_minutes} mins/day</strong></span>
        <span>📆 Frequency: <strong>{learningPlan.sessions_per_week} sessions/week</strong></span>
      </div>

      <div className="weekly-plan">
        {learningPlan.weekly_plan?.map((week, i) => (
          <div key={i} className="week-card">
            <div className="week-number">Week {week.week}</div>
            <div className="week-focus">{week.focus}</div>
            <div className="week-goal">🎯 <strong>Goal:</strong> {week.goal}</div>
            <div className="week-practice">⏱️ <strong>Daily Drill:</strong> {week.daily_practice}</div>
          </div>
        ))}
      </div>

      {learningPlan.targeted_skill_exercises?.length > 0 && (
        <div className="card" style={{ marginTop: 8 }}>
          <h3 className="card-title" style={{ fontSize: '1rem' }}>🔧 Targeted Exercises for Identified Weaknesses</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 12 }}>
            {learningPlan.targeted_skill_exercises.map((ex, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                ✏️ {ex}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        <h3 className="card-title" style={{ fontSize: '1rem' }}>🏁 Milestone Checkpoints</h3>
        <div className="milestones-list">
          {learningPlan.milestones?.map((m, i) => (
            <div key={i} className="milestone-item">
              <div className="milestone-week">Milestone Week {m.week}</div>
              <div className="milestone-check">✅ {m.checkpoint}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

