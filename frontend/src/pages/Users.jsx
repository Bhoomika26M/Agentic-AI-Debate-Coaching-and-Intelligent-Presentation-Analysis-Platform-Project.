import { useEffect, useState } from 'react'
import { Mail, ShieldCheck, UsersRound } from 'lucide-react'
import Card from '../components/Card'
import ErrorMessage from '../components/ErrorMessage'
import Loading from '../components/Loading'
import PageHeader from '../components/PageHeader'
import { getApiErrorMessage } from '../services/api'
import { listUsers } from '../services/users'

const roleLabels = {
  LEARNER: 'Learner',
  DEBATE_COACH: 'Debate coach',
  EDUCATOR: 'Educator',
  ADMINISTRATOR: 'Administrator',
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data } = await listUsers()
      setUsers(data?.items || data || [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load platform users.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loading label="Loading platform users..." />

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Review the accounts and roles currently active on the DebateCoach platform."
      />
      {error && <div className="mb-6"><ErrorMessage message={error} onRetry={load} /></div>}
      {!error && (
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Account directory</p>
              <h2 className="mt-1 font-display text-xl font-bold text-ink">Registered users</h2>
            </div>
            <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-bold text-mint">{users.length} total</span>
          </div>
          {users.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4 font-bold">User</th>
                    <th className="pb-3 pr-4 font-bold">Role</th>
                    <th className="pb-3 pr-4 font-bold">Joined</th>
                    <th className="pb-3 font-bold">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-bold text-ink">{user.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail size={13} />{user.email}</p>
                      </td>
                      <td className="py-4 pr-4"><span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-3 py-1 text-xs font-bold text-coral"><ShieldCheck size={13} />{roleLabels[user.role] || user.role}</span></td>
                      <td className="py-4 pr-4 text-sm text-slate-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-4 text-sm font-bold text-mint">Active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
              <UsersRound className="mx-auto text-slate-300" size={34} />
              <p className="mt-4 font-bold text-ink">No users found</p>
              <p className="mt-1 text-sm text-slate-500">Registered accounts will appear here.</p>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
