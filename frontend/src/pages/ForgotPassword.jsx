import { useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * ForgotPassword Page Component
 * ==============================
 * Follows the identical authentication layout and design system tokens
 * (.auth-page, .auth-card, .auth-logo, .auth-header, .auth-form) as Login.jsx.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.')
      return
    }

    setLoading(true)
    // Simulate API request dispatch
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 700)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🧠</div>
          <span className="auth-logo-text">
            DebateCoach <span style={{ color: 'var(--brand-secondary)' }}>AI</span>
          </span>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p>Enter your registered email address to receive password reset instructions</p>
        </div>

        {/* Error Alert */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Confirmation State */}
        {submitted ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span>✓</span>
              <div>
                <strong>Reset link generated</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                  If an account exists for <strong>{email}</strong>, password reset instructions have been dispatched.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Please check your inbox or spam folder. If you do not see the email within a few minutes, try again.
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => { setSubmitted(false); setEmail('') }}
            >
              Try another email
            </button>
          </div>
        ) : (
          /* Reset Form */
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                className="input"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              id="forgot-submit"
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="auth-footer" style={{ marginTop: 24 }}>
          Remembered your password?{' '}
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}

