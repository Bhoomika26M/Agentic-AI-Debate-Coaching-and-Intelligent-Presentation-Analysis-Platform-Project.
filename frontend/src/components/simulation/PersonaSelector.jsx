/**
 * PersonaSelector Component
 * =========================
 * Displays the 8 AI opponent personas specified in Milestone 3:
 * - Analytical Scholar (evidence-based, empirical)
 * - Aggressive Debater (assertive, relentlessly attacks premises)
 * - Philosopher (Socratic, conceptual definitions)
 * - Policy Pragmatist (cost-benefit, implementation reality)
 * - Ethical Advocate (human rights, moral clarity)
 * - Devil's Advocate (provocative contrarian)
 * - Socratic Coach (guiding, question-driven)
 * - Balanced Moderator (nuanced, seeks common ground)
 */
export const PERSONAS = [
  { key: 'balanced',       icon: '⚖️',  label: 'Balanced Moderator',    color: '#176b68', style: 'Nuanced, steelmans opposition' },
  { key: 'analytical',     icon: '🔬',  label: 'Analytical Scholar',    color: '#0ea5e9', style: 'Empirical, data-driven' },
  { key: 'aggressive',     icon: '⚔️',  label: 'Aggressive Debater',    color: '#b84c4c', style: 'Relentless, attacks premises' },
  { key: 'philosophical',  icon: '🧠',  label: 'Philosopher',           color: '#8b5cf6', style: 'Socratic, conceptual foundations' },
  { key: 'pragmatic',      icon: '📊',  label: 'Policy Pragmatist',     color: '#2f7d5b', style: 'Cost-benefit, operational reality' },
  { key: 'ethical',        icon: '🌍',  label: 'Ethical Advocate',      color: '#b36b32', style: 'Human rights, moral impact' },
  { key: 'devil_advocate', icon: '😈',  label: "Devil's Advocate",      color: '#d97706', style: 'Contrarian, tests assumptions' },
  { key: 'coach',          icon: '🏆',  label: 'Socratic Coach',        color: '#0d9488', style: 'Educational, constructive drills' },
]

export default function PersonaSelector({ selectedPersona, onSelect }) {
  return (
    <div className="persona-grid">
      {PERSONAS.map(p => (
        <button
          key={p.key}
          type="button"
          className={`persona-card ${selectedPersona === p.key ? 'selected' : ''}`}
          onClick={() => onSelect(p.key)}
          title={`${p.label}: ${p.style}`}
        >
          <span className="persona-icon">{p.icon}</span>
          <span className="persona-label">{p.label}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {p.style.split(',')[0]}
          </span>
        </button>
      ))}
    </div>
  )
}

