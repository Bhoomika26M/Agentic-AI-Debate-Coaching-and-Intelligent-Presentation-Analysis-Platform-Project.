import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(user?.role || 'learner')
  const [overview, setOverview] = useState(null)
  const [learningPath, setLearningPath] = useState(null)
  const [showLearningPath, setShowLearningPath] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState({ title: '', message: '' })
  const [announcementStatus, setAnnouncementStatus] = useState('')

  useEffect(() => {
    if (user?.role) {
      setActiveTab(user.role)
    }
  }, [user])

  const loadDashboard = (viewRole) => {
    setLoading(true)
    setError('')
    api.get(`/dashboard/overview?view=${viewRole}`)
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard(activeTab)
  }, [activeTab])

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      loadDashboard(activeTab)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user role.')
    }
  }

  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    setAnnouncementStatus('Sending announcement...')
    try {
      const res = await api.post('/notifications/announcement', announcement)
      setAnnouncementStatus(res.data.message || 'Announcement broadcasted successfully!')
      setAnnouncement({ title: '', message: '' })
    } catch (err) {
      setAnnouncementStatus(err.response?.data?.detail || 'Failed to broadcast announcement.')
    }
  }

  const toggleLearningPath = async () => {
    if (!learningPath) {
      try {
        const res = await api.get('/skills/learning-path')
        setLearningPath(res.data)
      } catch {}
    }
    setShowLearningPath(!showLearningPath)
  }

  const canSwitchRoles = user?.role === 'administrator' || user?.role === 'educator' || user?.role === 'debate_coach'

  return (
    <section className="page-stack dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Platform / Overview</p>
          <h1>Debate Coach & Presentation Intelligence</h1>
          <p className="lede">
            AI-driven argumentation analysis, multi-turn debate simulation, speech pacing, and coaching intelligence.
          </p>
        </div>

        {canSwitchRoles && (
          <div className="role-switcher" role="tablist" aria-label="Dashboard role selector">
            <span className="help-text" style={{ marginRight: '0.5rem', fontWeight: 600 }}>ROLE VIEW:</span>
            <div className="tab-pills">
              <button
                type="button"
                className={`tab-pill ${activeTab === 'learner' ? 'active' : ''}`}
                onClick={() => setActiveTab('learner')}
              >
                Learner
              </button>
              {(user?.role === 'debate_coach' || user?.role === 'administrator') && (
                <button
                  type="button"
                  className={`tab-pill ${activeTab === 'debate_coach' ? 'active' : ''}`}
                  onClick={() => setActiveTab('debate_coach')}
                >
                  Coach
                </button>
              )}
              {(user?.role === 'educator' || user?.role === 'administrator') && (
                <button
                  type="button"
                  className={`tab-pill ${activeTab === 'educator' ? 'active' : ''}`}
                  onClick={() => setActiveTab('educator')}
                >
                  Educator
                </button>
              )}
              {user?.role === 'administrator' && (
                <button
                  type="button"
                  className={`tab-pill ${activeTab === 'administrator' ? 'active' : ''}`}
                  onClick={() => setActiveTab('administrator')}
                >
                  Admin
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
      {loading && <p className="loading-state">Loading dashboard analytics...</p>}

      {/* 1. LEARNER DASHBOARD */}
      {!loading && overview?.learner_data && activeTab === 'learner' && (
        <div className="page-stack">
          {/* KPI Metrics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <span>Debates Joined</span>
              <strong>{overview.learner_data.total_debates}</strong>
              <small>Practice arena sessions</small>
            </div>
            <div className="stat-card">
              <span>Arguments Submitted</span>
              <strong>{overview.learner_data.total_arguments}</strong>
              <small>Debate turns & rebuttals</small>
            </div>
            <div className="stat-card">
              <span>Speeches Analyzed</span>
              <strong>{overview.learner_data.total_presentations}</strong>
              <small>Transcripts & audio files</small>
            </div>
            <div className="stat-card">
              <span>Avg Debate Score</span>
              <strong>
                {overview.learner_data.average_debate_score != null
                  ? `${overview.learner_data.average_debate_score}/100`
                  : '—'}
              </strong>
              <small>Weighted 5-rubric evaluation</small>
            </div>
            <div className="stat-card">
              <span>Avg Speech Score</span>
              <strong>
                {overview.learner_data.average_presentation_score != null
                  ? `${overview.learner_data.average_presentation_score}/100`
                  : '—'}
              </strong>
              <small>Delivery & clarity rating</small>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="dashboard-actions-row">
            <button type="button" className="button secondary" onClick={toggleLearningPath}>
              {showLearningPath ? 'Hide Roadmap' : '🎯 View Personalized Learning Roadmap'}
            </button>
            <a href="/api/reports/learner/progress?format=pdf" target="_blank" rel="noreferrer" className="button secondary">
              📄 Download Progress PDF
            </a>
            <a href="/api/reports/learner/progress?format=excel" className="button secondary">
              📊 Export Progress Excel
            </a>
          </div>

          {/* Structured Learning Path Modal/Section */}
          {showLearningPath && learningPath && (
            <article className="detail-panel">
              <div className="card-title-row">
                <div>
                  <p className="eyebrow">Personalized Pathway / 4 Phases</p>
                  <h2>Skill Development Roadmap ({learningPath.current_level} Level)</h2>
                </div>
                <span className="status status-active">{learningPath.overall_progress_pct}% Completed</span>
              </div>
              <div className="skills-bar-grid">
                {learningPath.phases.map((p) => (
                  <div key={p.phase} className="skill-bar-item">
                    <div className="skill-bar-header">
                      <span className="skill-name">Phase {p.phase}: {p.title}</span>
                      <span className={`status status-${p.status === 'completed' ? 'completed' : p.status === 'in_progress' ? 'active' : 'scheduled'}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{p.description}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                      {p.focus_skills.map((s) => (
                        <span key={s} className="tag-badge">{s}</span>
                      ))}
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: '#475569' }}>
                      {p.recommended_exercises.slice(0, 2).map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Competency Baseline with auto-calculated visual progress bars */}
          <article className="detail-panel">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Practice-Assessed Proficiency</p>
                <h2>Skill Competency Baseline</h2>
              </div>
              <Link to="/skills" className="text-button">
                View Detailed Matrix →
              </Link>
            </div>
            <div className="skills-bar-grid">
              {Object.entries(overview.learner_data.skills || {}).map(([key, score]) => (
                <div key={key} className="skill-bar-item">
                  <div className="skill-bar-header">
                    <span className="skill-name">{key.replace('_', ' ').toUpperCase()}</span>
                    <span className="skill-score-pill">{score}/100</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(100, score)}%` }} />
                  </div>
                  <div className="skill-level-indicator">
                    <span>Baseline: {score > 0 ? (score >= 80 ? 'Advanced' : score >= 60 ? 'Proficient' : 'Developing') : 'Unassessed'}</span>
                    <span>Target: 90+</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Recent Debates */}
          <article className="detail-panel">
            <div className="card-title-row">
              <h2>Recent Debate Sessions</h2>
              <Link to="/debates/create" className="text-button">+ New Debate</Link>
            </div>
            {overview.learner_data.recent_debates?.length === 0 ? (
              <div className="empty-state">
                <p>No debate sessions joined yet.</p>
                <Link to="/debates/create" className="button" style={{ marginTop: '12px' }}>
                  Start Your First AI Sparring Session
                </Link>
              </div>
            ) : (
              <div className="debates-list-grid">
                {overview.learner_data.recent_debates.map((d) => (
                  <div key={d.id} className="debate-session-card">
                    <div className="debate-card-main">
                      <Link to={`/debates/${d.id}`} className="debate-topic-title">
                        {d.topic}
                      </Link>
                      <div className="debate-meta-tags">
                        <span className="tag-badge">{d.format.replace('_', ' ')}</span>
                        <span className={`status status-${d.status}`}>{d.status}</span>
                        {d.ai_opponent && <span className="tag-badge ai-badge">🤖 AI Sparring</span>}
                      </div>
                    </div>
                    <Link to={`/debates/${d.id}`} className="button secondary small-button">
                      Enter Arena →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* Coaching Insights & Recommended Practice */}
          <article className="detail-panel">
            <div className="card-title-row">
              <h2>Coaching Insights & Recommended Drills</h2>
            </div>
            <div className="form-grid">
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>🔍 Activity Observations</h3>
                <ul style={{ paddingLeft: '18px', fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>You have participated in {overview.learner_data.total_debates} debate sessions and submitted {overview.learner_data.total_arguments} arguments.</li>
                  <li>Completed {overview.learner_data.total_presentations} speech recordings with delivery metrics.</li>
                  <li>AI evaluation is based on real debate transcripts and speech cadence measurements.</li>
                </ul>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>🎯 Recommended Next Exercises</h3>
                <ul style={{ paddingLeft: '18px', fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Structure your opening claims in the <strong>Argument Studio</strong> to check for logical fallacies.</li>
                  <li>Complete a 3-turn multi-round debate with the <strong>Gemini AI Opponent</strong>.</li>
                  <li>Record a 2-minute speech presentation to assess speaking pace and filler words.</li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* 2. DEBATE COACH DASHBOARD */}
      {!loading && overview?.coach_data && activeTab === 'debate_coach' && (
        <div className="page-stack">
          <div className="stats-grid">
            <div className="stat-card">
              <span>Active Students</span>
              <strong>{overview.coach_data.active_students_count}</strong>
              <small>Learners with active sessions</small>
            </div>
            <div className="stat-card">
              <span>Evaluations Completed</span>
              <strong>{overview.coach_data.completed_evaluations_count}</strong>
              <small>Debate reviews delivered</small>
            </div>
            <div className="stat-card">
              <span>Avg Student Score</span>
              <strong>{overview.coach_data.average_student_score != null ? `${overview.coach_data.average_student_score}/100` : '—'}</strong>
              <small>Cohort mean performance</small>
            </div>
            <div className="stat-card">
              <span>Pending Reviews</span>
              <strong>{overview.coach_data.pending_reviews_count}</strong>
              <small>Sessions awaiting evaluation</small>
            </div>
          </div>

          <article className="detail-panel">
            <h2>Recent Coachee Evaluations</h2>
            <div className="debates-list-grid">
              {overview.coach_data.recent_evaluations?.map((ev, idx) => (
                <div key={idx} className="debate-session-card">
                  <div className="debate-card-main">
                    <strong>{ev.student_name}</strong>
                    <p style={{ fontSize: '0.88rem', color: '#64748b' }}>Debate: {ev.debate_topic}</p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ev.date}</span>
                  </div>
                  <div>
                    <span className="skill-score-pill">{ev.score ? `${ev.score}/100` : 'Pending'}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {/* 3. EDUCATOR DASHBOARD */}
      {!loading && overview?.educator_data && activeTab === 'educator' && (
        <div className="page-stack">
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Class Students</span>
              <strong>{overview.educator_data.total_students}</strong>
              <small>Enrolled class participants</small>
            </div>
            <div className="stat-card">
              <span>Class Debates</span>
              <strong>{overview.educator_data.total_class_debates}</strong>
              <small>Debates recorded</small>
            </div>
            <div className="stat-card">
              <span>Class Presentations</span>
              <strong>{overview.educator_data.total_class_presentations}</strong>
              <small>Speech submissions</small>
            </div>
            <div className="stat-card">
              <span>Class Rubric Average</span>
              <strong>{overview.educator_data.average_class_score != null ? `${overview.educator_data.average_class_score}/100` : '—'}</strong>
              <small>Overall cohort mean</small>
            </div>
          </div>

          <article className="detail-panel">
            <h2>Student Roster & Performance</h2>
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>Student</th>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>Debates</th>
                    <th style={{ padding: '10px' }}>Presentations</th>
                    <th style={{ padding: '10px' }}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.educator_data.student_roster?.map((st) => (
                    <tr key={st.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{st.name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{st.email}</td>
                      <td style={{ padding: '10px' }}>{st.debates_count}</td>
                      <td style={{ padding: '10px' }}>{st.presentations_count}</td>
                      <td style={{ padding: '10px' }}>
                        <span className="skill-score-pill">{st.average_score != null ? `${st.average_score}/100` : '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {/* 4. ADMINISTRATOR DASHBOARD */}
      {!loading && overview?.admin_data && activeTab === 'administrator' && (
        <div className="page-stack">
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Platform Users</span>
              <strong>{overview.admin_data.total_users}</strong>
              <small>All registered accounts</small>
            </div>
            <div className="stat-card">
              <span>Total Debates</span>
              <strong>{overview.admin_data.total_debates}</strong>
              <small>Platform sessions</small>
            </div>
            <div className="stat-card">
              <span>Total Speeches</span>
              <strong>{overview.admin_data.total_presentations}</strong>
              <small>Audio & transcript uploads</small>
            </div>
            <div className="stat-card">
              <span>Active AI Opponents</span>
              <strong>{overview.admin_data.ai_debates_active}</strong>
              <small>Simulated debates</small>
            </div>
          </div>

          {/* Broadcast Announcement Form */}
          <article className="detail-panel">
            <h2>📢 Broadcast Platform Announcement</h2>
            <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <label>
                Title
                <input
                  type="text"
                  required
                  placeholder="e.g. Tournament practice open for all collegiate debaters!"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                />
              </label>
              <label>
                Message
                <textarea
                  rows="2"
                  required
                  placeholder="Details of the announcement broadcasted to all users..."
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                />
              </label>
              {announcementStatus && <p className="success-message">{announcementStatus}</p>}
              <button type="submit" className="button" style={{ alignSelf: 'flex-start' }}>
                Broadcast Alert
              </button>
            </form>
          </article>

          {/* User Management & Role Assignment Table */}
          <article className="detail-panel">
            <h2>User Management & Role Reassignment</h2>
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>ID</th>
                    <th style={{ padding: '10px' }}>Name</th>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>Current Role</th>
                    <th style={{ padding: '10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.admin_data.users?.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>#{u.id}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '10px' }}>
                        <span className={`tag-badge ${u.role}`}>{u.role.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
                        >
                          <option value="learner">Learner</option>
                          <option value="debate_coach">Debate Coach</option>
                          <option value="educator">Educator</option>
                          <option value="administrator">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </section>
  )
}
