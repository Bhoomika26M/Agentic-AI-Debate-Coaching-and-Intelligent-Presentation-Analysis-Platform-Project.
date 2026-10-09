import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import ErrorMessage from '../components/ErrorMessage'
import { AuthFrame } from './Login'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/api'

const roles = [{ value: 'LEARNER', label: 'Learner' }, { value: 'DEBATE_COACH', label: 'Debate Coach' }, { value: 'EDUCATOR', label: 'Educator' }, { value: 'ADMINISTRATOR', label: 'Administrator' }]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'LEARNER' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  function change(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  async function handleSubmit(event) {
    event.preventDefault(); setError('')
    if (Object.values(form).some((value) => !value)) return setError('Complete every field to create your account.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    try { await register({ name: form.name, email: form.email, password: form.password, role: form.role }); navigate('/login', { state: { registered: true } }) } catch (requestError) { setError(getApiErrorMessage(requestError, 'We could not create your account. Please try again.')) } finally { setLoading(false) }
  }
  return <AuthFrame eyebrow="Start practicing" title="Create your debate workspace." description="Choose the role that best describes how you will use the platform."><form onSubmit={handleSubmit} className="space-y-4"><Input label="Full name" placeholder="Alex Morgan" value={form.name} onChange={(event) => change('name', event.target.value)} /><Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => change('email', event.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Password" type="password" placeholder="At least 8 characters" value={form.password} onChange={(event) => change('password', event.target.value)} /><Input label="Confirm password" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={(event) => change('confirmPassword', event.target.value)} /></div><Select label="Your role" value={form.role} onChange={(event) => change('role', event.target.value)} options={roles} />{error && <ErrorMessage message={error} />}<Button type="submit" className="mt-2 w-full" loading={loading}>Create account <ArrowRight size={17} /></Button></form><p className="mt-7 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-bold text-coral hover:underline">Sign in</Link></p></AuthFrame>
}
