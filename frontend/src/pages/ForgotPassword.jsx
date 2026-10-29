import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

/**
 * ForgotPassword Page Component
 * ==============================
 * Direct in-app password reset workflow:
 * 1. User enters their registered email and clicks "Proceed to Enter New Password"
 * 2. User enters and confirms their new password
 * 3. Password is directly updated via /auth/reset-password in SQLite without requiring external mail services
 */
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Email, 2: New Password, 3: Success
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Validate email and advance to entering new password
  const handleProceedToPassword = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.')
      return
    }
    setStep(2)
  }

  // Step 2: Submit new password to backend
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-check.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        new_password: newPassword,
      })
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password. Please check your email.')
    } finally {
      setLoading(false)
    }
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
          <p>
            {step === 1 && 'Enter your registered email address to set a new password'}
            {step === 2 && 'Enter your new password below to proceed'}
            {step === 3 && 'Password successfully updated'}
          </p>
        </div>

        {/* Error Alert */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleProceedToPassword}>
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
              id="proceed-password-btn"
              className="btn btn-primary btn-full btn-lg"
              type="submit"
            >
              Proceed to Enter New Password →
            </button>
          </form>
        )}

        {/* Step 2: Enter & Confirm New Password */}
        {step === 2 && (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div style={{
              padding: '10px 14px',
              background: 'var(--bg-overlay)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>Resetting for: <strong>{email}</strong></span>
              <button
                type="button"
                onClick={() => { setStep(1); setError('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Change
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                className="input"
                type="password"
                name="newPassword"
                placeholder="Enter at least 6 characters"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your new password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              id="update-password-btn"
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Update Password & Proceed'}
            </button>
          </form>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span>✓</span>
              <div>
                <strong>Password updated successfully!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                  Your password for <strong>{email}</strong> has been updated. You can now sign in with your new credentials.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full btn-lg"
              onClick={() => navigate('/login')}
            >
              Proceed to Sign In →
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="auth-footer" style={{ marginTop: 24 }}>
          Remember your password?{' '}
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
