import { useState } from 'react'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorMessage from '../components/ErrorMessage'
import Input from '../components/Input'
import PageHeader from '../components/PageHeader'
import Select from '../components/Select'
import { getApiErrorMessage } from '../services/api'
import { createDebate } from '../services/debates'

const formats = [{ value: 'ONE_ON_ONE', label: 'One-on-one' }, { value: 'PARLIAMENTARY', label: 'Parliamentary' }, { value: 'OXFORD', label: 'Oxford' }, { value: 'POLICY', label: 'Policy' }, { value: 'PUBLIC_FORUM', label: 'Public forum' }, { value: 'AI_SIMULATION', label: 'AI debate simulation' }]
export default function CreateDebate() {
  const navigate = useNavigate(); const [form, setForm] = useState({ topic: '', description: '', format: 'OXFORD', scheduled_at: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  function change(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  async function submit(event) { event.preventDefault(); setError(''); if (!form.topic || !form.scheduled_at) return setError('Topic and date are required.'); setLoading(true); try { const { data } = await createDebate({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString() }); navigate(`/debates/${data.id}`) } catch (requestError) { setError(getApiErrorMessage(requestError, 'Unable to create this debate.')) } finally { setLoading(false) } }
  return <><PageHeader eyebrow="Start a room" title="Create a debate" description="Give the conversation enough shape to help people arrive ready to think." action={<Link to="/debates" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-ink"><ArrowLeft size={16} />Back to debates</Link>} /><Card className="max-w-3xl"><form onSubmit={submit} className="space-y-5"><Input label="Topic" placeholder="Should AI replace teachers?" value={form.topic} onChange={(event) => change('topic', event.target.value)} /><label className="block space-y-2"><span className="text-sm font-bold text-ink">Description</span><textarea rows="5" placeholder="What should participants prepare for?" value={form.description} onChange={(event) => change('description', event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-mint focus:ring-4 focus:ring-mint/10" /></label><div className="grid gap-5 sm:grid-cols-2"><Select label="Debate format" value={form.format} onChange={(event) => change('format', event.target.value)} options={formats} /><Input label="Date and time" type="datetime-local" value={form.scheduled_at} onChange={(event) => change('scheduled_at', event.target.value)} /></div>{error && <ErrorMessage message={error} />}<div className="flex justify-end pt-2"><Button type="submit" variant="coral" loading={loading}><CalendarPlus size={17} />Create debate</Button></div></form></Card></>
}
