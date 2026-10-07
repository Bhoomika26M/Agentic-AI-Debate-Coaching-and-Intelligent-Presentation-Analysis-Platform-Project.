import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard',        subtitle: 'Welcome back! Here\'s your coaching overview.' },
  '/sessions':  { title: 'Debate Sessions',  subtitle: 'Manage and schedule your debate sessions.' },
  '/profile':   { title: 'My Profile',       subtitle: 'Manage your information and skill preferences.' },
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { user }     = useAuth()
  const page = PAGE_TITLES[pathname] || { title: 'DebateCoach AI', subtitle: '' }
  const now  = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      height: 72,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      flexShrink: 0,
    }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {page.title}
        </h2>
        {page.subtitle && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{page.subtitle}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{now}</span>
        <div style={{
          padding: '6px 14px',
          background: 'rgba(108,99,255,0.1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem',
          color: 'var(--brand-secondary)',
          fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {user?.role || 'learner'}
        </div>
      </div>
    </header>
  )
}
