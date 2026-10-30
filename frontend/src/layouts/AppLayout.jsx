import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)

  const loadNotifications = () => {
    api.get('/notifications?limit=20')
      .then(({ data }) => {
        setUnreadCount(data.unread_count || 0)
        setNotifications(data.notifications || [])
      })
      .catch(() => {})
  }

  const loadAiStatus = () => {
    api.get('/system/ai-status')
      .then(({ data }) => setAiStatus(data))
      .catch(() => {})
  }

  useEffect(() => {
    loadNotifications()
    loadAiStatus()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {}
  }

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  const roleKey = user?.role || 'learner'
  const roleLabel = roleKey.replace('_', ' ').toUpperCase()
  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="brand-section">
          <div className="brand-logo-icon">⚡</div>
          <div className="brand-text-block">
            <span className="brand-name">DebateAI</span>
            <span className="brand-tagline">Rhetoric & Presentation</span>
          </div>
        </div>

        {/* AI Engine Status Pill */}
        <div className="ai-status-pill" title={aiStatus?.message || 'AI Engine'}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              className={`ai-status-indicator ${
                aiStatus?.is_ready ? 'ready' : aiStatus?.is_configured ? 'pending' : 'offline'
              }`}
            />
            <span>{aiStatus?.model_display || aiStatus?.model || 'Gemini 3.8 Flash'}</span>
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>
            {aiStatus?.is_ready ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Navigation Items */}
        <nav>
          <NavLink to="/" end>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </NavLink>

          <NavLink to="/debates">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Debates
          </NavLink>

          <NavLink to="/analysis">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Argument Studio
          </NavLink>

          <NavLink to="/presentations">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Presentations
          </NavLink>

          <NavLink to="/skills">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Competencies
          </NavLink>

          <NavLink to="/profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile & Context
          </NavLink>
        </nav>

        {/* Primary CTA */}
        <NavLink className="new-debate-btn" to="/debates/create">
          <span>+</span> New Debate Session
        </NavLink>

        {/* Notifications Widget */}
        <button
          type="button"
          className="notification-toggle-button"
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notifications"
        >
          <span>🔔 Alerts</span>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>

        {/* Sidebar Footer with separated user info */}
        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="user-avatar-circle">{userInitials}</div>
            <div className="user-meta-text">
              <span className="user-name">{user?.name}</span>
              <span className={`role-tag-badge ${roleKey.includes('admin') ? 'admin' : roleKey.includes('coach') ? 'coach' : roleKey.includes('educator') ? 'educator' : 'learner'}`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="logout-icon-btn"
            title="Log out"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {/* Floating Notification Panel */}
        {showNotifications && (
          <aside className="notifications-overlay" role="dialog" aria-label="Notifications">
            <div className="notifications-panel">
              <div className="notifications-header">
                <h3>Notifications</h3>
                <div>
                  {unreadCount > 0 && (
                    <button type="button" className="text-button" onClick={handleMarkAllRead}>
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setShowNotifications(false)}
                    style={{ marginLeft: '0.75rem' }}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <p className="empty-state">No notifications right now.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <div className="notification-title">
                        <strong>{n.title}</strong>
                        <time>{new Date(n.created_at).toLocaleDateString()}</time>
                      </div>
                      <p>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}
        <Outlet />
      </main>
    </div>
  )
}
