import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (user) return <Navigate to="/" replace />

  async function submit(event) {
    event.preventDefault(); setError(''); setSaving(true)
    try { await login(form.email, form.password); navigate(location.state?.from?.pathname || '/') }
    catch (requestError) { setError(requestError.response?.data?.detail || 'Unable to sign in.') }
    finally { setSaving(false) }
  }
  return <section className="auth-page"><p className="eyebrow">Welcome back</p><h1>Keep your argument moving.</h1><form className="form-card" onSubmit={submit}><label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="error-message">{error}</p>}<button className="button" disabled={saving}>{saving ? 'Signing in...' : 'Sign in'}</button><p>New here? <Link to="/register">Create an account</Link></p></form></section>
}