import { useEffect, useState } from 'react'
import { Bot, Brain, CheckCircle2, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import Select from '../components/Select'
import { getApiErrorMessage } from '../services/api'
import { createSimulation } from '../services/debates'
import { listDebates } from '../services/debates'

export default function Simulation() {
  const [debates, setDebates] = useState([])
  const [debateId, setDebateId] = useState('')
  const [position, setPosition] = useState('FOR')
  const [prompt, setPrompt] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const { data } = await listDebates()
      const items = data?.items || data || []
      setDebates(items)
      if (!debateId && items[0]?.id) setDebateId(items[0].id)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load debates for simulation.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function run(event) {
    event.preventDefault()
    if (!debateId) return
    setRunning(true)
    setError('')
    try {
      const { data } = await createSimulation(debateId, { position, prompt: prompt.trim() || undefined })
      setReport(data)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to start the AI simulation.'))
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <Loading label="Preparing the simulation room..." />
  return <>
    <PageHeader eyebrow="Milestone 3" title="AI debate simulation" description="Practise against an AI-generated opposing case, then use the coaching feedback to sharpen your next round." />
    {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-coral/10 text-coral"><Bot size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Practice setup</p><h2 className="font-display text-xl font-bold">Choose your round</h2></div></div>
        <form onSubmit={run} className="mt-6 space-y-5">
          <Select label="Debate session" value={debateId} onChange={(event) => setDebateId(event.target.value)} options={debates.length ? debates.map((debate) => ({ value: debate.id, label: debate.topic })) : [{ value: '', label: 'Create a debate first' }]} />
          <Select label="Your position" value={position} onChange={(event) => setPosition(event.target.value)} options={[{ value: 'FOR', label: 'For the motion' }, { value: 'AGAINST', label: 'Against the motion' }, { value: 'NEUTRAL', label: 'Balanced perspective' }]} />
          <label className="block space-y-2"><span className="text-sm font-bold text-ink">Practice focus <span className="font-normal text-slate-400">(optional)</span></span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} placeholder="Ask the coach to challenge your evidence or test your rebuttal..." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" /></label>
          <Button type="submit" loading={running} disabled={!debateId} className="w-full"><Sparkles size={17} />Start simulation</Button>
        </form>
      </Card>
      <SimulationReport report={report} />
    </div>
  </>
}

function SimulationReport({ report }) {
  if (!report) return <Card className="flex min-h-[360px] flex-col items-center justify-center text-center"><Brain className="text-mint" size={40} /><h2 className="mt-5 font-display text-2xl font-bold">Your AI round will appear here</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Start a simulation to receive an opening case, likely counterarguments, rebuttals, and a performance score.</p></Card>
  const score = report.score || {}
  return <Card><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Simulation report</p><h2 className="mt-2 font-display text-2xl font-bold">{report.topic}</h2><p className="mt-1 text-sm font-bold uppercase tracking-wider text-mint">{report.position} vs {report.opponent_position}</p></div><span className="text-3xl font-display font-bold text-coral">{Math.round(score.overall || 0)}<span className="text-sm text-slate-400">/100</span></span></div>
    <div className="mt-6 rounded-xl bg-ink p-5 text-sm leading-7 text-white"><p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-mint">AI opening case</p>{report.opening_statement}</div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{[['Clarity', score.clarity], ['Evidence', score.evidence], ['Rebuttal', score.rebuttal_strength]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-display font-bold">{Math.round(value || 0)}%</p></div>)}</div>
    <ReportList icon={ShieldAlert} title="Counterarguments to prepare" items={report.counterarguments} />
    <ReportList icon={MessageSquare} title="Rebuttal guidance" items={report.rebuttals} />
    <div className="mt-6 grid gap-5 md:grid-cols-2"><ReportList icon={CheckCircle2} title="Strengths" items={report.strengths} /><ReportList icon={ShieldAlert} title="Next improvements" items={report.weaknesses} /></div>
  </Card>
}

function ReportList({ icon: Icon, title, items = [] }) {
  return <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 font-bold text-ink"><Icon size={17} className="text-mint" />{title}</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{items.map((item, index) => <li key={`${item}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>)}</ul></div>
}
