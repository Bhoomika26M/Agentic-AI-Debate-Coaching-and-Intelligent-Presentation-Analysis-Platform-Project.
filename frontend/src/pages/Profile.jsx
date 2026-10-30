import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const empty = {
  experience_level: 'Intermediate',
  preferred_topics: [],
  presentation_domains: [],
  learning_goals: '',
  coaching_preferences: {
    strictness: 'Balanced',
    focus_area: 'Logical Consistency',
    auto_plans: true,
  },
}

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState(empty)
  const [topics, setTopics] = useState('')
  const [domains, setDomains] = useState('')
  const [preferences, setPreferences] = useState(empty.coaching_preferences)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/profiles/me')
      .then(({ data }) => {
        setForm(data)
        setTopics((data.preferred_topics || []).join(', '))
        setDomains((data.presentation_domains || []).join(', '))
        if (data.coaching_preferences && typeof data.coaching_preferences === 'object') {
          setPreferences({
            strictness: data.coaching_preferences.strictness || 'Balanced',
            focus_area: data.coaching_preferences.focus_area || 'Logical Consistency',
            auto_plans: data.coaching_preferences.auto_plans ?? true,
          })
        }
      })
      .catch(() => setError('Unable to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const profile = {
        ...form,
        preferred_topics: topics.split(',').map((item) => item.trim()).filter(Boolean),
        presentation_domains: domains.split(',').map((item) => item.trim()).filter(Boolean),
        coaching_preferences: preferences,
      }
      await api.put('/profiles/me', profile)
      const { data } = await api.put('/users/me', { name: form.name || user.name })
      setUser(data)
      setMessage('Profile and AI coaching preferences saved successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-state">Loading profile context...</div>

  const roleLabel = (user?.role || 'learner').replace('_', ' ').toUpperCase()

  return (
    <section className="page-stack profile-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account Settings / Context</p>
          <h1>Profile & Coaching Preferences</h1>
          <p className="lede">
            Personalize your skill targets, learning goals, and AI coaching rubric preferences.
          </p>
        </div>
      </div>

      <form className="form-card wide" onSubmit={submit}>
        {/* User Identity Section */}
        <div className="form-grid">
          <label>
            Full Name
            <input
              type="text"
              required
              value={form.name ?? user.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={saving}
            />
          </label>

          <label>
            Email Address
            <input type="email" value={user.email} disabled />
            <span className="help-text">Managed by account authentication</span>
          </label>
        </div>

        <div className="form-grid">
          <label>
            Account Role
            <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
              <span className={`tag-badge creator-badge`} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                🛡️ {roleLabel}
              </span>
            </div>
            <span className="help-text">Role assigned in platform RBAC system</span>
          </label>

          <label>
            Experience Level
            <select
              value={form.experience_level || 'Intermediate'}
              onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
              disabled={saving}
            >
              <option value="Beginner">Beginner (Novice Debater)</option>
              <option value="Intermediate">Intermediate (Club / Course Debater)</option>
              <option value="Advanced">Advanced (Varsity / Competition)</option>
              <option value="Collegiate">Collegiate / Professional</option>
            </select>
          </label>
        </div>

        {/* Practice Preferences */}
        <label>
          Preferred Debate Topics
          <input
            type="text"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="climate policy, artificial intelligence, healthcare, education"
            disabled={saving}
          />
          <span className="help-text">Comma-separated topics you frequently practice or research.</span>
        </label>

        <label>
          Presentation Domains
          <input
            type="text"
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="academic defense, keynote, sales pitch, parliamentary debate"
            disabled={saving}
          />
          <span className="help-text">Comma-separated presentation environments.</span>
        </label>

        <label>
          Learning & Improvement Goals
          <textarea
            value={form.learning_goals || ''}
            onChange={(e) => setForm({ ...form, learning_goals: e.target.value })}
            rows="3"
            placeholder="e.g. Reduce filler word frequency, improve cross-examination rebuttals, strengthen empirical warranting."
            disabled={saving}
          />
        </label>

        {/* AI Coaching Preferences Card */}
        <div className="card" style={{ background: '#f8fafc', marginTop: '10px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>
            🤖 AI Coaching Personalization
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
            Customize how the Gemini AI Debate Coach assesses your arguments and formats feedback.
          </p>

          <div className="form-grid">
            <label>
              Feedback Strictness
              <select
                value={preferences.strictness}
                onChange={(e) => setPreferences({ ...preferences, strictness: e.target.value })}
                disabled={saving}
              >
                <option value="Gentle">Gentle (Encouraging, focus on fundamentals)</option>
                <option value="Balanced">Balanced (Standard academic rubric)</option>
                <option value="Rigorous">Rigorous (Strict tournament judging standard)</option>
              </select>
            </label>

            <label>
              Priority Focus Area
              <select
                value={preferences.focus_area}
                onChange={(e) => setPreferences({ ...preferences, focus_area: e.target.value })}
                disabled={saving}
              >
                <option value="Argument Structure">Argument Structure & Claims</option>
                <option value="Evidence & Data">Evidence, Citations & Data</option>
                <option value="Logical Consistency">Logical Consistency & Fallacy Spotting</option>
                <option value="Rebuttal Strategy">Rebuttal Strategy & Counterarguments</option>
                <option value="Delivery & Clarity">Delivery, Clarity & Rhetoric</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '14px', cursor: 'pointer', textTransform: 'none' }}>
            <input
              type="checkbox"
              checked={preferences.auto_plans}
              onChange={(e) => setPreferences({ ...preferences, auto_plans: e.target.checked })}
              disabled={saving}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#334155' }}>
              Automatically generate structured improvement action plans after each session
            </span>
          </label>
        </div>

        {error && <p className="error-message" role="alert">{error}</p>}
        {message && <p className="success-message" role="status">{message}</p>}

        <button className="button" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving Preferences...' : 'Save Profile & Preferences'}
        </button>
      </form>
    </section>
  )
}
