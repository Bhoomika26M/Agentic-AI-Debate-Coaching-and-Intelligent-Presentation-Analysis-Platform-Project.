import { useEffect, useState } from 'react'
import { ChartNoAxesCombined, Save } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import ProgressBar from '../components/ProgressBar'
import { getApiErrorMessage } from '../services/api'
import { getSkills, updateSkills } from '../services/skills'

const fields = [['communication_score', 'Communication', 'Clear, confident expression'], ['critical_thinking_score', 'Critical thinking', 'Questioning assumptions'], ['debate_score', 'Debate', 'Structure and rebuttal'], ['presentation_score', 'Presentation', 'Presence and delivery']]
export default function Skills() {
  const [skills, setSkills] = useState({}); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  function load() { setLoading(true); getSkills().then(({ data }) => setSkills(data)).catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load skills.'))).finally(() => setLoading(false)) }
  useEffect(load, [])
  async function save() { setSaving(true); setError(''); setMessage(''); try { await updateSkills(Object.fromEntries(fields.map(([key]) => [key, Number(skills[key] || 0)]))); setMessage('Skill scores updated.') } catch (requestError) { setError(getApiErrorMessage(requestError, 'Unable to update skills.')) } finally { setSaving(false) } }
  if (loading) return <Loading label="Loading skill profile..." />
  return <><PageHeader eyebrow="Progress, made visible" title="Skill tracking" description="Keep a simple pulse on the skills you are deliberately strengthening." action={<Button onClick={save} loading={saving}><Save size={17} />Save scores</Button>} />{error && <div className="mb-5"><ErrorMessage message={error} onRetry={load} /></div>}{message && <div className="mb-5 rounded-xl border border-mint/20 bg-mint/10 p-4 text-sm font-bold text-mint">{message}</div>}<div className="grid gap-5 md:grid-cols-2">{fields.map(([key, label, description], index) => <Card key={key}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">0{index + 1}</p><h2 className="mt-2 font-display text-xl font-bold text-ink">{label}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><ChartNoAxesCombined className="text-mint" size={22} /></div><div className="mt-8 flex items-center gap-4"><ProgressBar value={skills[key] || 0} /><span className="w-12 text-right font-display text-xl font-bold text-ink">{skills[key] || 0}</span></div><input type="range" min="0" max="100" value={skills[key] || 0} onChange={(event) => setSkills({ ...skills, [key]: Number(event.target.value) })} className="mt-5 w-full accent-[#2a9d8f]" /></Card>)}</div></>
}
