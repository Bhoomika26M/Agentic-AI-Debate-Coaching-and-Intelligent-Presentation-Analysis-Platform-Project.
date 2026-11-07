import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'learner'

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const roleColors = {
    learner: '#176b68',
    coach: '#b36b32',
    educator: '#7c3aed',
    admin: '#b84c4c',
  }
  const roleColor = roleColors[role] || '#176b68'

  const navSections = [
    {
      label: 'Workspace',
      items: [
        { to: '/dashboard', icon: '🏠', label: role === 'coach' ? 'Coach Dashboard' : role === 'educator' ? 'Educator Dashboard' : role === 'admin' ? 'Admin Dashboard' : 'Dashboard' },
        { to: '/sessions',  icon: '📋', label: role === 'coach' ? 'Adjudication Queue' : role === 'educator' ? 'Class Sessions' : role === 'admin' ? 'All Platform Sessions' : 'My Debate Sessions' },
        { to: '/profile',   icon: '👤', label: 'Profile & Skills' },
      ],
    },
    {
      label: 'AI Debate & Training',
      items: [
        { to: '/analysis',   icon: '⚡', label: 'Argument & Fallacy Lab' },
        { to: '/simulation', icon: '🤖', label: 'AI Debate Simulation' },
        { to: '/coaching',   icon: '🏆', label: role === 'coach' ? 'Coaching Drills' : 'Coaching & Learning' },
      ],
    },
    {
      label: 'Intelligence & Insights',
      items: [
        { to: '/presentation', icon: '🎤', label: 'Presentation Analysis' },
        { to: '/reports',      icon: '📊', label: role === 'educator' ? 'Academic Reports & Export' : role === 'admin' ? 'Telemetry & Audit Reports' : 'Reports & Analytics' },
      ],
    },
  ]

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">🧠</div>
        <div>
          <div className="brand-name">DebateCoach AI</div>
          <div className="brand-tagline">Intelligent Platform</div>
        </div>
      </div>

      {/* User pill */}
      {user ? (
        <div className="sidebar-user">
          <div className="user-avatar" style={{ background: roleColor }}>
            {user.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="user-info">
            <div className="user-name">{user.full_name}</div>
            <div className="user-role" style={{ color: roleColor }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: roleColor, marginRight: 4 }} />
              {user.role}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px 14px',
          margin: '10px 14px',
          background: 'var(--bg-overlay)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Guest Mode</div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 8, width: '100%' }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label} className="nav-section">
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout / Login */}
      <div className="sidebar-footer">
        {user ? (
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        ) : (
          <button className="logout-btn" onClick={() => navigate('/login')}>
            <span>🔑</span> Sign In
          </button>
        )}
      </div>
    </aside>
  )
}
