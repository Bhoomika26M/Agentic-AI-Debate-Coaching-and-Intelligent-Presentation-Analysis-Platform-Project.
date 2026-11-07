// ClassModal — create/edit classroom cohort dialog

export default function ClassModal({
  show,
  editing,
  name,
  description,
  coach,
  students,
  error,
  saving,
  rosterOptions,
  onClose,
  onSubmit,
  onNameChange,
  onDescChange,
  onCoachChange,
  onToggleStudent,
}) {
  if (!show) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>{editing ? '✏️ Edit Classroom Cohort' : '🏫 Create New Classroom'}</h2>
          <button className="modal-close" onClick={() => onClose()}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{String(error)}</div>}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label htmlFor="class-name">Class Name *</label>
            <input
              id="class-name"
              className="input"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder="e.g. Parliamentary Debate Cohort A"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="class-desc">Description / Focus (Optional)</label>
            <input
              id="class-desc"
              className="input"
              value={description}
              onChange={e => onDescChange(e.target.value)}
              placeholder="e.g. Advanced competitive parliamentary training"
            />
          </div>

          <div className="form-group">
            <label htmlFor="class-coach">Assign Coach</label>
            <select
              id="class-coach"
              className="input"
              value={coach}
              onChange={e => onCoachChange(e.target.value)}
            >
              <option value="">None (Unassigned)</option>
              {Array.isArray(rosterOptions?.coaches) && rosterOptions.coaches.map(c => {
                if (!c || !c.id) return null
                return (
                  <option key={c.id} value={c.id}>
                    🧑‍💼 {c.name || 'Coach'} ({c.email || ''})
                  </option>
                )
              })}
            </select>
          </div>

          <div className="form-group">
            <label>Assign Students to Class</label>
            <div style={{
              maxHeight: 180,
              overflowY: 'auto',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              background: 'var(--bg-overlay)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {Array.isArray(rosterOptions?.students) && rosterOptions.students.map(s => {
                if (!s || !s.id) return null
                const isChecked = Array.isArray(students) && students.includes(s.id)
                return (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleStudent(s.id)}
                    />
                    <span>🎓 {s.name || 'Student'} ({s.email || ''})</span>
                  </label>
                )
              })}
              {(!rosterOptions?.students || rosterOptions.students.length === 0) && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No registered students available.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => onClose()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
