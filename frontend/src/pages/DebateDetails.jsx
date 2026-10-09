import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, MessageSquare, Sparkles, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import { getApiErrorMessage } from '../services/api'
import { analyzeDebate, getDebate, getDebateAnalysis, getParticipants, joinDebate } from '../services/debates'

export default function DebateDetails() {
  const { id } = useParams()
  const [debate, setDebate] = useState(null)
  const [participants, setParticipants] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [argument, setArgument] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [debateResponse, participantsResponse, analysisResponse] = await Promise.all([
        getDebate(id),
        getParticipants(id),
        getDebateAnalysis(id).catch(() => ({ data: null })),
      ])
      setDebate(debateResponse.data)
      setParticipants(participantsResponse.data?.items || participantsResponse.data || [])
      setAnalysis(analysisResponse.data)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load this debate.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function join() {
    setJoining(true)
    setError('')
    try {
      const { data } = await joinDebate(id)
      setJoined(true)
      setMessage(`You joined this debate${data?.position ? ` with position: ${data.position}` : '.'}`)
      load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to join this debate.'))
    } finally {
      setJoining(false)
    }
  }

  async function runAnalysis(event) {
    event.preventDefault()
    if (!argument.trim()) return
    setAnalyzing(true)
    setError('')
    try {
      const { data } = await analyzeDebate(id, { transcript: argument.trim() })
      setAnalysis(data)
      setMessage('Your argument has been analyzed.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to analyze this argument.'))
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return <Loading label="Loading debate details..." />
  if (error && !debate) return <><ErrorMessage message={error} onRetry={load} /><Link to="/debates" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-mint"><ArrowLeft size={16} />Back to debates</Link></>

  return (
    <>
      <PageHeader eyebrow="Session details" title={debate?.topic} description={debate?.description} action={<Link to="/debates" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-ink"><ArrowLeft size={16} />Back to debates</Link>} />
      {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
      {message && <div className="mb-5 flex items-center gap-2 rounded-xl border border-mint/20 bg-mint/10 p-4 text-sm font-bold text-mint"><Check size={17} />{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card><div className="grid gap-5 sm:grid-cols-3"><Meta icon={MessageSquare} label="Format" value={String(debate?.format || '').replaceAll('_', ' ')} /><Meta icon={CalendarDays} label="Scheduled" value={debate?.scheduled_at ? new Date(debate.scheduled_at).toLocaleString() : 'To be announced'} /><Meta icon={UserRound} label="Status" value={debate?.status || 'SCHEDULED'} /></div><div className="mt-8 border-t border-slate-100 pt-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Created by</p><p className="mt-2 font-bold text-ink">{debate?.creator?.name || debate?.created_by_name || 'Debate creator'}</p></div></Card>
        <Card><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">Participants</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{participants.length}</span></div>{participants.length ? <div className="mt-5 space-y-3">{participants.map((participant) => <div key={participant.id || participant.user_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-ink">{participant.user?.name || participant.name || 'Participant'}</span><span className="text-xs font-extrabold uppercase tracking-wider text-mint">{participant.position || 'Pending'}</span></div>)}</div> : <p className="mt-5 text-sm text-slate-500">No one has joined this session yet.</p>}<Button onClick={join} loading={joining} disabled={joined || debate?.status === 'COMPLETED'} className="mt-6 w-full">{joined ? 'Joined' : 'Join debate'}</Button></Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-coral/10 text-coral"><Sparkles size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Milestone 2</p><h2 className="font-display text-xl font-bold text-ink">Analyze an argument</h2></div></div><form onSubmit={runAnalysis} className="mt-5"><textarea value={argument} onChange={(event) => setArgument(event.target.value)} rows={7} placeholder="Write a claim, your evidence, and your reasoning..." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20" /><Button type="submit" loading={analyzing} disabled={!argument.trim()} className="mt-4">Analyze argument</Button></form></Card>
        <AnalysisReport analysis={analysis} />
      </div>
    </>
  )
}

function AnalysisReport({ analysis }) {
  if (!analysis) return <Card><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Analysis report</p><h2 className="mt-2 font-display text-xl font-bold text-ink">Your report will appear here</h2><p className="mt-3 text-sm leading-6 text-slate-500">Submit an argument to receive reasoning feedback, fallacy detection, and a quality score.</p></Card>
  const scores = analysis.scores || {}
  const score = scores.overall ?? analysis.overall_score ?? analysis.score ?? 0
  const fallacies = analysis.fallacies || analysis.detected_fallacies || []
  return <Card><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Analysis report</p><h2 className="mt-2 font-display text-xl font-bold text-ink">Argument quality</h2></div><span className="text-3xl font-display font-bold text-coral">{Math.round(score)}<span className="text-sm text-slate-400">/100</span></span></div><div className="mt-5 space-y-4 text-sm"><ReportItem label="Claim quality" value={scores.claim_quality ?? analysis.claim_quality} /><ReportItem label="Evidence quality" value={scores.evidence_quality ?? analysis.evidence_quality} /><ReportItem label="Reasoning quality" value={scores.reasoning_quality ?? analysis.reasoning_quality} /><ReportItem label="Fallacy control" value={scores.fallacy_control ?? analysis.fallacy_control} /></div>{fallacies.length ? <div className="mt-6 border-t border-slate-100 pt-5"><p className="font-bold text-ink">Potential fallacies</p><div className="mt-3 space-y-2">{fallacies.map((fallacy, index) => <div key={fallacy.name || fallacy.type || index} className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-ink"><span className="font-bold">{fallacy.name || fallacy.type}</span>{fallacy.explanation ? ` — ${fallacy.explanation}` : ''}</div>)}</div></div> : <p className="mt-6 border-t border-slate-100 pt-5 text-sm font-bold text-mint">No common fallacies detected.</p>}{analysis.feedback && <div className="mt-5 rounded-xl bg-mint/10 p-4 text-sm leading-6 text-ink">{Array.isArray(analysis.feedback) ? analysis.feedback.join(' ') : analysis.feedback}</div>}</Card>
}

function ReportItem({ label, value }) {
  return <div><div className="mb-1 flex justify-between"><span className="font-bold text-ink">{label}</span><span className="font-bold text-slate-500">{value == null ? '—' : `${Math.round(value)}/100`}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-mint" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></div></div>
}

function Meta({ icon: Icon, label, value }) {
  return <div><Icon className="text-coral" size={19} /><p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold capitalize text-ink">{value}</p></div>
}
