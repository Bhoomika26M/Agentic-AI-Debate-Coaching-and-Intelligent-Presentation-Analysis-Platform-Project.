import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'learner',  icon: '🎓', label: 'Learner',  desc: 'Improve debate skills' },
  { value: 'coach',    icon: '🏆', label: 'Coach',    desc: 'Guide & evaluate students' },
  { value: 'educator', icon: '📚', label: 'Educator', desc: 'Manage classes & reports' },
]

export default function Signup() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [step, setStep]     = useState(1)
  const [form, setForm]     = useState({ full_name: '', email: '', password: '', confirm: '', role: 'learner' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const nextStep = (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email) { setError('Please fill in all fields.'); return }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await register({ full_name: form.full_name, email: form.email, password: form.password, role: form.role })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🧠</div>
          <span className="auth-logo-text">
            DebateCoach <span style={{ color: 'var(--brand-secondary)' }}>AI</span>
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {[1, 2].map(n => (
              <div key={n} style={{
                width: 28, height: 4, borderRadius: 2,
                background: step >= n ? 'var(--brand-primary)' : 'var(--border-subtle)',
                transition: 'background 0.3s ease',
              }} />
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* ── Step 1: Identity ──────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="auth-header">
              <h1>Create your account</h1>
              <p>Join thousands improving their debate skills</p>
            </div>

            <form className="auth-form" onSubmit={nextStep}>
              {/* Role Picker */}
              <div className="form-group">
                <label>I am a…</label>
                <div className="role-grid">
                  {ROLES.map(r => (
                    <div
                      key={r.value}
                      id={`role-${r.value}`}
                      className={`role-card ${form.role === r.value ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    >
                      <div className="role-icon">{r.icon}</div>
                      <div className="role-label">{r.label}</div>
                      <div className="role-desc">{r.desc}</div>
                    </div>
                  ))}
                  <div
                    id="role-admin"
                    className={`role-card ${form.role === 'admin' ? 'selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, role: 'admin' }))}
                  >
                    <div className="role-icon">⚙️</div>
                    <div className="role-label">Admin</div>
                    <div className="role-desc">Platform management</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signup-name">Full name</label>
                <input id="signup-name" className="input" type="text" name="full_name"
                  placeholder="Jane Doe" required value={form.full_name} onChange={onChange} />
              </div>

              <div className="form-group">
                <label htmlFor="signup-email">Email address</label>
                <input id="signup-email" className="input" type="email" name="email"
                  placeholder="jane@example.com" required value={form.email} onChange={onChange} />
              </div>

              <button id="signup-next" className="btn btn-primary btn-full btn-lg" type="submit">
                Continue →
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: Password ──────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="auth-header">
              <h1>Set your password</h1>
              <p>Choose a strong password for your account</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input id="signup-password" className="input" type="password" name="password"
                  placeholder="Minimum 8 characters" required value={form.password} onChange={onChange} />
              </div>

              <div className="form-group">
                <label htmlFor="signup-confirm">Confirm password</label>
                <input id="signup-confirm" className="input" type="password" name="confirm"
                  placeholder="Re-enter your password" required value={form.confirm} onChange={onChange} />
              </div>

              {/* Password strength */}
              {form.password && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(n => {
                      const strength = [form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length
                      return (
                        <div key={n} style={{
                          flex: 1, height: 4, borderRadius: 2,
                          background: strength >= n
                            ? strength <= 1 ? '#EF4444' : strength <= 2 ? '#F59E0B' : strength <= 3 ? '#10B981' : '#6C63FF'
                            : 'var(--border-subtle)',
                          transition: 'background 0.2s',
                        }} />
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button id="signup-submit" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </>
        )}

        <div className="auth-footer" style={{ marginTop: 20 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
