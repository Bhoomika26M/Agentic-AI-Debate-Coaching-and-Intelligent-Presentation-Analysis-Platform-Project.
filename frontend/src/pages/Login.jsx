import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from?.pathname || '/')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Invalid email or password. Please try again.')
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

        {/* Authentication Card */}
        <div className="auth-card">
          <div className="auth-card-title">
            <h1>Welcome back</h1>
            <p>Sign in to your account to continue your debate training.</p>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-input-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                required
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="auth-link" tabIndex={saving ? -1 : 0}>
                  Forgot password?
                </Link>
              </div>
              <div className="auth-password-wrapper">
                <input
                  id="login-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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

            <button className="auth-submit-btn" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in to DebateAI →</span>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create an account</Link>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="auth-trust-badge">
          <span>🔒 Secure JWT Authentication</span>
          <span>•</span>
          <span>⚡ Live Gemini AI Sparring</span>
        </div>
      </div>
    </div>
  )
}
