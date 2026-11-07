const FORMAT_ICONS = {
  'One-on-One Debate':     '⚔️',
  'Parliamentary Debate':  '🏛️',
  'Oxford Debate':         '🎓',
  'Policy Debate':         '📜',
  'Public Forum Debate':   '🌐',
  'AI Debate Simulation':  '🤖',
}

const STATUS_BADGE = {
  scheduled: { label: 'Scheduled', cls: 'badge-primary' },
  active:     { label: 'Active',    cls: 'badge-success' },
  completed:  { label: 'Completed (Locked)', cls: 'badge-warning' },
  expired:    { label: 'Expired',   cls: 'badge-secondary' },
  cancelled:  { label: 'Cancelled', cls: 'badge-danger'  },
}

export default function SessionCard({ session, onView, onDelete }) {
  const icon   = FORMAT_ICONS[session.format] ?? '🎙️'
  const status = STATUS_BADGE[session.status] ?? STATUS_BADGE.scheduled
  const date   = new Date(session.scheduled_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="session-card animate-fade">
      <div className="session-format-icon">{icon}</div>

      <div className="session-info">
        <div className="session-title">{session.topic}</div>
        <div className="session-meta">
          {session.format} {session.position ? `· ${session.position}` : ''} · {date}
          {session.student_name && ` · 🎓 ${session.student_name}`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {session.score != null && (
          <span style={{ fontWeight: 800, color: 'var(--brand-success)', fontSize: '0.88rem' }}>
            🔒 {session.score}/100
          </span>
        )}
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </div>

      <div className="session-actions">
        {onView && (
          <button className="btn btn-secondary btn-sm" onClick={() => onView(session)}>
            View
          </button>
        )}
        {onDelete && session.status === 'scheduled' && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(session.id)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
