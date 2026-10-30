import { useEffect, useState } from 'react'
import api from '../services/api'

const initialForm = {
  topic: '',
  argument_text: '',
  position: 'neutral',
}

const DIMENSION_CONFIG = {
  'Logical Rebuttals': {
    badgeClass: 'logical',
    icon: '🧩',
    title: 'Logical Rebuttals',
    hint: 'Challenges underlying premises, unstated assumptions, and causal links.',
  },
  'Evidence-Based Rebuttals': {
    badgeClass: 'evidence',
    icon: '📊',
    title: 'Evidence-Based Rebuttals',
    hint: 'Counters with empirical baselines, alternative data, and sample limitations.',
  },
  'Ethical Counterarguments': {
    badgeClass: 'ethical',
    icon: '⚖️',
    title: 'Ethical Counterarguments',
    hint: 'Examines distributional fairness, equity impacts, and stakeholder rights.',
  },
  'Practical Counterarguments': {
    badgeClass: 'practical',
    icon: '🛠️',
    title: 'Practical Counterarguments',
    hint: 'Addresses operational friction, resource constraints, and execution limits.',
  },
  'Policy Counterarguments': {
    badgeClass: 'policy',
    icon: '🏛️',
    title: 'Policy Counterarguments',
    hint: 'Evaluates regulatory feasibility, precedent, and unintended systemic side effects.',
  },
}

export default function ArgumentAnalysis() {
  const [activeMode, setActiveMode] = useState('evaluation') // 'evaluation' | 'counterarguments'
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [result, setResult] = useState(null)

  // Counterargument state
  const [counterResponse, setCounterResponse] = useState(null)
  const [counterLoading, setCounterLoading] = useState(false)

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      setHistoryError('')
      const { data } = await api.get('/analysis/arguments')
      setHistory(data)
      if (data.length && !result) setResult(data[0])
    } catch (err) {
      setHistoryError('Unable to load past analyses right now.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleSelect = async (analysisId) => {
    try {
      setError('')
      const { data } = await api.get(`/analysis/arguments/${analysisId}`)
      setResult(data)
    } catch (err) {
      setError('The selected analysis could not be loaded.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')

    const trimmedTopic = form.topic.trim()
    const trimmedText = form.argument_text.trim()

    if (!trimmedTopic || !trimmedText) {
      setError('Please provide both a debate topic and argument text.')
      return
    }

    if (trimmedText.length < 20) {
      setError('Argument text must be at least 20 characters long.')
      return
    }

    try {
      setSubmitting(true)
      const { data } = await api.post('/analysis/arguments', {
        topic: trimmedTopic,
        argument_text: trimmedText,
        position: form.position,
      })
      setResult(data)
      await loadHistory()
    } catch (err) {
      const message = err.response?.data?.detail || 'The analysis could not be completed. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateCounterarguments = async (event) => {
    event.preventDefault()
    if (counterLoading) return
    setError('')

    const trimmedTopic = form.topic.trim()
    const trimmedText = form.argument_text.trim()

    if (!trimmedTopic || !trimmedText) {
      setError('Please provide both a debate topic and argument text to generate counterarguments.')
      return
    }

    try {
      setCounterLoading(true)
      const { data } = await api.post('/analysis/counterarguments', {
        topic: trimmedTopic,
        argument_text: trimmedText,
        position: form.position,
      })
      setCounterResponse(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate counterarguments.')
    } finally {
      setCounterLoading(false)
    }
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <section className="page-stack analysis-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AI / Argument & Reasoning Intelligence</p>
          <h1>Critical Thinking & Rebuttal Studio</h1>
          <p className="lede">
            Evaluate claim validity, identify 8 logical fallacies, score reasoning quality, and generate 5-type strategic counterarguments.
          </p>
        </div>

        <div className="role-switcher" role="tablist">
          <button
            type="button"
            className={`tab-pill ${activeMode === 'evaluation' ? 'active' : ''}`}
            onClick={() => setActiveMode('evaluation')}
          >
            Argument Evaluation & Fallacies
          </button>
          <button
            type="button"
            className={`tab-pill ${activeMode === 'counterarguments' ? 'active' : ''}`}
            onClick={() => setActiveMode('counterarguments')}
          >
            Counterargument Engine (5 Types)
          </button>
        </div>
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}

      {/* ====================================================================
          TAB 1: ARGUMENT EVALUATION & FALLACIES
          ==================================================================== */}
      {activeMode === 'evaluation' && (
        <>
          <div className="analysis-layout">
            {/* Input Form Column */}
            <div className="analysis-panel">
              <form className="form-card wide" onSubmit={handleSubmit}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px' }}>
                  Analyze Your Argument
                </h3>
                <label>
                  Debate topic
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
                    placeholder="e.g. AI should be allowed in education"
                    disabled={submitting}
                    required
                  />
                </label>

                <label>
                  Your argument or debate transcript
                  <textarea
                    rows="7"
                    value={form.argument_text}
                    onChange={(event) => setForm((current) => ({ ...current, argument_text: event.target.value }))}
                    placeholder="State your main claim, supporting reasons, and empirical evidence or warrants..."
                    disabled={submitting}
                    required
                    minLength="20"
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ flex: 1, margin: 0 }}>
                    Position
                    <select
                      value={form.position}
                      onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
                      disabled={submitting}
                    >
                      <option value="neutral">Neutral / Balanced</option>
                      <option value="for">For the proposition</option>
                      <option value="against">Against the proposition</option>
                    </select>
                  </label>
                  <span className="help-text" style={{ marginLeft: '16px', alignSelf: 'flex-end', paddingBottom: '8px' }}>
                    {form.argument_text.length} characters
                  </span>
                </div>

                <div className="form-actions" style={{ marginTop: '8px' }}>
                  <button className="button" type="submit" disabled={submitting || form.argument_text.trim().length < 20}>
                    {submitting ? 'Analyzing reasoning…' : 'Submit for analysis'}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setForm(initialForm)}
                    disabled={submitting}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* Results Column */}
            <div className="analysis-result-panel">
              {!result ? (
                <div className="empty-state">
                  No analysis selected. Submit an argument on the left or select one from your saved history below.
                </div>
              ) : (
                <>
                  <div className="analysis-metadata">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`stance-pill ${result.position || 'neutral'}`}>
                        {(result.position || 'neutral').toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{result.topic}</strong>
                    </div>
                    <span className="help-text">{formatter.format(new Date(result.created_at))}</span>
                  </div>

                  {/* Overall Reasoning Quality Banner */}
                  <div className="score-summary-banner">
                    <div className="score-ring-badge">
                      <span>{Math.round(result.overall_score ?? 0)}</span>
                      <small>/ 100</small>
                    </div>
                    <div className="score-summary-text">
                      <h2>Overall Reasoning Quality</h2>
                      <p>{result.feedback_report || 'Coherent argument structure grounded in the text provided.'}</p>
                    </div>
                  </div>

                  {/* 5-Criteria Compact Score Grid */}
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Competency Breakdown
                  </h4>
                  <div className="score-grid">
                    {(result.scores || []).map((entry) => {
                      const scoreVal = entry.score ?? 0
                      return (
                        <div key={entry.criterion} className="score-card">
                          <div className="score-card-header">
                            <span className="score-card-criterion">{entry.criterion.replace('_', ' ')}</span>
                            <span className="score-card-value">{scoreVal}/100</span>
                          </div>
                          <div className="score-meter-bar">
                            <div className="score-meter-fill" style={{ width: `${Math.min(100, Math.max(5, scoreVal))}%` }} />
                          </div>
                          <p>{entry.explanation}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Main Claim Extracted */}
                  <div className="detail-block">
                    <div className="detail-block-header">
                      <span>🎯</span>
                      <h3>Main Claim Extracted</h3>
                    </div>
                    <div className="highlight-claim-box">
                      {(result.claims || [])[0]?.text || 'No explicit central claim was separated in the text.'}
                    </div>
                  </div>

                  {/* Supporting Claims */}
                  <div className="detail-block">
                    <div className="detail-block-header">
                      <span>📌</span>
                      <h3>Supporting Claims</h3>
                    </div>
                    {((result.claims || []).filter((claim) => claim.claim_type !== 'main')).length > 0 ? (
                      <ul>
                        {(result.claims || [])
                          .filter((claim) => claim.claim_type !== 'main')
                          .map((claim, i) => (
                            <li key={i}>{claim.text}</li>
                          ))}
                      </ul>
                    ) : (
                      <p className="muted">No secondary claims separated; the argument relies directly on the central claim.</p>
                    )}
                  </div>

                  {/* Evidence Assessment */}
                  <div className="detail-block">
                    <div className="detail-block-header">
                      <span>📊</span>
                      <h3>Evidence Assessment</h3>
                    </div>
                    {(result.evidence || []).length > 0 ? (
                      <ul>
                        {(result.evidence || []).map((item, idx) => (
                          <li key={idx}>
                            <strong>{item.explicitly_present ? 'User-Provided Evidence:' : 'Suggested Research Evidence:'}</strong>{' '}
                            {item.evidence_text}
                            {item.relevance != null && (
                              <span className="help-text" style={{ marginLeft: '6px' }}>
                                (Relevance: {item.relevance}/100)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No direct empirical evidence or statistical markers were identified in the text supplied.</p>
                    )}
                  </div>

                  {/* Reasoning Quality & Logical Consistency */}
                  <div className="detail-block">
                    <div className="detail-block-header">
                      <span>🧠</span>
                      <h3>Reasoning Quality & Logical Consistency</h3>
                    </div>
                    <p>{result.reasoning_assessment?.logical_consistency || 'Reasoning structure is coherent.'}</p>
                    {(result.reasoning_assessment?.suggestions || []).length > 0 && (
                      <ul style={{ marginTop: '8px' }}>
                        {result.reasoning_assessment.suggestions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Supported Fallacy Detection (8 Models) */}
                  <div className="detail-block">
                    <div className="detail-block-header">
                      <span>🛡️</span>
                      <h3>Supported Fallacy Detection (8 Fallacy Models)</h3>
                    </div>
                    {(result.detected_fallacies || []).length > 0 ? (
                      (result.detected_fallacies || []).map((fallacy, idx) => (
                        <div key={idx} className="fallacy-card">
                          <span className="fallacy-card-title">⚠️ {fallacy.name}</span>
                          <div className="fallacy-excerpt">"{fallacy.excerpt}"</div>
                          <p>{fallacy.explanation}</p>
                          <div className="fallacy-suggestion">
                            <strong>Correction Suggestion:</strong> {fallacy.suggestion}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-fallacy-badge">
                        <span>✅</span>
                        <span>No logical fallacies detected among the 8 supported fallacy models.</span>
                      </div>
                    )}
                  </div>

                  {/* Actionable Improvement Suggestions */}
                  <div className="detail-block">
                    <div className="detail-block-header">
                      <span>💡</span>
                      <h3>Actionable Improvement Suggestions</h3>
                    </div>
                    <ul>
                      {(result.improvement_suggestions || []).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Saved Analysis History */}
          <div className="history-panel">
            <h2>Saved Analysis History</h2>
            {historyLoading && <div className="loading-state">Loading your analysis history…</div>}
            {!historyLoading && historyError && <p className="error-message">{historyError}</p>}
            {!historyLoading && !history.length && (
              <div className="empty-state">No previous arguments have been analyzed yet.</div>
            )}
            {!historyLoading && history.length > 0 && (
              <div className="analysis-cards-grid">
                {history.map((analysis) => {
                  const isSelected = result?.id === analysis.id
                  return (
                    <button
                      key={analysis.id}
                      type="button"
                      className={`analysis-card-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelect(analysis.id)}
                    >
                      <div className="analysis-card-header">
                        <span className={`stance-pill ${analysis.position || 'neutral'}`}>
                          {(analysis.position || 'neutral').toUpperCase()}
                        </span>
                        <span className="analysis-card-score">
                          {Math.round(analysis.overall_score ?? 0)}/100
                        </span>
                      </div>
                      <h4>{analysis.topic}</h4>
                      <span className="analysis-card-date">
                        {formatter.format(new Date(analysis.created_at))}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ====================================================================
          TAB 2: COUNTERARGUMENT & REBUTTAL ENGINE (5 TYPES)
          ==================================================================== */}
      {activeMode === 'counterarguments' && (
        <div className="counterarguments-section">
          <form className="form-card wide" onSubmit={handleGenerateCounterarguments}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px' }}>
              Generate Strategic Counterarguments
            </h3>
            <label>
              Debate Topic
              <input
                required
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. AI should be allowed in education"
                disabled={counterLoading}
              />
            </label>
            <label>
              Opposing Argument or User Claim
              <textarea
                required
                rows="4"
                value={form.argument_text}
                onChange={(e) => setForm({ ...form, argument_text: e.target.value })}
                placeholder="Enter the argument you wish to rebut or find counterpoints against..."
                disabled={counterLoading}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <label style={{ flex: 1, margin: 0 }}>
                Stance of the Claim
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  disabled={counterLoading}
                >
                  <option value="against">Against the topic</option>
                  <option value="for">For the topic</option>
                  <option value="neutral">Neutral / Exploratory</option>
                </select>
              </label>
              <button
                type="submit"
                className="button"
                style={{ marginLeft: '16px', alignSelf: 'flex-end' }}
                disabled={counterLoading || !form.topic.trim() || !form.argument_text.trim()}
              >
                {counterLoading ? 'Generating Counterarguments…' : '⚡ Generate 5 Counterargument Types & Strategies'}
              </button>
            </div>
          </form>

          {counterResponse && (
            <div className="counterarguments-results">
              <div className="page-heading" style={{ marginTop: '12px' }}>
                <div>
                  <p className="eyebrow">Strategic Rebuttals</p>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    Counterarguments Across 5 Required Dimensions
                  </h2>
                  <p className="lede">
                    Targeted rebuttals designed to deconstruct the opposing stance from logical, empirical, ethical, practical, and policy angles.
                  </p>
                </div>
              </div>

              {/* 5 Distinct Dimension Cards */}
              <div className="counter-cards-grid">
                {counterResponse.counterarguments.map((ca, idx) => {
                  const config = DIMENSION_CONFIG[ca.type] || {
                    badgeClass: 'logical',
                    icon: '💡',
                    title: ca.type,
                    hint: 'Strategic counterposition.',
                  }
                  return (
                    <article key={idx} className="counter-card">
                      <div className="counter-card-header">
                        <span className={`counter-dimension-badge ${config.badgeClass}`}>
                          <span>{config.icon}</span>
                          <span>{ca.type}</span>
                        </span>
                        <span className="help-text">{config.hint}</span>
                      </div>

                      <div>
                        <div className="counter-block-title">Core Opposing Point</div>
                        <div className="counter-contention-box">"{ca.claim}"</div>
                      </div>

                      <div>
                        <div className="counter-block-title">Rebuttal Strategy</div>
                        <div className="counter-rebuttal-box">{ca.rebuttal}</div>
                      </div>

                      <div>
                        <div className="counter-block-title">Example Counterargument</div>
                        <div className="counter-example-box">
                          <p>{ca.counterpoint}</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* 3-Panel Bottom Strategies Grid */}
              <div className="counter-supplement-grid">
                <article className="supplement-card">
                  <h3>
                    <span>🧭</span> Alternative Perspectives
                  </h3>
                  <ul>
                    {counterResponse.alternative_perspectives.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </article>

                <article className="supplement-card">
                  <h3>
                    <span>❓</span> Probing Challenge Questions
                  </h3>
                  <ul>
                    {counterResponse.challenge_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </article>

                <article className="supplement-card">
                  <h3>
                    <span>🎯</span> Actionable Debate Strategies
                  </h3>
                  <ul>
                    {counterResponse.debate_strategies.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
