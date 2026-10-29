/**
 * AIStatusBadge Component
 * =======================
 * Header pill displaying live Agentic AI status.
 * Clicking opens the AI Settings Modal.
 */
export default function AIStatusBadge({ status, onClick }) {
  const isActive = Boolean(status?.active)

  return (
    <button
      type="button"
      className={`ai-status-pill ${isActive ? 'active' : 'offline'}`}
      onClick={onClick}
      title="Click to configure Agentic AI Provider / API Keys"
    >
      <span className={`ai-pulse-dot ${isActive ? 'active' : 'offline'}`} />
      <span>
        {isActive ? `Agentic AI: ${status.provider?.toUpperCase()}` : 'AI: Local Heuristic'}
      </span>
      <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>⚙</span>
    </button>
  )
}

