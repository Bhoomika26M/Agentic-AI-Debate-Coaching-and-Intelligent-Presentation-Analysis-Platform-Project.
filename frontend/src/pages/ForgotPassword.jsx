import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() })
      setMessage(data.message)
      setEmail('')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to process your request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card-wrapper">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-brand-logo">
            <span className="auth-logo-badge">⚡</span>
            <span>DebateAI</span>
          </div>
          <p className="auth-brand-tagline">
            Agentic AI Debate Coach & Presentation Analysis Platform
          </p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="auth-card-title">
            <h1>Reset your password</h1>
            <p>Enter your account email to receive a secure reset link.</p>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-success-box" role="status">
              <span>✅</span>
              <span>{message}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-input-group">
              <label htmlFor="forgot-email">Account Email</label>
              <input
                id="forgot-email"
                required
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
              />
            </div>

            <button className="auth-submit-btn" type="submit" disabled={saving}>
              {saving ? 'Sending reset link...' : 'Send Password Reset Link →'}
            </button>
          </form>

          <div className="auth-footer">
            Remember your credentials?{' '}
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
