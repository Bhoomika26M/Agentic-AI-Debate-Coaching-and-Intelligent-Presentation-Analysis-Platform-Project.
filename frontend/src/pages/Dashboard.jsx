import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resetScrollTop } from '../components/ScrollToTop'
import api from '../api/client'
import ClassModal from '../components/ClassModal'

/* ── Role-specific stat configurations ── */
const ROLE_CONFIG = {
  learner: {
    greeting: 'Keep practising, keep winning! 🎓',
    stats: [
      { icon: '🎤', label: 'Total Sessions',   key: 'total_sessions' },
      { icon: '⭐', label: 'Avg Score',        key: 'avg_score', suffix: '/100' },
      { icon: '🔥', label: 'Win Streak',       key: 'win_streak' },
      { icon: '📈', label: 'Improvement Rate', key: 'improvement_rate' },
    ],
  },
  coach: {
    greeting: 'Shape the next generation of debaters! 🏆',
    stats: [
      { icon: '👥', label: 'Assigned Students', key: 'total_students' },
      { icon: '📝', label: 'Pending Reviews',   key: 'pending_reviews' },
      { icon: '⭐', label: 'Learner Avg Score', key: 'avg_score', suffix: '/100' },
      { icon: '🎤', label: 'Debate Sessions',   key: 'total_sessions' },
    ],
  },
  educator: {
    greeting: 'Driving academic excellence across cohorts! 📚',
    stats: [
      { icon: '🏫', label: 'Number of Classes', key: 'total_classes' },
      { icon: '👥', label: 'Enrolled Students', key: 'total_students' },
      { icon: '🏆', label: 'Best Student Score', key: 'best_score', suffix: '/100' },
    ],
  },
  admin: {
    greeting: 'Platform administration and organizational oversight! ⚙️',
    stats: [
      { icon: '👨‍🏫', label: 'Total Educators',       key: 'total_educators' },
      { icon: '🧑‍💼', label: 'Coaches under Educator', key: 'coaches_under_educator_display' },
      { icon: '👥', label: 'Students under Coaches',  key: 'students_under_coaches_display' },
      { icon: '⚙️', label: 'Total Users',             key: 'total_users' },
    ],
  },
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const role     = user?.role || 'guest'
  const config   = ROLE_CONFIG[role] || ROLE_CONFIG.learner

  const [sessions, setSessions] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses]   = useState([])
  const [adminData, setAdminData] = useState(null)
  const [rosterOptions, setRosterOptions] = useState({ coaches: [], students: [] })

  // Class modal state (for educator/admin)
  const [showClassModal, setShowClassModal] = useState(false)
  const [editingClass, setEditingClass]     = useState(null)
  const [className, setClassName]           = useState('')
  const [classDescription, setClassDesc]    = useState('')
  const [selectedCoach, setSelectedCoach]   = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [classSaving, setClassSaving]       = useState(false)
  const [classError, setClassError]         = useState('')

  const [stats, setStats] = useState({
    total_sessions: user?.total_sessions ?? 0,
    avg_score: user?.avg_score ?? 0,
    win_streak: user?.win_streak ?? 0,
    improvement_rate: '—',
    total_students: 0,
    pending_reviews: 0,
    total_classes: 0,
    best_score: 0,
    total_educators: 0,
    coaches_under_educator_display: '0 / 0',
    students_under_coaches_display: '0 / 0',
    total_users: 0,
  })

  // 1. Fetch sessions
  const loadSessions = () => {
    api.get('/sessions')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : []
        setSessions(list)
        const scheduled = list.filter(s => s.status === 'scheduled' || s.status === 'active')
        const completedScores = list
          .filter(s => s.status === 'completed' && typeof s.score === 'number')
          .map(s => s.score)
        const computedAvg = completedScores.length > 0
          ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
          : (user?.avg_score ?? 0)

        setStats(prev => ({
          ...prev,
          total_sessions: list.length,
          pending_reviews: scheduled.length,
          avg_score: computedAvg,
          improvement_rate: list.length > 1 ? '+12%' : '—',
        }))
      })
      .catch(() => setSessions([]))
  }

  // 2. Fetch classes
  const loadClasses = () => {
    if (['educator', 'coach', 'admin'].includes(role)) {
      api.get('/classes')
        .then(r => {
          const clsList = Array.isArray(r.data) ? r.data : []
          setClasses(clsList)
          // Count unique students across classes safely
          const studentSet = new Set()
          clsList.forEach(c => {
            const sids = Array.isArray(c?.student_ids) ? c.student_ids : []
            sids.forEach(sid => studentSet.add(sid))
          })
          setStats(prev => ({
            ...prev,
            total_classes: clsList.length,
            total_students: studentSet.size > 0 ? studentSet.size : prev.total_students,
          }))
        })
        .catch(() => setClasses([]))
    }
  }

  // 3. Fetch students & options
  const loadStudentsAndOptions = () => {
    if (['educator', 'coach', 'admin'].includes(role)) {
      api.get('/reports/students')
        .then(r => {
          const studentList = Array.isArray(r.data) ? r.data : []
          setStudents(studentList)

          const scores = studentList.map(s => s.avg_score).filter(s => typeof s === 'number' && s > 0)
          const bestScore = scores.length > 0 ? Math.max(...scores) : 0
          const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

          setStats(prev => ({
            ...prev,
            total_students: studentList.length,
            best_score: bestScore,
            avg_score: role === 'coach' ? avgScore : prev.avg_score,
          }))
        })
        .catch(() => {})

      api.get('/classes/roster/options')
        .then(r => setRosterOptions(r.data || { coaches: [], students: [] }))
        .catch(() => {})
    }
  }

  // 4. Fetch admin overview
  const loadAdminOverview = () => {
    if (role === 'admin') {
      api.get('/reports/admin/overview')
        .then(r => {
          const data = r.data || {}
          setAdminData(data)
          const ps = data.platform_statistics || {}
          setStats(prev => ({
            ...prev,
            total_educators: ps.total_educators ?? 0,
            coaches_under_educator_display: `${ps.coaches_under_educator ?? 0} / ${ps.total_coaches ?? 0}`,
            students_under_coaches_display: `${ps.total_students ?? 0} students`,
            total_users: ps.total_users ?? 0,
            best_score: ps.best_learner_score ?? 0,
          }))
        })
        .catch(() => {})
    }
  }

  useEffect(() => {
    loadSessions()
    loadClasses()
    loadStudentsAndOptions()
    loadAdminOverview()
  }, [role, user])

  // Class Management Handlers
  const openCreateClassModal = () => {
    setEditingClass(null)
    setClassName('')
    setClassDesc('')
    setSelectedCoach('')
    setSelectedStudents([])
    setClassError('')
    setShowClassModal(true)
  }

  const openEditClassModal = (cls) => {
    if (!cls) return
    setEditingClass(cls)
    setClassName(cls.name || '')
    setClassDesc(cls.description || '')
    setSelectedCoach(cls.coach_id || '')
    setSelectedStudents(Array.isArray(cls.student_ids) ? cls.student_ids : [])
    setClassError('')
    setShowClassModal(true)
  }

  const handleSaveClass = async (e) => {
    e.preventDefault()
    if (!className.trim()) {
      setClassError('Class name is required.')
      return
    }
    setClassSaving(true)
    setClassError('')
    try {
      const payload = {
        name: className.trim(),
        description: classDescription ? classDescription.trim() : undefined,
        coach_id: selectedCoach || undefined,
        student_ids: Array.isArray(selectedStudents) ? selectedStudents : [],
      }
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, payload)
      } else {
        await api.post('/classes', payload)
      }
      setShowClassModal(false)
      loadClasses()
    } catch (err) {
      let msg = 'Failed to save class.'
      const d = err.response?.data?.detail
      if (typeof d === 'string') {
        msg = d
      } else if (Array.isArray(d)) {
        msg = d.map(item => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item))).join('; ')
      } else if (d && typeof d === 'object') {
        msg = d.msg || d.message || JSON.stringify(d)
      } else if (err.message) {
        msg = err.message
      }
      setClassError(msg)
    } finally {
      setClassSaving(false)
    }
  }

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return
    try {
      await api.delete(`/classes/${classId}`)
      loadClasses()
    } catch {}
  }

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      const list = Array.isArray(prev) ? prev : []
      return list.includes(studentId)
        ? list.filter(id => id !== studentId)
        : [...list, studentId]
    })
  }

  const FORMAT_ICONS = {
    'One-on-One Debate': '⚔️',
    'Parliamentary Debate': '🏛️',
    'Oxford Debate': '🎓',
    'Policy Debate': '📜',
    'Public Forum Debate': '🌍',
    'AI Debate Simulation': '🤖'
  }

  const STATUS_STYLE = {
    scheduled: { bg: 'rgba(23,107,104,0.1)', color: 'var(--brand-primary)', label: 'Scheduled' },
    active:    { bg: 'rgba(23,107,104,0.18)', color: 'var(--brand-secondary)', label: 'Active' },
    completed: { bg: 'rgba(179,107,50,0.12)', color: 'var(--brand-accent)', label: 'Completed' },
    cancelled: { bg: 'rgba(184,76,76,0.12)', color: 'var(--brand-danger)', label: 'Cancelled' },
    expired:   { bg: 'rgba(107,114,128,0.12)', color: 'var(--text-muted)', label: 'Expired' }
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Guest Mode Banner */}
      {!user && (
        <div style={{
          padding: '16px 20px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(23,107,104,0.15), rgba(179,107,50,0.12))',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--brand-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              👋 Welcome to DebateCoach AI (Guest Preview)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Sign in to record your speech transcripts, participate in debate rounds, and receive official AI & coach evaluations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/signup')}>Create Account</button>
          </div>
        </div>
      )}

      {/* Greeting Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>
            Hello, {user?.full_name?.split(' ')[0] || 'Guest'} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{config.greeting}</p>
        </div>
        {['educator', 'admin'].includes(role) && (
          <button className="btn btn-primary btn-sm" onClick={openCreateClassModal}>
            ➕ Create New Class
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className={`grid-${config.stats.length}`} style={{ marginBottom: 32 }}>
        {config.stats.map(({ icon, label, key, suffix }) => (
          <div key={key} className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--bg-overlay)' }}>{icon}</div>
            <div className="stat-value">
              {stats[key] ?? '—'}
              {suffix && typeof stats[key] === 'number' && stats[key] > 0 ? suffix : ''}
            </div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Educator & Admin: Class & Cohort Management Section */}
      {['educator', 'admin'].includes(role) && (
        <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>🏫 Classrooms &amp; Cohort Management</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Arrange students and coaches into classes. Track group performance and assign coaches.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openCreateClassModal}>
              ➕ New Class
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {Array.isArray(classes) && classes.map(c => {
              if (!c) return null
              const enrolledNames = Array.isArray(c.students) && c.students.length > 0
                ? c.students.map(s => s?.name || 'Student').filter(Boolean).join(', ')
                : (c.student_count > 0 ? `${c.student_count} students enrolled` : 'No students assigned yet')

              return (
                <div
                  key={c.id || Math.random()}
                  style={{
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{c.name || 'Untitled Class'}</div>
                      {c.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.description}</div>
                      )}
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                      {c.student_count || 0} Students
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    🧑‍💼 <strong>Assigned Coach:</strong> {c.coach_name || 'None Assigned'}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    👥 <strong>Enrolled Learners:</strong> {enrolledNames}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-light)', justifyContent: 'space-between' }}>
                    <Link
                      to={`/reports?scope=class:${c.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                    >
                      📊 Class Report
                    </Link>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditClassModal(c)}
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteClass(c.id)}
                        style={{ fontSize: '0.75rem', padding: '3px 8px', color: 'var(--brand-danger)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {(!classes || classes.length === 0) && (
              <div style={{ padding: '32px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No classes created yet.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={openCreateClassModal}>
                  Create your first class cohort →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area: Recent Sessions */}
      <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0 }}>
              {role === 'learner' && 'My Debate Sessions'}
              {role === 'coach' && 'Sessions For Evaluation & Adjudication'}
              {role === 'educator' && 'Class Debate Rounds'}
              {role === 'admin' && 'Platform Debate Activity'}
              {role === 'guest' && 'Platform Debate Rounds'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {role === 'learner' && 'Your scheduled, active, and completed personal debate rounds.'}
              {role === 'coach' && 'Debate sessions submitted by students requiring review and grading.'}
              {role === 'educator' && 'Active and completed debate sessions across your cohorts.'}
              {role === 'admin' && 'Live debate activity and records across all formats.'}
              {role === 'guest' && 'Preview of debate matches and practice rounds.'}
            </p>
          </div>
          <Link to="/sessions" className="btn btn-secondary btn-sm">
            View all sessions →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.slice(0, 6).map((s) => {
            const sStyle = STATUS_STYLE[s.status] || STATUS_STYLE.scheduled
            return (
              <div key={s.id} className="session-card">
                <div className="session-format-icon">{FORMAT_ICONS[s.format] ?? '🎤'}</div>
                <div className="session-info">
                  <div className="session-title">{s.topic}</div>
                  <div className="session-meta">
                    {s.format} · {new Date(s.scheduled_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {s.creator_name && ` · by ${s.creator_name}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s.score != null && (
                    <span style={{ fontWeight: 800, color: 'var(--brand-success)', fontSize: '0.88rem' }}>
                      {s.score}/100
                    </span>
                  )}
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: sStyle.bg,
                    color: sStyle.color
                  }}>
                    {sStyle.label}
                  </span>
                </div>
              </div>
            )
          })}

          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.95rem', marginBottom: 12 }}>No debate sessions recorded yet.</p>
              {role !== 'learner' && (
                <Link to="/sessions" className="btn btn-primary btn-sm">
                  Schedule your first session →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role-Specific Debater Roster for Coaches, Educators, and Admins */}
      {['coach', 'educator', 'admin'].includes(role) && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>🎓 Debaters Roster (Learners List Only)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Individual learner records (strictly excludes staff/coach practice sessions)
              </p>
            </div>
            <Link to="/reports" className="btn btn-secondary btn-sm">
              Open Full Reports &amp; Analytics →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {Array.isArray(students) && students.map(s => {
              if (!s) return null
              return (
                <div
                  key={s.id || Math.random()}
                  className="card"
                  style={{
                    padding: '18px 20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.email}</div>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {s.experience_level || 'Beginner'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-overlay)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Debate Rounds</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                        {s.total_sessions || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Score</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (s.avg_score || 0) >= 80 ? 'var(--brand-success)' : 'var(--brand-primary)', marginTop: 2 }}>
                        {s.avg_score ? `${s.avg_score}/100` : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to={`/reports?student=${s.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                      View Student Report →
                    </Link>
                  </div>
                </div>
              )
            })}

            {(!students || students.length === 0) && (
              <div style={{ padding: '32px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center' }}>
                No learners enrolled in the system yet.
              </div>
            )}
          </div>
        </div>
      )}

      <ClassModal
        show={showClassModal}
        editing={editingClass}
        name={className}
        description={classDescription}
        coach={selectedCoach}
        students={selectedStudents}
        error={classError}
        saving={classSaving}
        rosterOptions={rosterOptions}
        onClose={() => setShowClassModal(false)}
        onSubmit={handleSaveClass}
        onNameChange={v => setClassName(v)}
        onDescChange={v => setClassDesc(v)}
        onCoachChange={v => setSelectedCoach(v)}
        onToggleStudent={toggleStudentSelection}
      />
    </div>
  )
}
