import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import AIStatusBadge from './ai/AIStatusBadge'
import AISettingsModal from './ai/AISettingsModal'

const PAGE_TITLES = {
  '/dashboard':    { title: 'Dashboard',             subtitle: 'Welcome back! Here\'s your coaching overview.' },
  '/sessions':     { title: 'Debate Sessions',       subtitle: 'Manage and schedule your debate sessions across 6 formats.' },
  '/profile':      { title: 'My Profile & Skills',   subtitle: 'Manage your bio, preferred topics, and communication radar.' },
  '/analysis':     { title: 'Argument & Fallacy Lab',subtitle: 'Automated claim extraction and 8-fallacy detection.' },
  '/simulation':   { title: 'AI Debate Simulation',  subtitle: 'Spar with 8 dynamic AI opponent personas.' },
  '/coaching':     { title: 'Coaching & Drills',     subtitle: 'Personalized 4-week learning plans and skill gap diagnostics.' },
  '/presentation': { title: 'Presentation Analysis', subtitle: 'Acoustic pacing, filler word mining, and delivery confidence.' },
  '/reports':      { title: 'Reports & Analytics',   subtitle: 'Executive summaries, PDF/Excel exports, and admin metrics.' },
}

const TYPE_ICONS = {
  debate_reminder:   '🎤',
  coaching_feedback: '📝',
  practice_reminder: '⏱️',
  skill_milestone:   '🏆',
  announcement:      '📢',
}

/**
 * Navbar Component
 * ================
 * Top navigation bar displaying:
 * 1. Current Page Title & Subtitle
 * 2. Live Agentic AI Engine Status & Configuration Trigger
 * 3. Notification Center dropdown with unread badge counter
 * 4. User Role Badge
 */
export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const page = PAGE_TITLES[pathname] || { title: 'DebateCoach AI', subtitle: '' }
  const now = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [openNotifs, setOpenNotifs]       = useState(false)
  const [aiStatus, setAiStatus]           = useState({ active: false, provider: 'heuristic' })
  const [showAiModal, setShowAiModal]     = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
    loadAiStatus()
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unread_count || 0)
    } catch {}
  }

  const loadAiStatus = async () => {
    try {
      const res = await api.get('/analysis/ai-status')
      setAiStatus(res.data)
    } catch {}
  }

  const markAsRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
      if (link) {
        setOpenNotifs(false)
        navigate(link)
      }
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  return (
    <>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 72,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 40,
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {page.title}
          </h2>
          {page.subtitle && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{page.subtitle}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Agentic AI Status Indicator */}
          <AIStatusBadge status={aiStatus} onClick={() => setShowAiModal(true)} />

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{now}</span>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setOpenNotifs(!openNotifs)}
              style={{
                position: 'relative',
                background: openNotifs ? 'var(--bg-overlay)' : 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '50%',
                width: 38,
                height: 38,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                transition: 'all 0.2s ease',
              }}
              title="Notifications & Engagement Alerts"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  padding: '1px 5px',
                  minWidth: 16,
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {openNotifs && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 48,
                width: 360,
                maxHeight: 460,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 100,
                animation: 'fadeIn 0.2s ease',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-overlay)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Notifications & Alerts
                    {unreadCount > 0 && (
                      <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--brand-primary)' }}>
                        ({unreadCount} new)
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.72rem',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: 380 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id, n.link)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          background: n.is_read ? 'transparent' : 'rgba(23, 107, 104, 0.05)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', marginTop: 2 }}>{TYPE_ICONS[n.type] || '📌'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: n.is_read ? 600 : 700,
                              color: n.is_read ? 'var(--text-primary)' : 'var(--brand-primary)',
                            }}>
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block' }} />
                            )}
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role Pill */}
          <div style={{
            padding: '5px 12px',
            background: 'rgba(23,107,104,0.1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            color: 'var(--brand-primary)',
            fontWeight: 600,
            textTransform: 'capitalize',
          }}>
            {user?.role || 'learner'}
          </div>
        </div>
      </header>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        aiStatus={aiStatus}
        onStatusRefresh={loadAiStatus}
      />
    </>
  )
}
