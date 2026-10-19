import { useState, useEffect } from 'react'
import api from '../api/client'

const SAMPLE_SPEECHES = [
  {
    label: '⚠️ Filler-Heavy Speech',
    text: `Um, so like, basically what I want to say is, you know, climate change is uh kind of a big deal. I mean, honestly, it's like really serious. So um we should maybe, you know, do something about it. I think, sort of, the government should, uh, act. Well, anyway, that's what I believe.`,
  },
  {
    label: '✅ Strong Confident Speech',
    text: `Climate change represents the defining crisis of our generation. Firstly, the scientific consensus is unambiguous: global temperatures have risen 1.2°C above pre-industrial levels, with catastrophic acceleration in the past decade. Secondly, economic analysis from McKinsey Global Institute confirms that unmitigated climate change will reduce global GDP by 10% by 2050. Therefore, immediate governmental intervention is not merely advisable — it is an economic and moral imperative. In conclusion, the cost of inaction dramatically outweighs the investment required for systemic transition.`,
  },
  {
    label: '📊 Academic Presentation',
    text: `Good afternoon. Today I present findings from our longitudinal study on renewable energy adoption. Consider this: nations that implemented feed-in tariff policies saw solar capacity increase by an average of 340% within five years. However, implementation barriers remain significant. Our analysis reveals three primary obstacles: financing gaps, grid infrastructure limitations, and regulatory complexity. The evidence demonstrates that a coordinated policy framework addressing all three simultaneously yields the most robust outcomes. To summarise, targeted policy design is the critical variable in successful energy transition.`,
  },
]

export default function PresentationAnalysis() {
  const [inputMode, setInputMode]   = useState('text') // 'text' | 'audio'
  const [transcript, setTranscript] = useState(SAMPLE_SPEECHES[1].text)
  const [duration, setDuration]     = useState('')
  const [title, setTitle]           = useState('My Presentation')
  const [audioFile, setAudioFile]   = useState(null)

  const [report, setReport]         = useState(null)
  const [history, setHistory]       = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [tips, setTips]             = useState([])
  const [showTips, setShowTips]     = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await api.get('/presentation/history')
      setHistory(res.data.history || [])
    } catch {}
  }

  const analyze = async () => {
    setError('')
    setLoading(true)
    try {
      if (inputMode === 'audio') {
        if (!audioFile) {
          setError('Please select an audio file to analyze.')
          setLoading(false)
          return
        }
        const formData = new FormData()
        formData.append('audio_file', audioFile)
        if (title) formData.append('title', title)

        const res = await api.post('/presentation/upload-audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setReport(res.data)
        loadHistory()
      } else {
        if (!transcript.trim() || transcript.trim().length < 20) {
          setError('Please enter at least 20 characters of speech text.')
          setLoading(false)
          return
        }
        const res = await api.post('/presentation/analyze', {
          transcript,
          duration_seconds: duration ? Number(duration) : undefined,
          title: title || undefined,
        })
        setReport(res.data)
        loadHistory()
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze presentation.')
    } finally {
      setLoading(false)
    }
  }

  const loadTips = async (category = '') => {
    try {
      const params = category ? { category } : {}
      const res = await api.get('/presentation/tips', { params })
      setTips(res.data)
      setShowTips(true)
    } catch {}
  }

  const scoreColor = (score) => {
    if (score >= 80) return '#10b981'
    if (score >= 65) return '#f59e0b'
    return '#ef4444'
  }

  const gradeColor = (grade) => {
    if (grade?.startsWith('A')) return '#10b981'
    if (grade?.startsWith('B')) return '#f59e0b'
    return '#ef4444'
  }

  const wc = transcript.split(/\s+/).filter(Boolean).length

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">🎤 Presentation & Speech Analytics</h1>
            <p className="page-subtitle">Acoustic pacing, filler word mining, delivery confidence, and structure</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(true)}>
              📜 History ({history.length})
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => loadTips()}>
              💡 View Tips
            </button>
          </div>
        </div>

        {/* Input Mode Selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            className={`btn btn-sm ${inputMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setInputMode('text')}
          >
            📝 Transcript Text
          </button>
          <button
            className={`btn btn-sm ${inputMode === 'audio' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setInputMode('audio')}
          >
            🎙️ Audio Upload / Speech Recognition
          </button>
        </div>

        {/* Input area */}
        <div className="card">
          <h2 className="card-title">
            {inputMode === 'text' ? '📝 Speech Transcript Input' : '🎙️ Audio Recording Upload'}
          </h2>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Presentation Title</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Climate Policy Keynote"
              />
            </div>
            {inputMode === 'text' && (
              <div className="form-group">
                <label>Duration (seconds, optional)</label>
                <input
                  className="form-input"
                  type="number"
                  min="10"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="e.g. 180"
                />
              </div>
            )}
          </div>

          {inputMode === 'text' ? (
            <>
              <div className="sample-chips" style={{ marginBottom: '12px' }}>
                {SAMPLE_SPEECHES.map(s => (
                  <button key={s.label} className="chip" onClick={() => setTranscript(s.text)}>
                    {s.label}
                  </button>
                ))}
              </div>

              <textarea
                className="speech-textarea"
                placeholder="Paste or type your speech transcript here..."
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={8}
              />
              <div className="speech-footer">
                <span className="word-count">{wc} words</span>
                {error && <span className="error-inline">{error}</span>}
                <button className="btn btn-primary" onClick={analyze} disabled={loading}>
                  {loading ? '⏳ Analysing...' : '🎤 Analyse Presentation'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '24px', border: '2px dashed var(--border-medium)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>🎙️</span>
              <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)' }}>
                Upload recorded speech audio (.wav, .mp3, .m4a, .webm) for speech extraction & prosody analysis
              </p>
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
                style={{ marginBottom: 16 }}
              />
              {audioFile && (
                <div style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', marginBottom: 14 }}>
                  Selected: <strong>{audioFile.name}</strong> ({(audioFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              {error && <div className="error-msg" style={{ marginBottom: 14 }}>{error}</div>}
              <div>
                <button className="btn btn-primary" onClick={analyze} disabled={loading || !audioFile}>
                  {loading ? '⏳ Processing Audio...' : '🚀 Transcribe & Analyze Audio'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {report && (
          <div className="pres-results">
            {/* Overall score hero */}
            <div className="card pres-hero">
              <div className="pres-hero-content">
                <div>
                  <div className="pres-overall-score" style={{ color: gradeColor(report.grade) }}>
                    {report.overall_score || report.overall_presentation_score}
                    <span className="pres-grade">{report.grade}</span>
                  </div>
                  <div className="pres-meta">
                    {report.word_count} words · ~{report.estimated_wpm || report.pacing?.words_per_minute} WPM · {report.filler_word_count || report.filler_analysis?.total_fillers} fillers ({report.filler_rate_percent || report.filler_analysis?.filler_rate_percent}%)
                  </div>
                </div>
                <div className="pres-pace-badge">
                  <span className={`pace-label ${report.pace_label?.toLowerCase().replace(' ', '-')}`}>
                    🏃 {report.pace_label || report.pacing?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Score bars */}
            <div className="card">
              <h3 className="card-title">📊 Score Breakdown</h3>
              <div className="score-bars">
                {Object.entries(report.scores || {}).filter(([k]) => k !== 'overall').map(([key, val]) => (
                  <div key={key} className="score-bar-row">
                    <div className="score-bar-label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                    <div className="score-bar-track">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${val}%`, background: scoreColor(val) }}
                      />
                    </div>
                    <div className="score-bar-value" style={{ color: scoreColor(val) }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="pres-two-col">
              <div className="card">
                <h3 className="card-title" style={{ color: '#10b981' }}>✅ Delivery Strengths</h3>
                <ul className="pres-list">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="strength-item">✓ {s}</li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h3 className="card-title" style={{ color: '#f59e0b' }}>⚠️ Priority Growth Areas</h3>
                <ul className="pres-list">
                  {report.improvements?.map((imp, i) => (
                    <li key={i} className="improvement-item">! {imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Structure checklist */}
            <div className="card">
              <h3 className="card-title">🏗️ Structure Checklist</h3>
              <div className="checklist">
                {[
                  ['Strong Opener', report.structure_analysis?.has_strong_opener],
                  ['Clear Transitions', report.structure_analysis?.has_clear_transitions],
                  ['Conclusion Present', report.structure_analysis?.has_conclusion],
                ].map(([label, ok]) => (
                  <div key={label} className={`checklist-item ${ok ? 'ok' : 'fail'}`}>
                    {ok ? '✅' : '❌'} {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Top fillers */}
            {report.top_filler_words?.length > 0 && (
              <div className="card">
                <h3 className="card-title">🚫 Top Filler Words</h3>
                <div className="filler-chips">
                  {report.top_filler_words.map(([word, count], i) => (
                    <div key={i} className="filler-chip">
                      <strong>"{word}"</strong> × {count}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <div className="modal-overlay" onClick={() => setShowHistory(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
              <div className="modal-header">
                <h2>📜 Presentation Performance History</h2>
                <button className="modal-close" onClick={() => setShowHistory(false)}>✕</button>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {history.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
                    No recorded presentations yet. Run an analysis above to start tracking!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {history.map(h => (
                      <div key={h.id} style={{
                        padding: 14,
                        background: 'var(--bg-overlay)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{h.title}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {new Date(h.date).toLocaleDateString()} · {h.words_per_minute} WPM · {h.filler_rate_percent}% fillers
                          </div>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: scoreColor(h.overall_score) }}>
                          {h.overall_score}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tips modal */}
        {showTips && (
          <div className="modal-overlay" onClick={() => setShowTips(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>💡 Presentation Tips</h2>
                <button className="modal-close" onClick={() => setShowTips(false)}>✕</button>
              </div>
              <div className="tips-filter">
                {['', 'filler_words', 'pacing', 'confidence', 'engagement', 'clarity', 'structure'].map(cat => (
                  <button key={cat} className="chip" onClick={() => loadTips(cat)}>
                    {cat || 'All'}
                  </button>
                ))}
              </div>
              <div className="tips-list">
                {tips.map((t, i) => (
                  <div key={i} className="tip-modal-item">
                    <div className="tip-category">{t.category}</div>
                    <div className="tip-text">💡 {t.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
