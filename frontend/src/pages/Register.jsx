import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register } = useAuth(); const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'learner' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  if (user) return <Navigate to="/" replace />
  async function submit(event) { event.preventDefault(); setError(''); setSaving(true); try { await register(form); navigate('/') } catch (requestError) { setError(requestError.response?.data?.detail || 'Unable to create your account.') } finally { setSaving(false) } }
  return <section className="auth-page"><p className="eyebrow">Get started</p><h1>Build your practice space.</h1><form className="form-card" onSubmit={submit}><label>Name<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="error-message">{error}</p>}<button className="button" disabled={saving}>{saving ? 'Creating...' : 'Create account'}</button><p>Already registered? <Link to="/login">Sign in</Link></p></form></section>
}