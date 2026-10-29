/**
 * FallacyCatalogModal Component
 * =============================
 * Educational reference modal displaying all 8 supported logical fallacies
 * from Milestone 2 specification, complete with category, definitions,
 * realistic examples, and actionable debate corrections.
 */
export default function FallacyCatalogModal({ isOpen, onClose, catalog }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>📖 8 Supported Logical Fallacies Reference</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>
          The platform actively detects, explains, and penalizes these 8 cognitive and rhetorical fallacies:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {catalog.map((f, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {idx + 1}. {f.name}
                </strong>
                <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                  {f.category}
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                {f.description}
              </p>
              <div
                style={{
                  background: 'rgba(184,76,76,0.06)',
                  borderLeft: '3px solid var(--brand-danger)',
                  padding: '8px 12px',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.82rem',
                  fontStyle: 'italic',
                  marginBottom: 6,
                  color: 'var(--text-primary)',
                }}
              >
                <strong>Example:</strong> "{f.example}"
              </div>
              <div
                style={{
                  background: 'rgba(47,125,91,0.06)',
                  borderLeft: '3px solid var(--brand-success)',
                  padding: '8px 12px',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                }}
              >
                <strong>How to Fix / Refute:</strong> {f.correction}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary btn-full" onClick={onClose}>
            Close Reference
          </button>
        </div>
      </div>
    </div>
  )
}

