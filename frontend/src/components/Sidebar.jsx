import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { to: '/analysis',   icon: '⚡', label: 'Argument Lab' },
  { to: '/sessions',   icon: '🎤', label: 'Debate Sessions' },
  { to: '/profile',    icon: '👤', label: 'Profile' },
]

const ROLE_COLORS = {
  learner:   { bg: 'rgba(108,99,255,0.15)', color: '#A78BFA' },
  coach:     { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
  educator:  { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  admin:     { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444' },
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const roleStyle = ROLE_COLORS[user?.role] ?? ROLE_COLORS.learner

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <aside style={{
      width: collapsed ? 72 : 240,
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid var(--border-subtle)',
        minHeight: 72,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>🧠</div>
        {!collapsed && (
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
            DebateCoach <span style={{ color: 'var(--brand-secondary)' }}>AI</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 12px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: '0.9rem',
              color: isActive ? 'var(--brand-secondary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 700, color: '#fff',
        }}>{initials}</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{
              fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize',
              color: roleStyle.color, marginTop: 1,
            }}>
              {user?.role || 'learner'}
            </div>
          </div>
        )}
        {!collapsed && (
          <button onClick={handleLogout} title="Logout"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', flexShrink: 0 }}>
            🚪
          </button>
        )}
      </div>
    </aside>
  )
}
