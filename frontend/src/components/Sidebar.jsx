import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard',    icon: '🏠', label: 'Dashboard' },
      { to: '/sessions',     icon: '📋', label: 'Debate Sessions' },
      { to: '/profile',      icon: '👤', label: 'Profile & Skills' },
    ],
  },
  {
    label: 'AI Debate & Training',
    items: [
      { to: '/analysis',     icon: '⚡', label: 'Argument & Fallacy Lab' },
      { to: '/simulation',   icon: '🤖', label: 'AI Debate Simulation' },
      { to: '/coaching',     icon: '🏆', label: 'Coaching & Learning' },
    ],
  },
  {
    label: 'Intelligence & Insights',
    items: [
      { to: '/presentation', icon: '🎤', label: 'Presentation Analysis' },
      { to: '/reports',      icon: '📊', label: 'Reports & Analytics' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColors = {
    learner: '#176b68',
    coach: '#b36b32',
    educator: '#7c3aed',
    admin: '#b84c4c',
  }
  const roleColor = roleColors[user?.role] || '#176b68'

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
      {user && (
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
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
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

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  )
}
