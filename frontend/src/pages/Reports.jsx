import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { resetScrollTop } from '../components/ScrollToTop'
import api from '../api/client'

export default function Reports() {
  const { user } = useAuth()
  const role = user?.role || 'learner'
  const isStaff = ['coach', 'educator', 'admin'].includes(role)
  const canExport = true // All users can export and download their personal or cohort reports
  const isAdmin = role === 'admin'

  const urlParams = new URLSearchParams(window.location.search)
  const initialScope = urlParams.get('student') || urlParams.get('scope') || ''

  const [scopesData, setScopesData]           = useState(null)
  const [selectedScope, setSelectedScope]     = useState(initialScope)

  const [performance, setPerformance]       = useState(null)
  const [debateReport, setDebateReport]     = useState(null)
  const [presReport, setPresReport]         = useState(null)
  const [coachingReport, setCoachingReport] = useState(null)
  const [learnReport, setLearnReport]       = useState(null)
  const [sessions, setSessions]             = useState(null)
  const [adminData, setAdminData]           = useState(null)

  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('performance')
  const [error, setError]         = useState('')
  const [exporting, setExporting] = useState('')

  useEffect(() => {
    if (isStaff) {
      api.get('/reports/scopes')
        .then(r => setScopesData(r.data))
        .catch(() => {})
    }
    loadAll(selectedScope)
  }, [role])

  const loadAll = async (scopeId = '') => {
    setLoading(true)
    setError('')
    try {
      const params = scopeId ? { student_id: scopeId } : {}
      const [perfRes, debRes, presRes, coachRes, learnRes, sesRes] = await Promise.all([
        api.get('/reports/performance', { params }).catch(() => ({ data: null })),
        api.get('/reports/debate', { params }).catch(() => ({ data: null })),
        api.get('/reports/presentation', { params }).catch(() => ({ data: null })),
        api.get('/reports/coaching', { params }).catch(() => ({ data: null })),
        api.get('/reports/learning-progress', { params }).catch(() => ({ data: null })),
        api.get('/reports/sessions/summary', { params }).catch(() => ({ data: null })),
      ])

      setPerformance(perfRes.data)
      setDebateReport(debRes.data)
      setPresReport(presRes.data)
      setCoachingReport(coachRes.data)
      setLearnReport(learnRes.data)
      setSessions(sesRes.data)

      if (isAdmin) {
        try {
          const adminRes = await api.get('/reports/admin/overview')
          setAdminData(adminRes.data)
        } catch {}
      }
    } catch (err) {
      setError('Failed to load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleScopeChange = (e) => {
    const scopeId = e.target.value
    setSelectedScope(scopeId)
    loadAll(scopeId)
  }

  const handleExport = async (format) => {
    setExporting(format)
    setError('')
    try {
      const endpoint = format === 'pdf' ? '/reports/export/pdf' : (format === 'excel' ? '/reports/export/excel' : '/reports/export/csv')
      const ext = format === 'pdf' ? 'pdf' : (format === 'excel' ? 'xlsx' : 'csv')
      const cleanScopeName = (selectedScope || 'report').replace(':', '_')
      const filename = `debate_report_${cleanScopeName}.${ext}`

      const res = await api.get(endpoint, {
        params: selectedScope ? { student_id: selectedScope } : {},
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError(`Failed to export ${format.toUpperCase()}. Please try again.`)
    } finally {
      setExporting('')
    }
  }

  const trendColor = (trend) => {
    if (trend === 'Improving') return '#10b981'
    if (trend === 'Declining') return '#ef4444'
    return '#f59e0b'
  }

  const trendIcon = (trend) => {
    if (trend === 'Improving') return '📈'
    if (trend === 'Declining') return '📉'
    return '➡️'
  }

  const scoreColor = (score) => {
    if (!score) return '#6b7280'
    if (score >= 80) return '#10b981'
    if (score >= 65) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header with Export Action Toolbar */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">📊 Reports &amp; Analytics</h1>
          <p className="page-subtitle">
            {role === 'learner' && 'Your personal debate performance scores, AI delivery feedback, and exportable records.'}
            {role === 'coach' && 'Student evaluation trajectories, coaching insights, and downloadable reports.'}
            {role === 'educator' && 'Academic cohort analytics, class groups, coach groups, and official report exports.'}
            {role === 'admin' && 'Comprehensive organizational reports, student analytics, and platform oversight.'}
          </p>
        </div>
        {canExport && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? '⏳ Generating...' : '📄 Export PDF'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('excel')} disabled={!!exporting}>
              {exporting === 'excel' ? '⏳ Generating...' : '📊 Export Excel'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!!exporting}>
              {exporting === 'csv' ? '⏳ Exporting...' : '📥 Export CSV'}
            </button>
          </div>
        )}
      </div>

      {/* Staff Group / Student / Personal Selector */}
      {isStaff && (
        <div style={{
          marginBottom: 20,
          background: 'var(--bg-surface)',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.25rem' }}>🎯</span>
            <label htmlFor="scope-select" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              Active Report Scope:
            </label>
            <select
              id="scope-select"
              className="input"
              style={{ width: 'auto', minWidth: 320, padding: '7px 14px', fontSize: '0.88rem' }}
              value={selectedScope}
              onChange={handleScopeChange}
            >
              <option value="">👥 All Debater Students (Cohort Overview)</option>
              <option value="personal">⭐ My Personal Report (Self-Improvement)</option>

              {scopesData?.classes?.length > 0 && (
                <optgroup label="🏫 Class Cohorts (Learners Groups)">
                  {scopesData.classes.map(c => (
                    <option key={c.id} value={c.id}>
                      Class: {c.name} ({c.student_count} Students)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="🏆 Coaching Staff">
                <option value="coaches">Coaches Group (Activities &amp; Records)</option>
              </optgroup>

              {scopesData?.students?.length > 0 && (
                <optgroup label="🎓 Individual Debater Students">
                  {scopesData.students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Avg: {s.avg_score || 0} pts
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {selectedScope && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedScope('')
                loadAll('')
              }}
              style={{ fontSize: '0.8rem' }}
            >
              ↩ Reset to Cohort Overview
            </button>
          )}
        </div>
      )}

      {/* Scope Context & Data Isolation Notice */}
      <div style={{
        marginBottom: 20,
        padding: '10px 16px',
        background: 'var(--bg-overlay)',
        borderLeft: '4px solid var(--brand-primary)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.84rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span>💡</span>
        <div>
          {!selectedScope && (
            <span>
              <strong>Cohort Analytics Active:</strong> Aggregating debater learners only. Coach and Educator self-practice progress is strictly excluded from cohort metrics.
            </span>
          )}
          {selectedScope === 'personal' && (
            <span>
              <strong>Personal Self-Improvement Report:</strong> Showing your personal debate rounds. This record is not added into the student cohort averages.
            </span>
          )}
          {selectedScope === 'coaches' && (
            <span>
              <strong>Coaches Group Report:</strong> Showing performance and practice activities across the coaching team.
            </span>
          )}
          {selectedScope.startsWith('class:') && (
            <span>
              <strong>Class Cohort Report:</strong> Performance analytics strictly for learners enrolled in this class.
            </span>
          )}
          {selectedScope && !['personal', 'coaches'].includes(selectedScope) && !selectedScope.startsWith('class:') && (
            <span>
              <strong>Individual Debater Record:</strong> Detailed performance drilldown for this specific debater.
            </span>
          )}
        </div>
      </div>

      {/* Individual Debater Scorecard Banner */}
      {performance?.is_individual && (
        <div style={{
          marginBottom: 24,
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(23,107,104,0.12), rgba(108,99,255,0.08))',
          border: '1px solid rgba(23,107,104,0.3)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              👤 Profile &amp; Evaluation Scorecard
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {performance.user?.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Scope: <strong style={{ textTransform: 'capitalize' }}>{performance.scope_type || performance.user?.role}</strong> · Member Since: {performance.user?.member_since ? new Date(performance.user.member_since).toLocaleDateString() : 'Active Member'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SCORE AVERAGE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: scoreColor(performance.score_statistics?.average) }}>
                {performance.score_statistics?.average || 0}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>EVALUATED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {performance.session_statistics?.completed}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRAJECTORY</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: trendColor(performance.score_statistics?.improvement_trend), marginTop: 4 }}>
                {trendIcon(performance.score_statistics?.improvement_trend)} {performance.score_statistics?.improvement_trend}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Tab Navigation */}
      <div className="tab-bar" style={{ overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 24 }}>
        <button className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => { setActiveTab('performance'); resetScrollTop(); }}>
          📈 Performance
        </button>
        <button className={`tab-btn ${activeTab === 'debate' ? 'active' : ''}`} onClick={() => { setActiveTab('debate'); resetScrollTop(); }}>
          🏛️ Debate Reports
        </button>
        <button className={`tab-btn ${activeTab === 'presentation' ? 'active' : ''}`} onClick={() => { setActiveTab('presentation'); resetScrollTop(); }}>
          🎙️ Presentation
        </button>
        <button className={`tab-btn ${activeTab === 'coaching' ? 'active' : ''}`} onClick={() => { setActiveTab('coaching'); resetScrollTop(); }}>
          🏆 Coaching
        </button>
        <button className={`tab-btn ${activeTab === 'learning' ? 'active' : ''}`} onClick={() => { setActiveTab('learning'); resetScrollTop(); }}>
          🗺️ Learning Progress
        </button>
        <button className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => { setActiveTab('sessions'); resetScrollTop(); }}>
          📋 Sessions Records
        </button>
        {isAdmin && adminData && (
          <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => { setActiveTab('admin'); resetScrollTop(); }}>
            🛡️ Admin Telemetry
          </button>
        )}
      </div>

      {/* ── 1. Performance Tab ── */}
      {activeTab === 'performance' && performance && (
        <div>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-value">{performance.session_statistics?.total}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{performance.session_statistics?.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-value" style={{ color: scoreColor(performance.score_statistics?.average) }}>
                {performance.score_statistics?.average || '0'}
              </div>
              <div className="stat-label">Avg Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-value" style={{ color: '#10b981' }}>
                {performance.score_statistics?.highest || '0'}
              </div>
              <div className="stat-label">Best Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">{trendIcon(performance.score_statistics?.improvement_trend)}</div>
              <div className="stat-value" style={{ color: trendColor(performance.score_statistics?.improvement_trend), fontSize: '1.1rem' }}>
                {performance.score_statistics?.improvement_trend}
              </div>
              <div className="stat-label">Trend</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
            {/* Score Trend */}
            <div className="card">
              <h3 className="card-title">📈 Recent Debate Performance Trajectory</h3>
              {performance.score_trend?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {performance.score_trend.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.session}</span>
                      <span className="badge" style={{ background: 'rgba(23,107,104,0.15)', color: 'var(--brand-primary)', fontWeight: 800 }}>
                        {s.score}/100
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>No evaluated rounds yet.</div>
              )}
            </div>

            {/* Debate Formats Breakdown */}
            <div className="card">
              <h3 className="card-title">🏛️ Debate Formats Conducted</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {Object.entries(performance.format_distribution || {}).map(([fmt, count]) => (
                  <div key={fmt} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmt}</span>
                    <span className="badge badge-secondary">{count} rounds</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Debate Reports Tab ── */}
      {activeTab === 'debate' && debateReport && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title">🏛️ Mastery by Debate Format</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
              {debateReport.format_breakdown?.map((f, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{f.format}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span>Total Rounds: <strong>{f.total_sessions}</strong></span>
                    <span>Completed: <strong>{f.completed_sessions}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span className="badge badge-primary">{f.mastery_level}</span>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: scoreColor(f.average_score) }}>
                      {f.average_score} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>avg</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">📝 Recent Debate Records &amp; Feedback</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {debateReport.recent_debates?.map(d => (
                <div key={d.id} style={{ padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{d.topic}</span>
                    {d.score != null && <span className="badge badge-success">Score: {d.score}/100</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {d.format} · {d.position || 'Proposition'} · {d.date ? new Date(d.date).toLocaleDateString() : 'Recent'}
                  </div>
                  {d.feedback && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: 4 }}>
                      "{d.feedback}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Presentation Assessment Tab ── */}
      {activeTab === 'presentation' && presReport && (
        <div>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">🎙️</div>
              <div className="stat-value">{presReport.total_presentations_analyzed}</div>
              <div className="stat-label">Speeches Analyzed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-value">{presReport.metrics_summary?.average_presentation_score}</div>
              <div className="stat-label">Delivery Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-value">{presReport.metrics_summary?.average_wpm}</div>
              <div className="stat-label">Average Pace (WPM)</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{presReport.metrics_summary?.average_filler_rate_percent}%</div>
              <div className="stat-label">Filler Rate</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h3 className="card-title">💡 Executive Delivery Takeaways</h3>
            <ul style={{ paddingLeft: 20, marginTop: 10, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {presReport.coaching_takeaways?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── 4. Coaching Tab ── */}
      {activeTab === 'coaching' && coachingReport && (
        <div className="card">
          <h3 className="card-title">🏆 Demonstrated Strengths &amp; Targeted Drills</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
            <div>
              <h4 style={{ color: '#10b981', marginBottom: 10 }}>Demonstrated Strengths</h4>
              {coachingReport.top_strengths?.map((s, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                  ✅ <strong>{s}</strong>
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ color: '#f59e0b', marginBottom: 10 }}>Priority Focus Areas</h4>
              {coachingReport.priority_focus_areas?.map((g, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                  🎯 <strong>{g}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Learning Progress Tab ── */}
      {activeTab === 'learning' && learnReport && (
        <div className="card">
          <h3 className="card-title">🗺️ 4-Week Debate Learning Milestones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {learnReport.milestones?.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Milestone {m.milestone || i + 1} (Week {m.week || i + 1}): {m.title}</span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Criteria: {m.criteria}</div>
                </div>
                <span className={`badge badge-${m.completed ? 'success' : 'secondary'}`}>
                  {m.completed ? '✅ Completed' : 'In Progress'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Sessions Tab ── */}
      {activeTab === 'sessions' && sessions && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{sessions.total_records} debate rounds in this scope</span>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!!exporting}>
              📥 Export CSV
            </button>
          </div>
          <div style={{ overflowX: 'auto', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-overlay)' }}>
                  <th style={{ padding: '12px 16px' }}>Topic</th>
                  <th style={{ padding: '12px 16px' }}>Format</th>
                  <th style={{ padding: '12px 16px' }}>Position</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Score</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.sessions?.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.topic}</td>
                    <td style={{ padding: '12px 16px' }}>{s.format}</td>
                    <td style={{ padding: '12px 16px' }}>{s.position || 'Proposition'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-${s.status === 'completed' ? 'warning' : s.status === 'expired' ? 'secondary' : 'primary'}`}>
                        {s.status === 'completed' ? '🔒 Completed' : s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: scoreColor(s.score) }}>
                      {s.score != null ? `${s.score}/100` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {sessions.sessions?.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No sessions found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 7. Admin Overview Tab ── */}
      {activeTab === 'admin' && isAdmin && adminData && (
        <div>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-value">{adminData.platform_statistics?.total_educators}</div>
              <div className="stat-label">Total Educators</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🧑‍💼</div>
              <div className="stat-value">{adminData.platform_statistics?.total_coaches}</div>
              <div className="stat-label">Total Coaches</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{adminData.platform_statistics?.total_students}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏫</div>
              <div className="stat-value">{adminData.platform_statistics?.total_classes}</div>
              <div className="stat-label">Total Classes</div>
            </div>
          </div>

          {/* Coach-Student Breakdown */}
          {adminData.coach_student_breakdown?.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h3 className="card-title">🧑‍💼 Coaches &amp; Students Under Classes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 12 }}>
                {adminData.coach_student_breakdown.map((cs, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🧑‍💼 {cs.coach_name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--brand-primary)', fontWeight: 600, marginTop: 4 }}>
                      Total Students: {cs.total_students}
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Classes: {cs.classes?.map(c => `${c.class_name} (${c.students} sts)`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Users Directory */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3 className="card-title">⚙️ Platform User Directory &amp; Roles</h3>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-overlay)' }}>
                    <th style={{ padding: '10px 14px' }}>Name</th>
                    <th style={{ padding: '10px 14px' }}>Email</th>
                    <th style={{ padding: '10px 14px' }}>Role</th>
                    <th style={{ padding: '10px 14px' }}>Sessions</th>
                    <th style={{ padding: '10px 14px' }}>Avg Score</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users?.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{u.total_sessions}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{u.avg_score ? `${u.avg_score}/100` : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: u.is_active ? 'var(--brand-success)' : 'var(--brand-danger)', fontWeight: 600 }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
