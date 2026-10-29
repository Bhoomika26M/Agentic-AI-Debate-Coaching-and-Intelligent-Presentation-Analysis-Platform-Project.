/**
 * SkillGapTab Component
 * =====================
 * Displays skill gap diagnostics measured against competitive benchmarks (80 pts):
 * - Overall gap and priority focus skill
 * - Severity indicators (critical, moderate, minor)
 * - Visual target lines and time-to-close estimates
 */
export default function SkillGapTab({ skillGap }) {
  if (!skillGap) return null

  const gapSeverityColor = (severity) => {
    if (severity === 'critical') return 'var(--brand-danger)'
    if (severity === 'moderate') return 'var(--brand-accent)'
    return 'var(--brand-success)'
  }

  return (
    <div className="coaching-content">
      <div className="gap-summary">
        <div>
          Overall Benchmark Gap: <strong style={{ color: 'var(--brand-primary)' }}>{skillGap.overall_gap} pts</strong>
        </div>
        {skillGap.priority_skill && (
          <div>
            Highest-Leverage Focus:{' '}
            <strong style={{ color: 'var(--brand-danger)', textTransform: 'capitalize' }}>
              {skillGap.priority_skill.replace(/_/g, ' ')}
            </strong>
          </div>
        )}
      </div>

      <div className="gap-cards">
        {Object.entries(skillGap.skill_gaps || {}).map(([key, gap]) => (
          <div key={key} className="gap-card">
            <div className="gap-card-header">
              <span className="gap-skill-label">{gap.label}</span>
              <span className="gap-severity-badge" style={{ background: gapSeverityColor(gap.gap_severity) }}>
                {gap.gap_severity} gap
              </span>
            </div>

            <div className="gap-bar-container">
              <div className="gap-bar-track">
                <div
                  className="gap-bar-current"
                  style={{
                    width: `${gap.current}%`,
                    background: gapSeverityColor(gap.gap_severity),
                  }}
                />
              </div>
              <div className="gap-bar-labels">
                <span>Current: <strong>{gap.current}</strong></span>
                <span>Target: <strong>{gap.target}</strong></span>
                <span>Gap: <strong>{gap.gap} pts</strong></span>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              💡 <strong>Intervention:</strong> {gap.top_exercise}
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ⏱️ Estimated {gap.estimated_weeks_to_close} week{gap.estimated_weeks_to_close !== 1 ? 's' : ''} to close gap
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

