import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'learner' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, email: form.email.trim().toLowerCase() }
      await register(payload)
      navigate('/')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to create your account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <p className="eyebrow">Get started</p>
      <h1>Build your practice space.</h1>
      <form className="form-card" onSubmit={submit}>
        <label>
          Name
          <input
            required
            minLength="2"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Jane Doe"
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="jane@example.com"
          />
        </label>
        <label>
          Password
          <input
            required
            minLength="8"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <label>
          Role
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="learner">Learner (Debater / Speaker)</option>
            <option value="debate_coach">Debate Coach</option>
            <option value="educator">Educator / Teacher</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>
        <p className="muted">Use at least 8 characters with uppercase, lowercase, and a number.</p>
        {error && <p className="error-message">{error}</p>}
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create account'}
        </button>
        <p>Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </section>
  )
}
