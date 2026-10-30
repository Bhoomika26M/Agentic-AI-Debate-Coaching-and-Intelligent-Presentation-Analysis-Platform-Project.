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
    <section className="auth-page">
      <p className="eyebrow">Account recovery</p>
      <h1>Reset your password.</h1>
      <form className="form-card" onSubmit={submit}>
        <label>
          Email address
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <button className="button" type="submit" disabled={saving}>{saving ? 'Sending...' : 'Send reset link'}</button>
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </section>
  )
}
