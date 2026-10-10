import { useEffect, useState } from 'react'
import { ArrowUpRight, BookOpenCheck, CalendarCheck, Target, TrendingUp } from 'lucide-react'
import Card from '../components/Card'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import ProgressBar from '../components/ProgressBar'
import { getApiErrorMessage } from '../services/api'
import { getCoachingDashboard } from '../services/coaching'

export default function Coaching() {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    getCoachingDashboard().then(({ data }) => setDashboard(data)).catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load your coaching plan.')))
  }, [])
  if (!dashboard && !error) return <Loading label="Building your coaching plan..." />
  if (error) return <ErrorMessage message={error} />
  return <>
    <PageHeader eyebrow="Milestone 3" title="Your coaching plan" description="Turn your debate results into a focused practice routine with measurable progress." />
    <div className="mb-6 grid gap-5 md:grid-cols-3"><Metric icon={Target} label="Overall readiness" value={`${Math.round(dashboard.overall_readiness || 0)}%`} /><Metric icon={TrendingUp} label="Focus areas" value={dashboard.focus_areas?.length || 0} /><Metric icon={CalendarCheck} label="Practice steps" value={dashboard.plan?.length || 0} /></div>
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><Card><div className="flex items-center gap-3"><Target className="text-coral" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Priority areas</p><h2 className="font-display text-xl font-bold">What to practise next</h2></div></div><div className="mt-5 space-y-4">{dashboard.focus_areas?.map((area) => <div key={area} className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-ink">{area}</p><p className="mt-1 text-sm leading-6 text-slate-500">{dashboard.recommendations?.find((item) => item.toLowerCase().includes(area.split(' ')[0].toLowerCase())) || dashboard.recommendations?.[0]}</p></div>)}</div></Card><Card><div className="flex items-center gap-3"><BookOpenCheck className="text-mint" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Personalized pathway</p><h2 className="font-display text-xl font-bold">Three-week plan</h2></div></div><div className="mt-5 space-y-4">{dashboard.plan?.map((week) => <div key={week.week} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-mint">Week {week.week}</p><p className="mt-1 font-bold text-ink">{week.goal}</p></div><ArrowUpRight className="text-slate-300" size={18} /></div><ul className="mt-3 space-y-1 text-sm leading-6 text-slate-500">{week.actions?.map((action) => <li key={action}>• {action}</li>)}</ul></div>)}</div></Card></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]"><Card><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Score snapshot</p><h2 className="mt-1 font-display text-xl font-bold">Your current capabilities</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{Object.entries(dashboard.scores || {}).map(([key, value]) => <div key={key}><div className="mb-2 flex justify-between text-sm"><span className="font-bold capitalize">{key.replace('_', ' ')}</span><span className="font-bold text-slate-500">{value}%</span></div><ProgressBar value={value} /></div>)}</div></Card><Card><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Performance history</p><h2 className="mt-1 font-display text-xl font-bold">Recent AI rounds</h2>{dashboard.simulation_history?.length ? <div className="mt-5 space-y-3">{dashboard.simulation_history.map((round) => <div key={round.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{round.topic}</p><p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{round.position} · {new Date(round.created_at).toLocaleDateString()}</p></div><span className="ml-3 font-display text-xl font-bold text-coral">{Math.round(round.overall)}%</span></div>)}</div> : <p className="mt-5 text-sm leading-6 text-slate-500">Complete an AI simulation to start tracking your performance.</p>}</Card></div>
  </>
}

function Metric({ icon: Icon, label, value }) {
  return <Card><Icon className="text-coral" size={21} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p></Card>
}
