// SessionCreateModal — debate session creation form for coaches, educators, and admins

export const FORMATS = [
  'One-on-One Debate',
  'Parliamentary Debate',
  'Oxford Debate',
  'Policy Debate',
  'Public Forum Debate',
  'AI Debate Simulation',
]

export const SPEAKER_POSITIONS = [
  {
    group: 'Parliamentary Debate (BP / Asian)',
    positions: [
      'Prime Minister (PM - Gov 1st Speaker)',
      'Deputy Prime Minister (DPM - Gov 2nd Speaker)',
      'Leader of Opposition (LO - Opp 1st Speaker)',
      'Deputy Leader of Opposition (DLO - Opp 2nd Speaker)',
      'Member of Government (MG)',
      'Member of Opposition (MO)',
      'Government Whip (GW)',
      'Opposition Whip (OW)',
    ],
  },
  {
    group: 'Oxford / Lincoln-Douglas / 1-on-1',
    positions: [
      '1st Proposition / Affirmative Speaker',
      '2nd Proposition / Affirmative Speaker',
      '1st Opposition / Negative Speaker',
      '2nd Opposition / Negative Speaker',
      'Reply Speaker (Proposition)',
      'Reply Speaker (Opposition)',
    ],
  },
  {
    group: 'Policy / Public Forum',
    positions: [
      '1st Affirmative (1A)',
      '2nd Affirmative (2A)',
      '1st Negative (1N)',
      '2nd Negative (2N)',
      'Crossfire Questioner / Summary',
    ],
  },
  {
    group: 'General & Adjudication',
    positions: [
      'Proposition / Affirmative',
      'Opposition / Negative',
      'Neutral / Judge Panelist',
    ],
  },
]

export const SESSION_TYPES = [
  '🎯 Practice Round (Skill Drilling & Feedback)',
  '🏆 Live Competitive Match / Formal Adjudication',
]

const DEMO_PRESETS = [
  {
    label: 'Preset 1: AI Regulation (Oxford - 1st Proposition)',
    topic: 'Artificial Intelligence should be strictly regulated by international treaties',
    format: 'Oxford Debate',
    position: '1st Proposition / Affirmative Speaker',
    duration_minutes: 20,
    session_type: '🎯 Practice Round (Skill Drilling & Feedback)',
    notes: 'Focus on empirical safety benchmarks, existential risk governance, and EU AI Act parallels.',
  },
  {
    label: 'Preset 2: Clean Energy (Parliamentary - Prime Minister)',
    topic: 'Developing nations should prioritize green energy over industrial fossil expansion',
    format: 'Parliamentary Debate',
    position: 'Prime Minister (PM - Gov 1st Speaker)',
    duration_minutes: 30,
    session_type: '🏆 Live Competitive Match / Formal Adjudication',
    notes: 'Frame motion on economic sustainability, clean job creation metrics, and climate resilience.',
  },
]

export default function SessionCreateModal({
  show,
  canCreate,
  form,
  error,
  creating,
  students,
  onClose,
  onSubmit,
  onChange,
  onApplyPreset,
}) {
  if (!show || !canCreate) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>New Debate Session</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{String(error)}</div>}

        {/* Quick Demo Presets */}
        <div style={{ marginBottom: 16, background: 'var(--bg-overlay)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
            ⚡ Quick Demo Presets (1-Click Fill)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DEMO_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="chip"
                onClick={() => onApplyPreset(p)}
                style={{ fontSize: '0.78rem' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label htmlFor="session-topic">Debate Topic / Resolution *</label>
            <input
              id="session-topic"
              className="input"
              name="topic"
              value={form.topic}
              onChange={onChange}
              placeholder="e.g. Artificial Intelligence should be strictly regulated by international treaties"
              required
            />
          </div>

          {/* Assign Student Dropdown (Optional) */}
          <div className="form-group">
            <label htmlFor="session-user-id">Assign to Student (Optional)</label>
            <select
              id="session-user-id"
              className="input"
              name="user_id"
              value={form.user_id}
              onChange={onChange}
            >
              <option value="">👥 Open for All Class Students (Any Learner Can Participate)</option>
              {Array.isArray(students) && students.map(st => (
                <option key={st.id} value={st.id}>
                  🎓 {st.name} ({st.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label htmlFor="session-format">Debate Format *</label>
              <select id="session-format" className="input" name="format" value={form.format} onChange={onChange}>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="session-position">Speaker Position / Role *</label>
              <select id="session-position" className="input" name="position" value={form.position} onChange={onChange}>
                {SPEAKER_POSITIONS.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.positions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-3" style={{ gap: 14 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="session-date">Scheduled Date & Time *</label>
              <input
                id="session-date"
                className="input"
                type="datetime-local"
                name="scheduled_at"
                value={form.scheduled_at}
                onChange={onChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="session-duration">Duration (mins)</label>
              <input
                id="session-duration"
                className="input"
                type="number"
                min="5"
                max="180"
                name="duration_minutes"
                value={form.duration_minutes}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="session-notes">Preparation Notes & Instructions (optional)</label>
            <textarea
              id="session-notes"
              className="input"
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows={2}
              placeholder="Key argument focus, Toulmin structure requirements, or empirical evidence benchmarks..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button id="session-submit" type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? <span className="spinner" /> : '✅ Schedule Debate Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

