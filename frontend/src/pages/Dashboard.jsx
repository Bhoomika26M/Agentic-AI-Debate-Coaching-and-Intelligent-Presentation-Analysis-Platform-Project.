import { ArrowUpRight, CalendarDays, ChartNoAxesCombined, MessageSquare, Plus, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import ProgressBar from '../components/ProgressBar'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/api'
import { listDebates } from '../services/debates'
import { getSkills } from '../services/skills'
import { listUsers } from '../services/users'

const skillItems = [['communication_score', 'Communication'], ['critical_thinking_score', 'Critical thinking'], ['debate_score', 'Debate'], ['presentation_score', 'Presentation']]

const roleContent = {
  LEARNER: {
    eyebrow: 'Your practice room',
    description: 'Build stronger arguments, track your progress, and join debates that stretch your thinking.',
    label: 'Learner workspace',
    message: 'Start with a debate, then use your skill profile to decide what to practise next.',
    action: 'Create debate',
  },
  DEBATE_COACH: {
    eyebrow: 'Coach workspace',
    description: 'Prepare sessions, guide participants, and keep every debate moving toward better thinking.',
    label: 'Debate coach',
    message: 'Review your upcoming rooms and use each session to give participants focused feedback.',
    action: 'Create session',
  },
  EDUCATOR: {
    eyebrow: 'Classroom workspace',
    description: 'Organize class debates and give learners a structured place to practise their ideas.',
    label: 'Educator',
    message: 'Use class debates to turn discussion into visible progress for your learners.',
    action: 'Create class debate',
  },
  ADMINISTRATOR: {
    eyebrow: 'Platform overview',
    description: 'Monitor activity across the DebateCoach platform and keep the learning workspace healthy.',
    label: 'Administrator',
    message: 'Use the platform metrics below to monitor accounts, debates, and participation.',
    action: 'Create debate',
  },
}

export default function Dashboard() {
  const { user } = useAuth()
  const role = String(user?.role || 'LEARNER').toUpperCase()
  const content = roleContent[role] || roleContent.LEARNER
  const [skills, setSkills] = useState(null)
  const [debates, setDebates] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const requests = [listDebates()]
      if (role === 'LEARNER') requests.push(getSkills())
      if (role === 'ADMINISTRATOR') requests.push(listUsers())
      const responses = await Promise.all(requests)
      setDebates(responses[0].data?.items || responses[0].data || [])
      if (role === 'LEARNER') setSkills(responses[1].data)
      if (role === 'ADMINISTRATOR') setUsers(responses[1].data || [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Dashboard data is not available yet.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [role])

  if (loading) return <Loading label="Preparing your workspace..." />

  const participantCount = debates.reduce((total, debate) => total + (debate.participants?.length || 0), 0)

  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={`Good to see you, ${user?.name?.split(' ')[0] || 'there'}.`}
        description={content.description}
        action={<Link to="/debates/create"><Button variant="coral"><Plus size={17} />{content.action}</Button></Link>}
      />
      {error && <div className="mb-6"><ErrorMessage message={error} onRetry={load} /></div>}

      {role === 'LEARNER' && <LearnerDashboard skills={skills} debates={debates} />}
      {role === 'DEBATE_COACH' && <CoachDashboard debates={debates} participantCount={participantCount} />}
      {role === 'EDUCATOR' && <EducatorDashboard debates={debates} participantCount={participantCount} />}
      {role === 'ADMINISTRATOR' && <AdminDashboard debates={debates} users={users} participantCount={participantCount} />}
    </>
  )
}

function RoleHero({ content, link = '/profile', linkLabel = 'Complete your profile' }) {
  return <Card className="overflow-hidden bg-ink text-white"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">{content.label}</p><h2 className="mt-3 font-display text-3xl font-bold">Your workspace</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{content.message}</p></div><Sparkles className="text-coral" size={28} /></div><Link to={link} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-mint hover:text-white">{linkLabel} <ArrowUpRight size={16} /></Link></Card>
}

function LearnerDashboard({ skills, debates }) {
  return <><div className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><RoleHero content={roleContent.LEARNER} /><MetricCard label="Available sessions" value={debates.length} description="Debates currently visible in your workspace." icon={MessageSquare} link="/debates" linkLabel="Browse debates" /></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><SkillCard skills={skills} /><DebateList debates={debates} title="Next debates" emptyTitle="No upcoming debates" /></div></>
}

function CoachDashboard({ debates, participantCount }) {
  return <><div className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><RoleHero content={roleContent.DEBATE_COACH} link="/students" linkLabel="View students" /><MetricCard label="Rooms to facilitate" value={debates.length} description={`${participantCount} participant${participantCount === 1 ? '' : 's'} across your visible sessions.`} icon={MessageSquare} link="/debates" linkLabel="Manage debates" /></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><DebateList debates={debates} title="Coaching schedule" emptyTitle="No sessions scheduled" /><ActionCard icon={UsersRound} title="Learner support" description="Open the student workspace to review coaching needs and plan your next check-in." link="/students" linkLabel="Open students" /></div></>
}

function EducatorDashboard({ debates, participantCount }) {
  return <><div className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><RoleHero content={roleContent.EDUCATOR} link="/students" linkLabel="View learners" /><MetricCard label="Class debates" value={debates.length} description={`${participantCount} learner${participantCount === 1 ? '' : 's'} currently participating.`} icon={CalendarDays} link="/debates" linkLabel="View class debates" /></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><DebateList debates={debates} title="Class schedule" emptyTitle="No class debates yet" /><ActionCard icon={UsersRound} title="Learner overview" description="Keep an eye on learner participation and use debates as a structured teaching activity." link="/students" linkLabel="Open students" /></div></>
}

function AdminDashboard({ debates, users, participantCount }) {
  return <><div className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><RoleHero content={roleContent.ADMINISTRATOR} link="/users" linkLabel="Manage users" /><MetricCard label="Platform debates" value={debates.length} description="Debate sessions currently stored on the platform." icon={ShieldCheck} link="/debates" linkLabel="Review debates" /></div><div className="mb-6 grid gap-5 md:grid-cols-3"><MetricCard label="Registered users" value={users.length} description="Accounts in the platform database." icon={UsersRound} link="/users" linkLabel="Manage users" /><MetricCard label="Participants" value={participantCount} description="Participant records across visible debates." icon={MessageSquare} link="/debates" linkLabel="Review activity" /><MetricCard label="Active routes" value="All" description="Authentication and debate APIs are available." icon={ShieldCheck} link="/settings" linkLabel="Open settings" /></div><DebateList debates={debates} title="Recent platform debates" emptyTitle="No debates on the platform" /></>
}

function MetricCard({ label, value, description, icon: Icon, link, linkLabel }) {
  return <Card><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p><h2 className="mt-2 font-display text-3xl font-bold text-ink">{value}</h2></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-coral/10 text-coral"><Icon size={20} /></span></div><p className="mt-5 text-sm text-slate-500">{description}</p><Link to={link} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-mint">{linkLabel} <ArrowUpRight size={15} /></Link></Card>
}

function SkillCard({ skills }) {
  return <Card><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Skill snapshot</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Keep building range</h2></div><Link to="/skills" className="text-sm font-bold text-mint">View skills</Link></div>{skills ? <div className="space-y-5">{skillItems.map(([key, label]) => <div key={key}><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-ink">{label}</span><span className="font-bold text-slate-500">{skills[key] ?? 0}%</span></div><ProgressBar value={skills[key] ?? 0} /></div>)}</div> : <EmptyState icon={ChartNoAxesCombined} title="No skills tracked yet" description="Your first skill profile will appear here once it is created." />}</Card>
}

function DebateList({ debates, title, emptyTitle }) {
  return <Card><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Schedule</p><h2 className="mt-1 font-display text-xl font-bold text-ink">{title}</h2></div><CalendarDays className="text-coral" size={21} /></div>{debates.length ? <div className="space-y-3">{debates.slice(0, 5).map((debate) => <Link key={debate.id} to={`/debates/${debate.id}`} className="block rounded-xl border border-slate-100 p-4 transition hover:border-mint/40 hover:bg-mint/5"><div className="flex items-start justify-between gap-3"><p className="font-bold text-ink">{debate.topic}</p><span className="rounded-full bg-mint/10 px-2 py-1 text-[10px] font-bold uppercase text-mint">{debate.status || 'SCHEDULED'}</span></div><p className="mt-1 text-xs text-slate-500">{debate.format || 'Debate session'} <span className="mx-1">/</span> {debate.scheduled_at ? new Date(debate.scheduled_at).toLocaleString() : 'Date to be announced'}</p></Link>)}</div> : <EmptyState icon={CalendarDays} title={emptyTitle} description="Create a session or explore the debate board." action={<Link to="/debates"><Button variant="secondary">Explore debates</Button></Link>} />}</Card>
}

function ActionCard({ icon: Icon, title, description, link, linkLabel }) {
  return <Card><span className="grid h-11 w-11 place-items-center rounded-xl bg-mint/10 text-mint"><Icon size={21} /></span><h2 className="mt-5 font-display text-xl font-bold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><Link to={link} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-mint">{linkLabel} <ArrowUpRight size={15} /></Link></Card>
}
