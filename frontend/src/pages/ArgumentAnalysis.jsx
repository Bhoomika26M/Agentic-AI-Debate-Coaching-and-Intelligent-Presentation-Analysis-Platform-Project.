import { useState, useEffect } from 'react'
import api from '../api/client'

const SAMPLE_SPEECHES = [
  {
    title: '⚠️ Speech with Multiple Fallacies',
    topic: 'Urban Youth Curfews',
    position: 'Opposition',
    text: `We cannot trust this proposal because my opponent is a liar and corrupt. Furthermore, if we permit this minor curfew revision, it will inevitably lead to complete destruction of our cities and society will collapse. Either we completely abolish curfews or we live in a police state. Everyone knows that famous actors agree this law is completely pointless.`
  },
  {
    title: '✅ Sound Policy Argument (High Score)',
    topic: 'Renewable Energy Transition',
    position: 'Proposition / Affirmative',
    text: `Mr. Speaker, renewable energy adoption represents an indispensable economic necessity. Firstly, empirical analysis from the International Energy Agency indicates solar generation costs declined by 82% over the preceding decade. Secondly, independent economic modeling demonstrates that clean energy transition creates 3.2 times more employment opportunities per dollar invested than legacy fossil fuels. Therefore, public investment yields both ecological sustainability and long-term economic prosperity.`
  },
  {
    title: '⚖️ Nuanced Oxford Debate Statement',
    topic: 'AI Regulation and Governance',
    position: 'Proposition',
    text: `Esteemed adjudicators, proactive governance of frontier AI models is essential for democratic stability. Recent academic research from Stanford and MIT reveals that without auditable safety evals, algorithmic bias in public administration rises by 34%. We do not propose halting innovation; rather, we propose transparent reporting standards similar to aviation safety boards. Consequently, pragmatic oversight preserves innovation while safeguarding citizen trust.`
  }
]

export default function ArgumentAnalysis() {
  const [topic, setTopic] = useState('Renewable Energy Transition')
  const [position, setPosition] = useState('Proposition / Affirmative')
  const [text, setText] = useState(SAMPLE_SPEECHES[1].text)
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [fallacyCatalog, setFallacyCatalog] = useState([])
  const [showCatalogModal, setShowCatalogModal] = useState(false)

  useEffect(() => {
    // Fetch fallacy definitions for educational reference
    api.get('/analysis/fallacies')
      .then(res => setFallacyCatalog(res.data))
      .catch(() => {})

    // Run initial analysis on sample
    runAnalysis(SAMPLE_SPEECHES[1].text, SAMPLE_SPEECHES[1].topic, SAMPLE_SPEECHES[1].position)
  }, [])

  const runAnalysis = async (speechText, speechTopic, speechPosition) => {
    if (!speechText || speechText.trim().length < 10) {
      setError('Please enter at least 10 characters of debate speech or argument text.')
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const res = await api.post('/analysis/evaluate', {
        text: speechText,
        topic: speechTopic || undefined,
        position: speechPosition || undefined
      })
      setReport(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze argument. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAnalyzeClick = (e) => {
    e.preventDefault()
    runAnalysis(text, topic, position)
  }

  const handleLoadSample = (sample) => {
    setTopic(sample.topic)
    setPosition(sample.position)
    setText(sample.text)
    runAnalysis(sample.text, sample.topic, sample.position)
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.8rem' }}>⚡</span>
            <h1 style={{ margin: 0 }}>Argument & Fallacy Lab</h1>
          </div>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
            Milestone 2 AI Engine: 8-Fallacy Detection, Premise-Evidence Mining, and 5-Factor Weighted Scoring
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowCatalogModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          📖 Fallacies Guide ({fallacyCatalog.length || 8})
        </button>
      </div>

      {/* Sample presets */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>QUICK SAMPLES:</span>
        {SAMPLE_SPEECHES.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleLoadSample(s)}
            style={{ fontSize: '0.8rem', background: 'var(--bg-surface)' }}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: 28, border: '1px solid var(--border-medium)', background: 'var(--bg-surface)' }}>
        <form onSubmit={handleAnalyzeClick} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label htmlFor="topic-input" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                DEBATE TOPIC / RESOLUTION
              </label>
              <input
                id="topic-input"
                className="input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. This House Would Ban Anthropomorphic AI"
              />
            </div>
            <div className="form-group">
              <label htmlFor="position-input" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SPEAKER POSITION
              </label>
              <input
                id="position-input"
                className="input"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="e.g. Proposition / Affirmative"
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label htmlFor="speech-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SPEECH TRANSCRIPT / ARGUMENT TEXT *
              </label>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} chars
              </span>
            </div>
            <textarea
              id="speech-text"
              className="input"
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste speech transcript, debate arguments, or rebuttals here to evaluate..."
              style={{ fontSize: '0.92rem', lineHeight: 1.5, resize: 'vertical' }}
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              id="analyze-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={analyzing}
              style={{ padding: '10px 24px', fontWeight: 600, fontSize: '0.95rem' }}
            >
              {analyzing ? <span className="spinner" /> : '⚡ Analyze Arguments & Fallacies'}
            </button>
          </div>
        </form>
      </div>

      {/* Analysis Results Display */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
          
          {/* Top Score Ribbon */}
          <div className="grid-3" style={{ gap: 16 }}>
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(79,70,229,0.08))',
              border: '1px solid rgba(108,99,255,0.3)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              padding: '24px 16px', textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--brand-secondary)' }}>
                OVERALL DEBATE PERFORMANCE
              </span>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: '8px 0' }}>
                {report.overall_score}
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>/100</span>
              </div>
              <span className={`badge ${report.overall_score >= 80 ? 'badge-success' : report.overall_score >= 65 ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.82rem', padding: '4px 12px' }}>
                {report.grade}
              </span>
            </div>

            <div className="card" style={{
              background: report.fallacies.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${report.fallacies.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              padding: '24px 16px', textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: report.fallacies.length > 0 ? '#EF4444' : '#10B981' }}>
                LOGICAL FALLACIES
              </span>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: report.fallacies.length > 0 ? '#EF4444' : '#10B981', lineHeight: 1.1, margin: '8px 0' }}>
                {report.fallacies.length}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {report.fallacies.length === 0 ? 'Flawless reasoning integrity' : 'Violations detected requiring fix'}
              </span>
            </div>

            <div className="card" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: '20px 24px'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                ARGUMENT MINING STATS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Claim Orientation:</span>
                  <strong style={{ color: 'var(--brand-secondary)', textTransform: 'capitalize' }}>{report.arguments.claim_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Evidence Strength:</span>
                  <strong style={{ textTransform: 'capitalize', color: report.arguments.evidence_strength_rating === 'strong' ? 'var(--brand-success)' : '#F59E0B' }}>
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

          {/* 5-Dimensional Weighted Scoring Breakdown Model */}
          <div className="card" style={{ border: '1px solid var(--border-medium)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  📊 Weighted Performance Scoring Model (Page 6-7 Specification)
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Debate Performance Score = AQ(30%) + EU(20%) + LC(20%) + RE(15%) + CS(15%)
                </span>
              </div>
            </div>

            <div className="grid-5" style={{ gap: 12 }}>
              {[
                { label: 'Argument Quality', weight: '30%', score: report.weighted_scores.argument_quality, color: '#6C63FF' },
                { label: 'Evidence Usage', weight: '20%', score: report.weighted_scores.evidence_usage, color: '#10B981' },
                { label: 'Logical Consistency', weight: '20%', score: report.weighted_scores.logical_consistency, color: '#06B6D4' },
                { label: 'Rebuttal Effectiveness', weight: '15%', score: report.weighted_scores.rebuttal_effectiveness, color: '#F59E0B' },
                { label: 'Communication Skills', weight: '15%', score: report.weighted_scores.communication_skills, color: '#EC4899' },
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

          {/* Evaluation Criteria Progress Bars */}
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

          {/* Fallacy Detection Results */}
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
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
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
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderLeft: '4px solid #EF4444'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#EF4444' }}>
                        ⚠️ Fallacy #{idx + 1}: {f.fallacy_type}
                      </span>
                      <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Severity: {f.severity}
                      </span>
                    </div>

                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(239,68,68,0.06)',
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

                    <div style={{ fontSize: '0.85rem', color: 'var(--brand-success)', background: 'rgba(16,185,129,0.08)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <strong>💡 How to correct:</strong> {f.correction_suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Argument Mining Extraction */}
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

          {/* Executive Summary & Recommendations */}
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
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: '#F59E0B' }}>
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
      )}

      {/* Fallacy Educational Catalog Modal */}
      {showCatalogModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatalogModal(false)}>
          <div className="modal" style={{ maxWidth: 760, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>📚 8 Supported Logical Fallacies Reference</h2>
              <button className="modal-close" onClick={() => setShowCatalogModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>
              The platform actively detects and scores these 8 cognitive and rhetorical fallacies:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fallacyCatalog.map((f, idx) => (
                <div key={idx} style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ color: 'var(--brand-secondary)', fontSize: '0.98rem' }}>{idx + 1}. {f.name}</strong>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{f.category}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {f.description}
                  </div>
                  <div style={{ fontSize: '0.82rem', background: 'rgba(239,68,68,0.06)', padding: '6px 10px', borderRadius: 4, fontStyle: 'italic', marginBottom: 6 }}>
                    <strong>Example:</strong> "{f.example}"
                  </div>
                  <div style={{ fontSize: '0.82rem', background: 'rgba(16,185,129,0.08)', padding: '6px 10px', borderRadius: 4, color: 'var(--brand-success)' }}>
                    <strong>Correction:</strong> {f.correction}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowCatalogModal(false)}>Close Reference</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
