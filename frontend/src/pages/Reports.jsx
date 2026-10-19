import { useState, useEffect } from 'react'
import api from '../api/client'

export default function Reports() {
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

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [perfRes, debRes, presRes, coachRes, learnRes, sesRes] = await Promise.all([
        api.get('/reports/performance').catch(() => ({ data: null })),
        api.get('/reports/debate').catch(() => ({ data: null })),
        api.get('/reports/presentation').catch(() => ({ data: null })),
        api.get('/reports/coaching').catch(() => ({ data: null })),
        api.get('/reports/learning-progress').catch(() => ({ data: null })),
        api.get('/reports/sessions/summary').catch(() => ({ data: null })),
      ])

      setPerformance(perfRes.data)
      setDebateReport(debRes.data)
      setPresReport(presRes.data)
      setCoachingReport(coachRes.data)
      setLearnReport(learnRes.data)
      setSessions(sesRes.data)

      try {
        const adminRes = await api.get('/reports/admin/overview')
        setAdminData(adminRes.data)
      } catch {}
    } catch (err) {
      setError('Failed to load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    setExporting(format)
    setError('')
    try {
      const endpoint = format === 'pdf' ? '/reports/export/pdf' : (format === 'excel' ? '/reports/export/excel' : '/reports/export/csv')
      const ext = format === 'pdf' ? 'pdf' : (format === 'excel' ? 'xlsx' : 'csv')
      const filename = `debate_intelligence_report.${ext}`

      const res = await api.get(endpoint, { responseType: 'blob' })
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

  const statusColor = (status) => {
    if (status === 'completed') return '#10b981'
    if (status === 'in_progress') return '#f59e0b'
    return '#6366f1'
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
            <h1 className="page-title">📊 Reports & Export System</h1>
            <p className="page-subtitle">
              Comprehensive debate analytics, presentation assessments, and multi-format exports
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
            >
              {exporting === 'pdf' ? '⏳ Generating...' : '📄 Export PDF'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('excel')}
              disabled={!!exporting}
            >
              {exporting === 'excel' ? '⏳ Generating...' : '📊 Export Excel'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('csv')}
              disabled={!!exporting}
            >
              {exporting === 'csv' ? '⏳ Exporting...' : '📥 Export CSV'}
            </button>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Tab Navigation */}
        <div className="tab-bar" style={{ overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 24 }}>
          <button className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
            📈 Performance
          </button>
          <button className={`tab-btn ${activeTab === 'debate' ? 'active' : ''}`} onClick={() => setActiveTab('debate')}>
            🏛️ Debate Reports
          </button>
          <button className={`tab-btn ${activeTab === 'presentation' ? 'active' : ''}`} onClick={() => setActiveTab('presentation')}>
            🎤 Presentation
          </button>
          <button className={`tab-btn ${activeTab === 'coaching' ? 'active' : ''}`} onClick={() => setActiveTab('coaching')}>
            🏆 Coaching
          </button>
          <button className={`tab-btn ${activeTab === 'learning' ? 'active' : ''}`} onClick={() => setActiveTab('learning')}>
            🗺️ Learning Progress
          </button>
          <button className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            📋 Sessions
          </button>
          {adminData && (
            <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
              🛡️ Admin Overview
            </button>
          )}
        </div>

        {/* ── 1. Performance Tab ── */}
        {activeTab === 'performance' && performance && (
          <div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">🗓️</div>
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
                  {performance.score_statistics?.average || 'N/A'}
                </div>
                <div className="stat-label">Avg Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-value" style={{ color: '#10b981' }}>
                  {performance.score_statistics?.highest || 'N/A'}
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
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{performance.session_statistics?.completion_rate}%</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </div>

            {/* Score trend chart */}
            {performance.score_trend?.length > 0 && (
              <div className="card">
                <h3 className="card-title">📈 Score Progression (Last 10 Sessions)</h3>
                <div className="bar-chart">
                  {performance.score_trend.map((item, i) => (
                    <div key={i} className="bar-chart-col">
                      <div className="bar-chart-value">{item.score}</div>
                      <div
                        className="bar-chart-bar"
                        style={{ height: `${item.score}%`, background: scoreColor(item.score) }}
                        title={`${item.session}: ${item.score}`}
                      />
                      <div className="bar-chart-label">{item.session?.substring(0, 10) || `S${i + 1}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill averages */}
            {Object.keys(performance.skill_averages || {}).length > 0 && (
              <div className="card">
                <h3 className="card-title">🎯 Average Skill Rubric Breakdown</h3>
                <div className="score-bars">
                  {Object.entries(performance.skill_averages).map(([key, val]) => (
                    <div key={key} className="score-bar-row">
                      <div className="score-bar-label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{ width: `${val}%`, background: scoreColor(val) }} />
                      </div>
                      <div className="score-bar-value" style={{ color: scoreColor(val) }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. Debate Reports Tab ── */}
        {activeTab === 'debate' && debateReport && (
          <div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">🏛️</div>
                <div className="stat-value">{debateReport.total_debates}</div>
                <div className="stat-label">Total Debates</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-value" style={{ color: '#f59e0b' }}>{debateReport.current_win_streak}</div>
                <div className="stat-label">Win Streak</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{debateReport.completed_debates}</div>
                <div className="stat-label">Evaluated</div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">🎭 Performance by Debate Format</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {debateReport.format_breakdown?.map(f => (
                  <div key={f.format} style={{
                    padding: 16,
                    background: 'var(--bg-overlay)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{f.format}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sessions:</span>
                      <strong>{f.completed_sessions} / {f.total_sessions}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Average Score:</span>
                      <strong style={{ color: scoreColor(f.average_score) }}>{f.average_score || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Mastery:</span>
                      <span className="badge badge-primary">{f.mastery_level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Presentation Reports Tab ── */}
        {activeTab === 'presentation' && presReport && (
          <div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">🎤</div>
                <div className="stat-value">{presReport.total_presentations_analyzed}</div>
                <div className="stat-label">Speeches Analyzed</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-value" style={{ color: scoreColor(presReport.metrics_summary?.average_presentation_score) }}>
                  {presReport.metrics_summary?.average_presentation_score}
                </div>
                <div className="stat-label">Delivery Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">{presReport.metrics_summary?.average_wpm}</div>
                <div className="stat-label">Pacing (WPM)</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-value" style={{ color: presReport.metrics_summary?.average_filler_rate_percent < 2.5 ? '#10b981' : '#f59e0b' }}>
                  {presReport.metrics_summary?.average_filler_rate_percent}%
                </div>
                <div className="stat-label">Filler Rate</div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">💡 Speech Delivery Insights</h3>
              <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {presReport.coaching_takeaways?.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── 4. Coaching Reports Tab ── */}
        {activeTab === 'coaching' && coachingReport && (
          <div>
            <div className="card">
              <h3 className="card-title">🏆 Identified Strengths</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {coachingReport.strengths?.map(s => (
                  <div key={s.skill} style={{ padding: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>{s.skill}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>Score: {s.score}/100 · {s.status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h3 className="card-title">🎯 Priority Growth Areas & Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {coachingReport.growth_priorities?.map(g => (
                  <div key={g.skill} style={{ padding: 16, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{g.skill}</strong>
                      <span style={{ fontSize: '0.82rem', color: 'var(--brand-secondary)' }}>Current: {g.current_score} / Benchmark: {g.benchmark}</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{g.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 5. Learning Progress Tab ── */}
        {activeTab === 'learning' && learnReport && (
          <div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{learnReport.weekly_target_completion}</div>
                <div className="stat-label">Target Completion</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🚀</div>
                <div className="stat-value" style={{ fontSize: '1.05rem', color: 'var(--brand-primary)' }}>{learnReport.next_milestone}</div>
                <div className="stat-label">Next Target</div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">🏅 Milestones Achieved</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {learnReport.milestones_achieved?.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: '#10b981', fontSize: '1.1rem' }}>✓</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Sessions Tab ── */}
        {activeTab === 'sessions' && sessions && (
          <div>
            <div className="sessions-summary-header">
              <span>{sessions.total} sessions total</span>
              <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!!exporting}>
                📥 Export CSV
              </button>
            </div>
            <div className="sessions-table-wrapper">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Format</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Date</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.sessions?.map((s) => (
                    <tr key={s.id}>
                      <td className="td-topic">{s.topic || '—'}</td>
                      <td><span className="format-badge">{s.format || '—'}</span></td>
                      <td>{s.position || '—'}</td>
                      <td>
                        <span className="status-dot" style={{ background: statusColor(s.status) }} />
                        {s.status}
                      </td>
                      <td>
                        <span style={{ color: scoreColor(s.score), fontWeight: 700 }}>
                          {s.score ?? '—'}
                        </span>
                      </td>
                      <td>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : '—'}</td>
                      <td className="td-feedback">{s.feedback_summary || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 7. Admin Tab ── */}
        {activeTab === 'admin' && adminData && (
          <div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{adminData.platform_statistics?.total_users}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{adminData.platform_statistics?.active_users}</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-value">{adminData.platform_statistics?.total_sessions}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-value" style={{ color: scoreColor(adminData.platform_statistics?.platform_avg_score) }}>
                  {adminData.platform_statistics?.platform_avg_score || 'N/A'}
                </div>
                <div className="stat-label">Platform Avg Score</div>
              </div>
            </div>

            <div className="admin-two-col">
              <div className="card">
                <h3 className="card-title">👥 User Roles</h3>
                {Object.entries(adminData.user_role_distribution || {}).map(([role, count]) => (
                  <div key={role} className="dist-row">
                    <span className="dist-role">{role}</span>
                    <div className="dist-bar-track">
                      <div
                        className="dist-bar-fill"
                        style={{ width: `${(count / adminData.platform_statistics?.total_users) * 100}%`, background: '#6366f1' }}
                      />
                    </div>
                    <span className="dist-count">{count}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="card-title">📋 Session Status</h3>
                {Object.entries(adminData.session_status_distribution || {}).map(([status, count]) => (
                  <div key={status} className="dist-row">
                    <span className="dist-role">{status}</span>
                    <div className="dist-bar-track">
                      <div
                        className="dist-bar-fill"
                        style={{ width: `${(count / adminData.platform_statistics?.total_sessions) * 100}%`, background: statusColor(status) }}
                      />
                    </div>
                    <span className="dist-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {adminData.top_performers?.length > 0 && (
              <div className="card">
                <h3 className="card-title">🏆 Top Performers</h3>
                <div className="leaderboard">
                  {adminData.top_performers.map((p, i) => (
                    <div key={i} className="leaderboard-row">
                      <span className="leaderboard-rank">#{i + 1}</span>
                      <span className="leaderboard-name">{p.name}</span>
                      <span className="leaderboard-sessions">{p.sessions} sessions</span>
                      <span className="leaderboard-score" style={{ color: scoreColor(p.score) }}>{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
