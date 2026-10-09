import { Bell, CircleUserRound, RotateCcw, Save, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'

const SETTINGS_KEY = 'debate_coach_settings'
const defaults = {
  email_updates: true,
  debate_reminders: true,
  coaching_tips: false,
  compact_layout: false,
}

function readSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
  } catch {
    return defaults
  }
}

export default function Settings() {
  const [settings, setSettings] = useState(defaults)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSettings(readSettings())
  }, [])

  function change(name) {
    setSettings((current) => ({ ...current, [name]: !current[name] }))
    setMessage('')
  }

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setMessage('Settings saved successfully.')
  }

  function reset() {
    localStorage.removeItem(SETTINGS_KEY)
    setSettings(defaults)
    setMessage('Settings restored to their defaults.')
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace preferences"
        title="Settings"
        description="Control reminders and workspace preferences for your debate practice."
        action={<Button onClick={save}><Save size={17} />Save settings</Button>}
      />

      {message && <div className="mb-5 rounded-xl border border-mint/20 bg-mint/10 p-4 text-sm font-bold text-mint" role="status">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint/10 text-mint"><Bell size={20} /></span>
            <div><h2 className="font-display text-xl font-bold">Notifications</h2><p className="mt-1 text-sm text-slate-500">Choose which updates you want to receive.</p></div>
          </div>
          <div className="mt-6 space-y-5">
            <Toggle label="Email updates" description="Receive important account and platform updates." checked={settings.email_updates} onChange={() => change('email_updates')} />
            <Toggle label="Debate reminders" description="Get reminders before scheduled debate sessions." checked={settings.debate_reminders} onChange={() => change('debate_reminders')} />
            <Toggle label="Coaching tips" description="Receive occasional tips for improving your arguments." checked={settings.coaching_tips} onChange={() => change('coaching_tips')} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-coral/10 text-coral"><SlidersHorizontal size={20} /></span>
            <div><h2 className="font-display text-xl font-bold">Workspace</h2><p className="mt-1 text-sm text-slate-500">Adjust how your practice space feels.</p></div>
          </div>
          <div className="mt-6">
            <Toggle label="Compact layout" description="Use tighter spacing to show more content at once." checked={settings.compact_layout} onChange={() => change('compact_layout')} />
          </div>
          <div className="mt-8 border-t border-slate-100 pt-5">
            <p className="text-sm font-bold text-ink">Account shortcuts</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/profile"><Button variant="secondary"><CircleUserRound size={17} />Edit profile</Button></Link>
              <Link to="/skills"><Button variant="secondary">View skills</Button></Link>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h2 className="font-display text-lg font-bold">Reset preferences</h2><p className="mt-1 text-sm text-slate-500">Restore notification and workspace settings to their original values.</p></div>
          <Button variant="danger" onClick={reset}><RotateCcw size={17} />Reset settings</Button>
        </div>
      </Card>
    </>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span><span className="block text-sm font-bold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 h-5 w-5 shrink-0 accent-[#2a9d8f]" />
    </label>
  )
}
