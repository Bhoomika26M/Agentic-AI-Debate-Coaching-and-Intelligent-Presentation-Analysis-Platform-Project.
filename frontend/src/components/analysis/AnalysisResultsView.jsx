/**
 * AnalysisResultsView Component
 * =============================
 * Renders the full evaluation report for an analyzed speech or debate argument:
 * 1. Top Ribbon: Overall Score, Grade, Fallacies Count, Argument Mining Overview
 * 2. 5-Dimensional Weighted Scoring Breakdown (AQ 30%, EU 20%, LC 20%, RE 15%, CS 15%)
 * 3. 5 Core Evaluation Criteria (Clarity, Relevance, Evidence, Logic, Persuasion)
 * 4. Logical Fallacy Inspector with severity, quotes, and correction suggestions
 * 5. Extracted Argument Structure (Claim, Premises, Evidence points)
 * 6. Actionable Strengths & Coaching Next Steps
 */
export default function AnalysisResultsView({ report }) {
  if (!report) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
      
      {/* ─── Top Score Ribbon ────────────────────────────────────── */}
      <div className="grid-3" style={{ gap: 16 }}>
        {/* Overall Performance Card */}
        <div className="card" style={{
          background: 'rgba(23,107,104,0.06)',
          border: '1px solid rgba(23,107,104,0.2)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: '24px 16px', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--brand-primary)' }}>
            OVERALL PERFORMANCE
          </span>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, margin: '8px 0' }}>
            {report.overall_score}
            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>/100</span>
          </div>
          <span className={`badge ${report.overall_score >= 80 ? 'badge-success' : report.overall_score >= 65 ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.82rem', padding: '4px 12px' }}>
            Grade: {report.grade}
          </span>
        </div>

        {/* Logical Fallacies Count Card */}
        <div className="card" style={{
          background: report.fallacies.length > 0 ? 'rgba(184,76,76,0.06)' : 'rgba(47,125,91,0.06)',
          border: `1px solid ${report.fallacies.length > 0 ? 'rgba(184,76,76,0.25)' : 'rgba(47,125,91,0.25)'}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: '24px 16px', textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: report.fallacies.length > 0 ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
            LOGICAL FALLACIES
          </span>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: report.fallacies.length > 0 ? 'var(--brand-danger)' : 'var(--brand-success)', lineHeight: 1.1, margin: '8px 0' }}>
            {report.fallacies.length}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {report.fallacies.length === 0 ? 'Clean deductive logic' : 'Flaws detected in argument'}
          </span>
        </div>

        {/* Argument Mining Stats */}
        <div className="card" style={{
          background: 'var(--bg-surface)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '20px 24px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            ARGUMENT MINING STATS
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Claim Orientation:</span>
              <strong style={{ color: 'var(--brand-primary)', textTransform: 'capitalize' }}>
                {report.arguments.claim_type}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Evidence Strength:</span>
              <strong style={{ textTransform: 'capitalize', color: report.arguments.evidence_strength_rating === 'strong' ? 'var(--brand-success)' : 'var(--brand-accent)' }}>
                {report.arguments.evidence_strength_rating}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Extracted Premises:</span>
              <strong>{report.arguments.premises.length} points</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5-Dimensional Weighted Scoring Breakdown ────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              📊 Weighted Scoring Model Breakdown
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Formula: AQ (30%) + EU (20%) + LC (20%) + RE (15%) + CS (15%)
            </span>
          </div>
        </div>

        <div className="grid-5" style={{ gap: 12 }}>
          {[
            { label: 'Argument Quality', weight: '30%', score: report.weighted_scores.argument_quality, color: 'var(--brand-primary)' },
            { label: 'Evidence Usage', weight: '20%', score: report.weighted_scores.evidence_usage, color: 'var(--brand-success)' },
            { label: 'Logical Consistency', weight: '20%', score: report.weighted_scores.logical_consistency, color: '#0d9488' },
            { label: 'Rebuttal Effectiveness', weight: '15%', score: report.weighted_scores.rebuttal_effectiveness, color: 'var(--brand-accent)' },
            { label: 'Communication Skills', weight: '15%', score: report.weighted_scores.communication_skills, color: '#7c3aed' },
          ].map((item, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-overlay)',
              padding: '14px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '0.7rem', color: item.color, fontWeight: 700, marginBottom: 6 }}>Weight {item.weight}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 5 Core Evaluation Criteria ───────────────────────────── */}
      <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700 }}>
          🎯 5 Core Evaluation Criteria (0 - 100)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { name: 'Clarity', val: report.evaluation_criteria.clarity, desc: 'Structural articulation & sentence conciseness' },
            { name: 'Relevance', val: report.evaluation_criteria.relevance, desc: 'Topical alignment with resolution' },
            { name: 'Evidence Strength', val: report.evaluation_criteria.evidence_strength, desc: 'Empirical datasets & authoritative citations' },
            { name: 'Logical Consistency', val: report.evaluation_criteria.logical_consistency, desc: 'Internal non-contradiction & deductive rigor' },
            { name: 'Persuasiveness', val: report.evaluation_criteria.persuasiveness, desc: 'Overall rhetoric, conviction & ethos' },
          ].map((crit, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                <span><strong>{crit.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>— {crit.desc}</span></span>
                <strong style={{ color: 'var(--brand-secondary)' }}>{crit.val} / 100</strong>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${crit.val}%`,
                  height: '100%',
                  background: crit.val >= 80 ? 'var(--brand-success)' : crit.val >= 60 ? 'var(--brand-primary)' : 'var(--brand-warning)',
                  borderRadius: 4,
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Logical Fallacy Inspector ────────────────────────────── */}
      <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem' }}>🔍</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Logical Fallacy Inspector ({report.fallacies.length})
            </h3>
          </div>
        </div>

        {report.fallacies.length === 0 ? (
          <div style={{
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(47,125,91,0.08)',
            border: '1px solid rgba(47,125,91,0.25)',
            display: 'flex', alignItems: 'center', gap: 14
          }}>
            <span style={{ fontSize: '2rem' }}>🎉</span>
            <div>
              <h4 style={{ margin: 0, color: 'var(--brand-success)', fontSize: '1rem' }}>No Logical Fallacies Detected!</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Your speech maintained solid rational coherence without falling into common debate pitfalls like Ad Hominem, Straw Man, or Slippery Slope.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {report.fallacies.map((f, idx) => (
              <div key={idx} style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-overlay)',
                border: '1px solid rgba(184,76,76,0.3)',
                borderLeft: '4px solid var(--brand-danger)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-danger)' }}>
                    ⚠️ Fallacy #{idx + 1}: {f.fallacy_type}
                  </span>
                  <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Severity: {f.severity}
                  </span>
                </div>

                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(184,76,76,0.06)',
                  borderRadius: 'var(--radius-sm)',
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  marginBottom: 10
                }}>
                  "{f.quote}"
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <strong>Why this is flawed:</strong> {f.explanation}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--brand-success)', background: 'rgba(47,125,91,0.08)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <strong>💡 How to correct:</strong> {f.correction_suggestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Argument Mining Extraction ───────────────────────────── */}
      <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700 }}>
          🧩 Extracted Argument Architecture
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--bg-overlay)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CENTRAL THESIS / CLAIM</span>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: 4 }}>
              {report.arguments.central_claim}
            </div>
          </div>

          {report.arguments.premises.length > 0 && (
            <div style={{ background: 'var(--bg-overlay)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUPPORTING PREMISES</span>
              <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {report.arguments.premises.map((p, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {report.arguments.evidence_points.length > 0 && (
            <div style={{ background: 'var(--bg-overlay)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>IDENTIFIED EVIDENCE & DATA CITATIONS</span>
              <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '0.88rem', color: 'var(--brand-success)' }}>
                {report.arguments.evidence_points.map((e, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ─── Strengths & Actionable Recommendations ──────────────── */}
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--brand-secondary)' }}>
            🌟 Key Strengths Identified
          </h3>
          <ul style={{ margin: '0 0 0 18px', padding: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {report.key_strengths.map((str, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{str}</li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--brand-accent)' }}>
            🚀 Actionable Coaching Tips
          </h3>
          <ul style={{ margin: '0 0 0 18px', padding: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {report.actionable_recommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  )
}

