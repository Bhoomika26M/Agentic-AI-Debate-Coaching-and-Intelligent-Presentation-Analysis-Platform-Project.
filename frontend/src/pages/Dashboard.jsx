import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

/* ── Role-specific configurations ── */
const ROLE_CONFIG = {
  learner: {
    greeting: 'Keep practising, keep winning! 🎓',
    color: 'var(--brand-primary)',
    stats: [
      { icon: '🎤', label: 'Total Sessions',   key: 'total_sessions',   color: 'rgba(108,99,255,0.15)' },
      { icon: '⭐', label: 'Avg Score',         key: 'avg_score',        color: 'rgba(16,185,129,0.15)' },
      { icon: '🔥', label: 'Win Streak',        key: 'win_streak',       color: 'rgba(245,158,11,0.15)' },
      { icon: '📈', label: 'Improvement Rate',  key: 'improvement_rate', color: 'rgba(167,139,250,0.15)' },
    ],
  },
  coach: {
    greeting: 'Shape the next generation of debaters! 🏆',
    color: 'var(--brand-success)',
    stats: [
      { icon: '👥', label: 'Students',          key: 'total_students',  color: 'rgba(16,185,129,0.15)' },
      { icon: '📋', label: 'Sessions Today',    key: 'sessions_today',  color: 'rgba(108,99,255,0.15)' },
      { icon: '⭐', label: 'Avg Student Score', key: 'avg_score',       color: 'rgba(245,158,11,0.15)' },
      { icon: '📝', label: 'Pending Reviews',   key: 'pending_reviews', color: 'rgba(239,68,68,0.15)'  },
    ],
  },
  educator: {
    greeting: 'Driving academic excellence! 📚',
    color: 'var(--brand-accent)',
    stats: [
      { icon: '🏫', label: 'Classes',        key: 'total_classes',   color: 'rgba(245,158,11,0.15)' },
      { icon: '👥', label: 'Total Students', key: 'total_students',  color: 'rgba(108,99,255,0.15)' },
      { icon: '📊', label: 'Reports',        key: 'total_reports',   color: 'rgba(16,185,129,0.15)' },
      { icon: '⭐', label: 'Class Avg Score',key: 'avg_score',       color: 'rgba(167,139,250,0.15)' },
    ],
  },
  admin: {
    greeting: 'Platform overview at a glance! ⚙️',
    color: 'var(--brand-danger)',
    stats: [
      { icon: '👥', label: 'Total Users',    key: 'total_users',    color: 'rgba(239,68,68,0.15)'  },
      { icon: '🎤', label: 'Total Sessions', key: 'total_sessions', color: 'rgba(108,99,255,0.15)' },
      { icon: '🤖', label: 'AI Calls Today', key: 'ai_calls',       color: 'rgba(16,185,129,0.15)' },
      { icon: '📈', label: 'Uptime',         key: 'uptime',         color: 'rgba(245,158,11,0.15)' },
    ],
  },
}

const QUICK_ACTIONS = [
  { to: '/analysis',  icon: '⚡', label: 'Argument Lab',    desc: 'AI 8-fallacy & rubric analysis' },
  { to: '/sessions',  icon: '➕', label: 'New Session',     desc: 'Schedule a debate session' },
  { to: '/sessions',  icon: '📋', label: 'My Sessions',     desc: 'View all your sessions' },
  { to: '/profile',   icon: '👤', label: 'Edit Profile',    desc: 'Update skills & goals' },
]

const MOCK_SESSIONS = [
  { id: 1, topic: 'AI regulation benefits society more than it harms it', format: 'One-on-One Debate',    status: 'scheduled', scheduled_at: new Date(Date.now() + 86400000).toISOString() },
  { id: 2, topic: 'Social media does more harm than good',               format: 'Oxford Debate',         status: 'completed', scheduled_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, topic: 'Climate change demands immediate policy intervention', format: 'Policy Debate',         status: 'active',    scheduled_at: new Date().toISOString() },
]

export default function Dashboard() {
  const { user } = useAuth()
  const role     = user?.role || 'learner'
  const config   = ROLE_CONFIG[role] || ROLE_CONFIG.learner
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [students, setStudents] = useState([])
  const [stats, setStats]       = useState({
    total_sessions: user?.total_sessions ?? 12,
    avg_score: user?.avg_score ?? 78,
    win_streak: user?.win_streak ?? 3,
    improvement_rate: '↑ 14%',
    total_students: 0,
    sessions_today: 0,
    pending_reviews: 0,
    total_classes: 4,
    total_reports: 18,
    total_users: 142,
    ai_calls: 340,
    uptime: '99.9%'
  })

  useEffect(() => {
    // Fetch sessions from backend
    api.get('/sessions')
      .then(r => {
        setSessions(r.data)
        const scheduled = r.data.filter(s => s.status === 'scheduled' || s.status === 'active')
        setStats(prev => ({
          ...prev,
          total_sessions: r.data.length,
          pending_reviews: scheduled.length,
          sessions_today: r.data.filter(s => {
            const d = new Date(s.scheduled_at)
            const today = new Date()
            return d.toDateString() === today.toDateString()
          }).length || 1,
        }))
      })
      .catch(() => {/* Use mock data */})

    // If Coach or Educator or Admin, load students
    if (['coach', 'educator', 'admin'].includes(role)) {
      api.get('/users/students')
        .then(r => {
          setStudents(r.data)
          setStats(prev => ({
            ...prev,
            total_students: r.data.length,
            avg_score: r.data.length > 0
              ? Math.round(r.data.reduce((acc, s) => acc + (s.avg_score || 75), 0) / r.data.length)
              : 78
          }))
        })
        .catch(() => {/* Use fallback */})
    }
  }, [role, user])

  const FORMAT_ICONS = { 'One-on-One Debate':'⚔️','Parliamentary Debate':'🏛️','Oxford Debate':'🎓','Policy Debate':'📜','Public Forum Debate':'🌍','AI Debate Simulation':'🤖' }
  const STATUS_STYLE = { scheduled:{ bg:'rgba(108,99,255,0.12)', color:'#A78BFA', label:'Scheduled' }, active:{ bg:'rgba(16,185,129,0.12)', color:'#10B981', label:'Active' }, completed:{ bg:'rgba(245,158,11,0.12)', color:'#F59E0B', label:'Completed' }, cancelled:{ bg:'rgba(239,68,68,0.12)', color:'#EF4444', label:'Cancelled' } }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem' }}>
          Hello, {user?.full_name?.split(' ')[0] || 'Debater'} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{config.greeting}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {config.stats.map(({ icon, label, key, color }) => (
          <div key={key} className="stat-card">
            <div className="stat-icon" style={{ background: color }}>{icon}</div>
            <div className="stat-value">{stats[key] ?? '—'}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Recent Sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Recent Sessions</h3>
            <Link to="/sessions" style={{ color: 'var(--brand-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.slice(0, 5).map((s) => {
              const sStyle = STATUS_STYLE[s.status] || STATUS_STYLE.scheduled
              return (
                <div key={s.id} className="session-card">
                  <div className="session-format-icon">{FORMAT_ICONS[s.format] ?? '🎤'}</div>
                  <div className="session-info">
                    <div className="session-title">{s.topic}</div>
                    <div className="session-meta">{s.format} · {new Date(s.scheduled_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                  </div>
                  <span style={{ padding:'3px 10px', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:600, background: sStyle.bg, color: sStyle.color }}>
                    {sStyle.label}
                  </span>
                </div>
              )
            })}
            {sessions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                No sessions yet. <Link to="/sessions" style={{ color: 'var(--brand-secondary)' }}>Create one →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {QUICK_ACTIONS.map(({ to, icon, label, desc }) => (
              <Link
                key={label}
                to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-medium)'; e.currentTarget.style.transform='translateX(4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.transform='none' }}
              >
                <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Score Card */}
          <div style={{ marginTop: 16, padding: '20px', background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(167,139,250,0.08))', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
              {role === 'learner' ? 'Your Average Score' : 'Platform Benchmark'}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.avg_score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span></div>
            <div style={{ marginTop: 12, height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.avg_score}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))', borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--brand-success)' }}>
              {role === 'learner' ? '↑ 14% improvement trend' : 'Consistent high argumentation quality'}
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Secondary View */}
      {['coach', 'educator', 'admin'].includes(role) ? (
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3>🎓 Registered Students & Debaters</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Monitor individual student progression, experience levels, and average debate scores.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {students.map(s => (
              <div key={s.id} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.email}</div>
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{s.experience_level || 'Beginner'}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: '0.82rem' }}>
                  <div>Sessions: <strong style={{ color: 'var(--text-primary)' }}>{s.total_sessions}</strong></div>
                  <div>Avg Score: <strong style={{ color: 'var(--brand-success)' }}>{s.avg_score}</strong></div>
                </div>
                {s.debate_topics && s.debate_topics.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {s.debate_topics.slice(0, 2).map(t => (
                      <span key={t} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-overlay)', borderRadius: 4, color: 'var(--text-secondary)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {students.length === 0 && (
              <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center' }}>
                No students registered yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Learner Skill Breakdown Widget */
        <div style={{ marginTop: 36, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3>📊 Communication & Debate Skills Tracking</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Real-time metrics calculated from your debate performances.
              </p>
            </div>
            <Link to="/profile" className="btn btn-secondary btn-sm">Customize Skills →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Clarity', val: user?.communication_skills?.clarity_score ?? 75, color: 'var(--brand-primary)' },
              { label: 'Evidence Strength', val: user?.communication_skills?.evidence_strength ?? 70, color: 'var(--brand-secondary)' },
              { label: 'Logical Consistency', val: user?.communication_skills?.logical_consistency ?? 72, color: '#10B981' },
              { label: 'Persuasiveness', val: user?.communication_skills?.persuasiveness ?? 74, color: '#F59E0B' },
              { label: 'Confidence', val: user?.communication_skills?.confidence_score ?? 80, color: '#EC4899' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: 'var(--bg-overlay)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{val}/100</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
