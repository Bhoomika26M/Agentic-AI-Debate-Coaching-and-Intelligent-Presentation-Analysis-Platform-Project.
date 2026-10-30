import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { formatDateTimeIST } from '../utils/date'

function errorText(error) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') {
    // Redact any leaked tokens or URLs if present in client
    return detail.replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
  }
  return 'The request could not be completed. Please try again.'
}

export default function PresentationAnalysis() {
  const [file, setFile] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [progressStage, setProgressStage] = useState('')
  const [retryingId, setRetryingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/presentations?limit=100')
      setRecords(response.data)
      setError('')
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (!file) {
      setError('Please choose an audio recording or transcript file first.')
      return
    }

    // Client-side file size check (25 MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds the 25 MB size limit. Please upload a smaller recording.')
      return
    }

    setSubmitting(true)
    setProgressStage('Uploading presentation file...')
    setError('')
    setNotice('')

    // Simulated progress stage updates while waiting for LLM
    const stageTimer1 = setTimeout(() => {
      setProgressStage('Transcribing audio speech with Gemini...')
    }, 1800)

    const stageTimer2 = setTimeout(() => {
      setProgressStage('Analyzing delivery pace, clarity, and recommendations...')
    }, 4500)

    try {
      const body = new FormData()
      body.append('file', file)
      await api.post('/presentations', body, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': globalThis.crypto?.randomUUID?.() || `${Date.now()}-${file.name}`,
        },
      })
      setFile(null)
      form.reset()
      setNotice('Presentation successfully analyzed and saved to your history!')
      await loadRecords()
    } catch (requestError) {
      setError(errorText(requestError))
      await loadRecords()
    } finally {
      clearTimeout(stageTimer1)
      clearTimeout(stageTimer2)
      setSubmitting(false)
      setProgressStage('')
    }
  }

  async function handleRetry(recordId) {
    setRetryingId(recordId)
    setError('')
    setNotice('')
    try {
      await api.post(`/presentations/${recordId}/retry`)
      setNotice('Analysis retry completed successfully! Delivery report has been updated.')
      await loadRecords()
    } catch (requestError) {
      setError(errorText(requestError))
      await loadRecords()
    } finally {
      setRetryingId(null)
    }
  }

  async function downloadReport(format) {
    try {
      const response = await api.get(`/presentations/reports.${format}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `presentation-report.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(errorText(requestError))
    }
  }

  return (
    <section className="page-stack analysis-page presentation-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Practice / Presentation Intelligence</p>
          <h1>Presentation & Speech Analysis</h1>
          <p className="lede">
            Upload an audio recording or text transcript for automatic speech-to-text, cadence pacing, filler disfluency, and structural coaching.
          </p>
        </div>
      </div>

      {/* Upload Dropzone Form */}
      <form className="presentation-upload-card" onSubmit={submit}>
        <div className="card-title-row" style={{ marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Upload Speech Recording or Transcript</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Supported audio: MP3, WAV, M4A, OGG, WebM, FLAC (Max: 25 MB). Or paste a UTF-8 text transcript.
            </p>
          </div>
        </div>

        <div className="file-dropzone-box">
          <input
            id="presentation-file"
            type="file"
            className="file-picker-input"
            accept=".mp3,.wav,.m4a,.webm,.ogg,.flac,.txt,.md,audio/*,text/plain,text/markdown"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            disabled={submitting}
          />
          {file ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              ✓ Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Select an MP3/WAV/M4A speech recording or text transcript to begin analysis
            </span>
          )}
        </div>

        {error && <p className="error-message" role="alert">{error}</p>}
        {notice && <p className="success-message" role="status">{notice}</p>}

        {submitting && (
          <div className="presentation-progress-bar">
            <span className="typing-dot" style={{ width: 10, height: 10 }} />
            <span>{progressStage || 'Processing presentation...'}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="button" type="submit" disabled={submitting || !file}>
            {submitting ? 'Analyzing speech...' : 'Submit For Analysis'}
          </button>
        </div>
      </form>

      {/* Saved Reports Header */}
      <div className="presentation-report-actions">
        <div className="card-title-row" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Saved Presentation Reports</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {records.length} {records.length === 1 ? 'submission' : 'submissions'} in your private library
            </p>
          </div>
          <div className="button-group">
            <button className="button secondary" type="button" onClick={() => downloadReport('json')} disabled={loading || records.length === 0}>
              Download JSON Archive
            </button>
            <button className="button secondary" type="button" onClick={() => downloadReport('csv')} disabled={loading || records.length === 0}>
              Download CSV Archive
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="loading-state">Loading saved presentations...</p>}
      {!loading && records.length === 0 && (
        <p className="empty-state">No presentation submissions yet. Upload an audio recording or transcript above to start your history.</p>
      )}

      {!loading &&
        records.map((record) => (
          <PresentationRecord
            key={record.id}
            record={record}
            onRetry={handleRetry}
            isRetrying={retryingId === record.id}
            onError={setError}
          />
        ))}
    </section>
  )
}

function PresentationRecord({ record, onRetry, isRetrying, onError }) {
  const analysis = record.analysis_result
  const [copied, setCopied] = useState(false)

  async function exportSingleReport(format) {
    try {
      const response = await api.get(`/reports/presentation/${record.id}/export?format=${format}`, {
        responseType: 'blob',
      })
      const ext = format === 'excel' ? 'xls' : format
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `presentation-${record.id}-report.${ext}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      onError?.(errorText(requestError))
    }
  }

  function copyTranscript() {
    if (!record.transcript) return
    navigator.clipboard?.writeText(record.transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCompleted = record.status === 'completed'
  const isFailed = record.status === 'failed'

  return (
    <article className="presentation-record">
      <div className="presentation-record-heading">
        <div>
          <p className="eyebrow">
            {record.submission_type?.toUpperCase()} · {formatDateTimeIST(record.created_at)}
          </p>
          <h2>{record.display_filename}</h2>
        </div>
        <div className="record-header-actions">
          <span className={`status ${isCompleted ? 'status-completed' : isFailed ? 'status-cancelled' : 'status-active'}`}>
            {record.status}
          </span>
          {isCompleted && (
            <div className="export-pill-group">
              <button type="button" className="small-button secondary" onClick={() => exportSingleReport('pdf')}>
                Export PDF
              </button>
              <button type="button" className="small-button secondary" onClick={() => exportSingleReport('excel')}>
                Export Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Failed State with Inline Retry */}
      {isFailed && (
        <div className="inline-retry-box" role="alert">
          <div className="inline-retry-content">
            <span className="inline-retry-title">⚠️ Analysis Incomplete</span>
            <span className="inline-retry-desc">
              {record.error_message || 'Audio transcription or delivery analysis could not be completed. Your file is safely stored.'}
            </span>
            <span className="help-text">
              The original recording is preserved on the server. Click retry below to re-run speech transcription and analysis.
            </span>
          </div>
          <div className="retry-action-row">
            <button
              type="button"
              className="retry-action-btn"
              onClick={() => onRetry(record.id)}
              disabled={isRetrying}
            >
              {isRetrying ? '🔄 Retrying Transcription...' : '🔄 Retry Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <>
          <p className="ai-disclaimer-note" style={{ margin: '0 0 12px' }}>
            ℹ️ Automated coaching estimate based on audio transcription; not an objective or guaranteed measurement.
          </p>

          {/* Core Score Summary Banner */}
          <div className="coaching-hero-card">
            <div className="score-ring-badge">
              {analysis?.overall_score == null ? '—' : Math.round(analysis.overall_score)}
              <small>/ 100</small>
            </div>
            <div className="score-summary-text">
              <h2>Overall Presentation Evaluation</h2>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
                <span className="tag-badge">Confidence: {analysis?.confidence_score ?? 'N/A'}/100</span>
                <span className="tag-badge">Clarity: {analysis?.clarity_score ?? 'N/A'}/100</span>
                <span className="tag-badge">Engagement: {analysis?.engagement_score ?? 'N/A'}/100</span>
              </div>
            </div>
          </div>

          {/* Quantitative Speech Delivery Metrics */}
          <div>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>
              Pacing & Delivery Metrics
            </h3>
            <div className="presentation-metrics-grid">
              <div className="presentation-metric-box">
                <span>Speaking Rate</span>
                <strong>{record.speaking_rate_wpm == null ? '—' : `${record.speaking_rate_wpm} WPM`}</strong>
                <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: 130–165 WPM</small>
              </div>

              <div className="presentation-metric-box">
                <span>Filler Words</span>
                <strong>{record.filler_word_count ?? 0}</strong>
                <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disfluency count</small>
              </div>

              <div className="presentation-metric-box">
                <span>Audio Duration</span>
                <strong>{record.duration_seconds == null ? '—' : `${Math.round(record.duration_seconds)}s`}</strong>
                <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total speech length</small>
              </div>

              <div className="presentation-metric-box">
                <span>Total Words</span>
                <strong>{record.word_count ?? '—'}</strong>
                <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Transcribed lexicon</small>
              </div>
            </div>
          </div>

          {/* Qualitative Coaching Feedback Columns */}
          <div className="feedback-columns">
            {analysis?.strengths?.length > 0 && (
              <div className="feedback-col-card strengths">
                <h3>Delivery Strengths</h3>
                <ul>
                  {analysis.strengths.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis?.improvement_areas?.length > 0 && (
              <div className="feedback-col-card improvements">
                <h3>Areas to Improve</h3>
                <ul>
                  {analysis.improvement_areas.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis?.recommendations?.length > 0 && (
              <div className="feedback-col-card suggestions">
                <h3>Practice Recommendations</h3>
                <ul>
                  {analysis.recommendations.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Grounded Observations & Limitations */}
          {analysis?.delivery_observations?.length > 0 && (
            <div className="presentation-report-list">
              <h3>Transcript-Grounded Observations</h3>
              <ul>
                {analysis.delivery_observations.map((item, index) => (
                  <li key={`obs-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis?.limitations?.length > 0 && (
            <div className="presentation-report-list" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <h3 style={{ color: '#92400e' }}>Audio Analysis Limitations</h3>
              <ul>
                {analysis.limitations.map((item, index) => (
                  <li key={`lim-${index}`} style={{ color: '#78350f' }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Saved Transcript Accordion */}
          {record.transcript && (
            <details className="transcript-details">
              <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>View Full Transcribed Speech ({record.word_count || record.transcript.split(/\s+/).length} words)</span>
                <button
                  type="button"
                  className="small-button secondary"
                  onClick={(e) => {
                    e.preventDefault()
                    copyTranscript()
                  }}
                  style={{ marginLeft: 12, padding: '2px 8px', fontSize: '0.72rem' }}
                >
                  {copied ? '✓ Copied' : 'Copy Transcript'}
                </button>
              </summary>
              <p>{record.transcript}</p>
            </details>
          )}
        </>
      )}
    </article>
  )
}
