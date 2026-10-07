const FORMAT_ICONS = {
  'One-on-One Debate':     '⚔️',
  'Parliamentary Debate':  '🏛️',
  'Oxford Debate':         '🎓',
  'Policy Debate':         '📜',
  'Public Forum Debate':   '🌍',
  'AI Debate Simulation':  '🤖',
}

const STATUS_BADGE = {
  scheduled: { label: 'Scheduled', cls: 'badge-primary' },
  active:     { label: 'Active',    cls: 'badge-success' },
  completed:  { label: 'Completed', cls: 'badge-warning' },
  cancelled:  { label: 'Cancelled', cls: 'badge-danger'  },
}

export default function SessionCard({ session, onView, onDelete }) {
  const icon   = FORMAT_ICONS[session.format] ?? '🎤'
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
        <div className="session-meta">{session.format} · {date}</div>
      </div>

      <span className={`badge ${status.cls}`}>{status.label}</span>

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
