import { useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, MessageSquareText } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import ErrorMessage from '../components/ErrorMessage'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const from = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Enter your email and password to continue.')
    setLoading(true)
    try { await login(form); navigate(from, { replace: true }) } catch (requestError) { setError(getApiErrorMessage(requestError, 'We could not sign you in. Check your details and try again.')) } finally { setLoading(false) }
  }

  return <AuthFrame eyebrow="Welcome back" title="Make your next point land." description="A focused workspace for practicing, scheduling, and tracking your debate craft."><form onSubmit={handleSubmit} className="space-y-5"><Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><Input label="Password" type="password" placeholder="Your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{error && <ErrorMessage message={error} />}<Button type="submit" className="w-full" loading={loading}>Sign in <ArrowRight size={17} /></Button></form><p className="mt-7 text-center text-sm text-slate-500">New to DebateCoach? <Link to="/register" className="font-bold text-coral hover:underline">Create an account</Link></p></AuthFrame>
}

export function AuthFrame({ eyebrow, title, description, children }) {
  return <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]"><div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[32px] border-coral/30" /><div className="relative"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-coral"><MessageSquareText size={18} /></span><span className="font-display text-lg font-bold">DebateCoach</span></div><div className="mt-28 max-w-md"><p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-mint">Argument with intent</p><h2 className="font-display text-5xl font-bold leading-[1.05]">Think clearly. Speak bravely.</h2><p className="mt-6 max-w-sm text-base leading-7 text-slate-300">Build the habits behind persuasive communication with a workspace designed for thoughtful practice.</p></div></div><div className="relative flex items-center gap-2 text-sm text-slate-400"><LockKeyhole size={15} />Your workspace stays yours.</div></div><div className="flex items-center justify-center px-5 py-12 sm:px-10"><div className="w-full max-w-md"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-coral">{eyebrow}</p><h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1><p className="mt-3 mb-8 text-sm leading-6 text-slate-500">{description}</p>{children}<p className="mt-10 text-center text-xs text-slate-400">Agentic AI Debate Coach <span className="mx-2">/</span> Week 1-2 workspace</p></div></div></div>
}
