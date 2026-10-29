import { useState, useEffect } from 'react'
import api from '../api/client'
import FallacyCatalogModal from '../components/analysis/FallacyCatalogModal'
import AnalysisResultsView from '../components/analysis/AnalysisResultsView'

/**
 * Benchmark Preset Speeches for Quick Demonstration
 */
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

/**
 * ArgumentAnalysis Page Component — Milestone 2
 * =============================================
 * Orchestrates:
 * 1. Speech Transcript Input (with custom topic & position)
 * 2. Dispatch to AI Argument Analysis & Logical Fallacy Detection Engine
 * 3. Fallacies Guide Modal (Catalog of 8 supported fallacies)
 * 4. Modular Display of Results via AnalysisResultsView
 */
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

  /**
   * Invokes backend analysis endpoint.
   * If Agentic AI (Gemini/OpenAI) is active, LLM extracts claims and evaluates subtle fallacies;
   * otherwise, local heuristic engine performs deterministic regex and criteria scoring.
   */
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
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.8rem' }}>⚡</span>
            <h1 style={{ margin: 0 }}>Argument & Fallacy Lab</h1>
          </div>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
            Automated claim extraction, 8-fallacy detection, and multi-factor argument scoring
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

      {/* Quick Samples Selector */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>QUICK SAMPLES:</span>
        {SAMPLE_SPEECHES.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className="chip"
            onClick={() => handleLoadSample(s)}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: 28, background: 'var(--bg-surface)' }}>
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

      {/* Modular Results View */}
      {report && <AnalysisResultsView report={report} />}

      {/* Fallacy Educational Catalog Modal */}
      <FallacyCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        catalog={fallacyCatalog}
      />
    </div>
  )
}
