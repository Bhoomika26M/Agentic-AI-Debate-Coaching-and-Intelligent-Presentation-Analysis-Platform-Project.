import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

const formats = [
  { id: 'one_on_one', label: 'One-on-One Debate', desc: 'Direct turn-based Lincoln-Douglas style debate with alternating speeches.' },
  { id: 'parliamentary', label: 'Parliamentary Debate', desc: 'Government vs. Opposition format focusing on policy motions and rhetoric.' },
  { id: 'oxford', label: 'Oxford Union Debate', desc: 'Traditional resolution debate with structured cross-examination.' },
  { id: 'policy', label: 'Policy Debate', desc: 'Evidence-heavy debate analyzing specific policy plans and counterplans.' },
  { id: 'public_forum', label: 'Public Forum Debate', desc: 'Accessible, current-events-focused debate format.' },
  { id: 'ai_simulation', label: 'AI Sparring Simulation', desc: 'Fast-paced autonomous AI opponent practice round.' },
]

export default function CreateDebate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    topic: '',
    description: '',
    format: formats[0].id,
    scheduled_at: '',
    ai_opponent: true,
    position: 'for',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (saving) return

    if (!form.topic.trim()) {
      setError('Please provide a debate topic resolution.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `debate-${Date.now()}`
      const { data } = await api.post(
        '/debates',
        {
          ...form,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
          idempotency_key: idempotencyKey,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      )
      navigate(`/debates/${data.id}`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to create debate session.')
      setSaving(false)
    }
  }

  const topicSuggestions = [
    'Should universal basic income be implemented globally?',
    'Should artificial intelligence development be strictly regulated by international treaties?',
    'Should standardized testing be abolished in collegiate admissions?',
    'Should carbon taxes be levied on all fossil fuel extraction?',
  ]

  return (
    <section className="page-stack create-debate-page">
      <Link to="/debates" className="text-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        ← Back to Arena Sessions
      </Link>

      <div className="page-heading">
        <div>
          <p className="eyebrow">Practice Arena / New Resolution</p>
          <h1>Initialize Debate Session</h1>
          <p className="lede">
            Configure your resolution topic, choose debate rules, assign your stance, and enable Gemini AI sparring.
          </p>
        </div>
      </div>

      <form className="form-card wide" onSubmit={submit}>
        {/* Topic Input */}
        <label>
          Debate Topic Resolution *
          <input
            required
            minLength="3"
            placeholder="e.g. Should cities expand dedicated protected bike lanes?"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            disabled={saving}
          />
        </label>

        {/* Quick Topic Inspirations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Quick Resolutions:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {topicSuggestions.map((t, idx) => (
              <button
                key={idx}
                type="button"
                className="tag-badge"
                style={{ cursor: 'pointer', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                onClick={() => setForm({ ...form, topic: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selector */}
        <div className="form-grid">
          <label>
            Debate Format
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              disabled={saving}
            >
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Scheduled Session Date/Time (Optional)
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              disabled={saving}
            />
          </label>
        </div>

        {/* Stance & AI Opponent */}
        <div className="form-grid">
          <label>
            Your Starting Stance
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              disabled={saving}
            >
              <option value="for">Affirmative / For the Motion</option>
              <option value="against">Negative / Against the Motion</option>
              <option value="neutral">Neutral / Moderator</option>
            </select>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', cursor: 'pointer', textTransform: 'none' }}>
              <input
                type="checkbox"
                checked={form.ai_opponent}
                onChange={(e) => setForm({ ...form, ai_opponent: e.target.checked })}
                disabled={saving}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 600 }}>Enable Autonomous Gemini AI Opponent</span>
            </label>
            <span className="help-text">
              The AI will automatically adopt the opposing stance and respond contextually.
            </span>
          </div>
        </div>

        {/* Description / Special Rules */}
        <label>
          Session Description & Custom Rules (Optional)
          <textarea
            rows="3"
            placeholder="Add context, evidence limits, time limits, or specific debate guidelines..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={saving}
          />
        </label>

        {error && <p className="error-message" role="alert">{error}</p>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Creating Room...' : 'Launch Debate Arena'}
          </button>
          <Link to="/debates" className="button secondary">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  )
}
