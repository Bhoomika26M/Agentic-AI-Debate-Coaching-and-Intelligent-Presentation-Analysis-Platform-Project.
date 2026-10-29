import { useState } from 'react'
import api from '../../api/client'

/**
 * CounterargumentPanel Component
 * ==============================
 * Interactive generator for 5 typed counterarguments:
 * 1. Logical Rebuttals
 * 2. Evidence-Based Rebuttals
 * 3. Ethical Counterarguments
 * 4. Practical Counterarguments
 * 5. Policy Counterarguments
 * Plus Challenge Questions and Tactical Debate Strategies.
 */
export default function CounterargumentPanel({ currentTopic }) {
  const [argumentText, setArgumentText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!argumentText.trim() || argumentText.trim().length < 20) {
      setError('Please enter at least 20 characters of argument text.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/simulation/counterarguments', {
        argument_text: argumentText,
        topic: currentTopic || undefined,
        num_counters: 3,
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate counterarguments.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ background: 'var(--bg-surface)' }}>
      <h3 className="card-title">🥊 Counterargument Generator</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
        Synthesizes 5 typed counterarguments (Logical, Empirical, Ethical, Practical, Policy) with challenge questions.
      </p>

      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          className="input"
          placeholder="Paste any argument or opponent claim to generate counterpoints..."
          value={argumentText}
          onChange={e => setArgumentText(e.target.value)}
          rows={3}
          style={{ resize: 'vertical', fontSize: '0.88rem' }}
        />
        {error && <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{error}</div>}
        <button
          type="submit"
          className="btn btn-secondary btn-sm"
          disabled={loading || argumentText.length < 20}
          style={{ alignSelf: 'flex-start' }}
        >
          {loading ? <span className="spinner" /> : '⚡ Generate Rebuttals'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.counterarguments?.map((c, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  {c.type_label || c.type}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '4px 0 6px' }}>
                {c.counter || c.rebuttal}
              </p>
              {c.challenge_question && (
                <div style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', fontStyle: 'italic' }}>
                  ❓ <strong>Challenge Question:</strong> {c.challenge_question}
                </div>
              )}
            </div>
          ))}

          {result.challenge_questions?.length > 0 && (
            <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SOCRATIC CHALLENGES:</span>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {result.challenge_questions.map((q, idx) => (
                  <li key={idx} style={{ marginBottom: 2 }}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

