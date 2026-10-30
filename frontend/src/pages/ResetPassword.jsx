import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [form, setForm] = useState({ token: initialToken, password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const { data } = await api.post('/auth/reset-password', {
        token: form.token,
        password: form.password,
      })
      setMessage(data.message)
      setForm({ token: '', password: '' })
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to reset your password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <p className="eyebrow">Create a new password</p>
      <h1>Choose a strong new password.</h1>
      <form className="form-card" onSubmit={submit}>
        <label>
          Reset token
          <input required value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} />
        </label>
        <label>
          New password
          <input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <button className="button" type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update password'}</button>
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </section>
  )
}
