import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const DEBATE_TOPICS = [
  'Technology & AI', 'Climate & Environment', 'Politics & Governance',
  'Education Reform', 'Healthcare Policy', 'Economics & Trade',
  'Social Justice', 'Science & Innovation', 'Philosophy & Ethics', 'Sports',
]

const PRESENTATION_DOMAINS = [
  'Keynote & Public Speaking',
  'Academic & Scientific Defense',
  'Business Pitch & Sales',
  'Policy & Civic Discourse',
  'Competitive Parliamentary',
  'Interview & Professional Presentation',
]

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

const LEARNING_GOALS = [
  'Improve argument structure',
  'Reduce filler words',
  'Build confidence',
  'Master rebuttals',
  'Enhance research skills',
  'Develop speaking pace',
]

const COACHING_PREFS = [
  'Detailed feedback',
  'Quick tips',
  'Video analysis',
  'Peer comparison',
  'AI simulation',
]

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    full_name:            user?.full_name || '',
    email:                user?.email || '',
    experience_level:     user?.experience_level || 'Beginner',
    bio:                  user?.bio || '',
    debate_topics:        user?.debate_topics || [],
    presentation_domains: user?.presentation_domains || [],
    learning_goals:       user?.learning_goals || [],
    coaching_prefs:       user?.coaching_prefs || [],
  })
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const onChange  = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const toggleArr = (field, val) => setForm(f => ({
    ...f,
    [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
  }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      const { data } = await api.put('/users/me', form)
      updateUser(data)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{ maxWidth: 720, animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your information, skill level, and coaching preferences</p>
        </div>
        <button id="save-profile" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : '💾 Save Changes'}
        </button>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ Profile saved successfully!</div>}

      {/* Avatar + Basic Info */}
      <div className="profile-section">
        <div className="profile-section-title">Basic Information</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
          <div className="profile-avatar">{initials}</div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{user?.email}</div>
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 16 }}>
          <div className="form-group">
            <label htmlFor="pf-name">Full Name</label>
            <input id="pf-name" className="input" name="full_name" value={form.full_name} onChange={onChange} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label htmlFor="pf-email">Email</label>
            <input id="pf-email" className="input" name="email" type="email" value={form.email} onChange={onChange} placeholder="Email address" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="pf-bio">Bio</label>
            <textarea id="pf-bio" className="input" name="bio" value={form.bio} onChange={onChange}
              placeholder="Tell us about yourself and your debate goals…"
              rows={3} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Experience Level */}
      <div className="profile-section">
        <div className="profile-section-title">Experience Level</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SKILL_LEVELS.map(level => (
            <button
              key={level}
              id={`level-${level.toLowerCase()}`}
              type="button"
              className={`btn ${form.experience_level === level ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setForm(f => ({ ...f, experience_level: level }))}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Communication Skill Tracking */}
      <div className="profile-section">
        <div className="profile-section-title">📊 Communication Skill Tracking</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Real-time metrics evaluated across your debate sessions and presentation practices.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { label: 'Clarity Score',        val: user?.communication_skills?.clarity_score ?? 75, max: 100, unit: '/100', color: 'var(--brand-primary)' },
            { label: 'Evidence Strength',    val: user?.communication_skills?.evidence_strength ?? 70, max: 100, unit: '/100', color: 'var(--brand-secondary)' },
            { label: 'Logical Consistency',  val: user?.communication_skills?.logical_consistency ?? 72, max: 100, unit: '/100', color: '#10B981' },
            { label: 'Persuasiveness',       val: user?.communication_skills?.persuasiveness ?? 74, max: 100, unit: '/100', color: '#F59E0B' },
            { label: 'Confidence Score',     val: user?.communication_skills?.confidence_score ?? 80, max: 100, unit: '/100', color: '#EC4899' },
            { label: 'Speaking Pace',        val: user?.communication_skills?.speaking_pace ?? 135, max: 200, unit: ' wpm', color: '#6366F1' },
          ].map(({ label, val, max, unit, color }) => (
            <div key={label} style={{
              background: 'var(--bg-overlay)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{val}{unit}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (val / max) * 100)}%`,
                  background: color,
                  borderRadius: 3,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Presentation Domains */}
      <div className="profile-section">
        <div className="profile-section-title">🎤 Presentation Domains</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Select the public speaking and presentation formats you focus on:
        </p>
        <div className="tag-list">
          {PRESENTATION_DOMAINS.map(domain => (
            <button
              key={domain}
              id={`domain-${domain.replace(/\s+/g,'-').toLowerCase()}`}
              type="button"
              className={`tag ${form.presentation_domains.includes(domain) ? 'active' : ''}`}
              onClick={() => toggleArr('presentation_domains', domain)}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Debate Topics */}
      <div className="profile-section">
        <div className="profile-section-title">Preferred Debate Topics</div>
        <div className="tag-list">
          {DEBATE_TOPICS.map(topic => (
            <button
              key={topic}
              id={`topic-${topic.replace(/\s+/g,'-').toLowerCase()}`}
              type="button"
              className={`tag ${form.debate_topics.includes(topic) ? 'active' : ''}`}
              onClick={() => toggleArr('debate_topics', topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Learning Goals */}
      <div className="profile-section">
        <div className="profile-section-title">Learning Goals</div>
        <div className="tag-list">
          {LEARNING_GOALS.map(goal => (
            <button
              key={goal}
              id={`goal-${goal.replace(/\s+/g,'-').toLowerCase()}`}
              type="button"
              className={`tag ${form.learning_goals.includes(goal) ? 'active' : ''}`}
              onClick={() => toggleArr('learning_goals', goal)}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      {/* Coaching Preferences */}
      <div className="profile-section">
        <div className="profile-section-title">Coaching Preferences</div>
        <div className="tag-list">
          {COACHING_PREFS.map(pref => (
            <button
              key={pref}
              id={`pref-${pref.replace(/\s+/g,'-').toLowerCase()}`}
              type="button"
              className={`tag ${form.coaching_prefs.includes(pref) ? 'active' : ''}`}
              onClick={() => toggleArr('coaching_prefs', pref)}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
