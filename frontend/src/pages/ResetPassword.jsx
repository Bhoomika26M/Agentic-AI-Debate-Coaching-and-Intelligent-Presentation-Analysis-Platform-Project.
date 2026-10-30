import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [form, setForm] = useState({ token: initialToken, password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please verify both fields.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setSaving(true)

    try {
      const { data } = await api.post('/auth/reset-password', {
        token: form.token.trim(),
        password: form.password,
      })
      setMessage(data.message)
      setForm({ token: '', password: '', confirmPassword: '' })
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to reset your password.')
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
            <h1>Set new password</h1>
            <p>Choose a strong password to protect your account.</p>
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
              <span>{message} Redirecting to sign in...</span>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-input-group">
              <label htmlFor="reset-token">Reset Token</label>
              <input
                id="reset-token"
                required
                placeholder="Paste reset token if not prefilled"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="reset-password">New Password</label>
              <div className="auth-password-wrapper">
                <input
                  id="reset-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={saving}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <input
                id="reset-confirm-password"
                required
                type="password"
                minLength={8}
                placeholder="••••••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                disabled={saving}
              />
            </div>

            <button className="auth-submit-btn" type="submit" disabled={saving}>
              {saving ? 'Updating password...' : 'Update Password & Sign In →'}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
