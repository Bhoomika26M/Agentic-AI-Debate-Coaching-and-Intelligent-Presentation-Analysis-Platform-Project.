import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, MessageSquare, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import { getApiErrorMessage } from '../services/api'
import { listDebates } from '../services/debates'

export default function Debates() {
  const [debates, setDebates] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  function load() { setLoading(true); listDebates().then(({ data }) => setDebates(data?.items || data || [])).catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load debates.'))).finally(() => setLoading(false)) }
  useEffect(load, [])
  return <><PageHeader eyebrow="The debate board" title="Find your next room." description="Browse upcoming sessions, see how they are structured, and join the conversations that stretch your thinking." action={<Link to="/debates/create"><Button variant="coral"><Plus size={17} />Create debate</Button></Link>} />{error && <div className="mb-5"><ErrorMessage message={error} onRetry={load} /></div>}{loading ? <Loading label="Loading debates..." /> : debates.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{debates.map((debate) => <DebateCard key={debate.id} debate={debate} />)}</div> : <EmptyState icon={MessageSquare} title="No debates found" description="There are no upcoming sessions available yet. Start a room and invite others into the conversation." action={<Link to="/debates/create"><Button>Create the first debate</Button></Link>} />}</>
}

export function DebateCard({ debate }) { return <Card className="flex flex-col"><div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-slate-400"><span>{String(debate.format || 'SESSION').replaceAll('_', ' ')}</span><span className="rounded-full bg-mint/10 px-2.5 py-1 text-mint">{debate.status || 'SCHEDULED'}</span></div><h2 className="mt-5 font-display text-xl font-bold leading-tight text-ink">{debate.topic}</h2><p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">{debate.description || 'A structured space to test ideas, listen closely, and make a thoughtful case.'}</p><div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500"><CalendarDays size={15} className="text-coral" />{debate.scheduled_at ? new Date(debate.scheduled_at).toLocaleString() : 'Date to be announced'}</div><Link to={`/debates/${debate.id}`} className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-ink hover:bg-mint/10 hover:text-mint">View details <ArrowUpRight size={17} /></Link></Card> }
