import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Debates() {
  const { user } = useAuth()
  const [debates, setDebates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState('my') // 'my' or 'all'
  const [search, setSearch] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('all')
  const [deletingDebate, setDeletingDebate] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)

  const loadDebates = () => {
    setLoading(true)
    setError('')
    const endpoint = activeTab === 'my' ? '/debates?my_debates=true' : '/debates'
    api.get(endpoint)
      .then(({ data }) => setDebates(data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load debate sessions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDebates()
  }, [activeTab])

  const confirmDelete = async () => {
    if (!deletingDebate) return
    setIsDeleting(true)
    setError('')
    try {
      await api.delete(`/debates/${deletingDebate.id}`)
      setDebates((prev) => prev.filter((d) => d.id !== deletingDebate.id))
      setNotice(`Debate session "${deletingDebate.topic}" was deleted successfully.`)
      setDeletingDebate(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to delete this session.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCleanupDuplicates = async () => {
    setCleaningUp(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post('/debates/cleanup-empty-duplicates')
      setNotice(`Cleaned up ${res.data.deleted_duplicates} duplicate empty sessions.`)
      loadDebates()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clean up duplicates.')
    } finally {
      setCleaningUp(false)
    }
  }

  const filteredDebates = debates.filter((d) => {
    const matchesSearch = !search || d.topic.toLowerCase().includes(search.toLowerCase())
    const matchesFormat = selectedFormat === 'all' || d.format === selectedFormat
    return matchesSearch && matchesFormat
  })

  const formats = ['one_on_one', 'parliamentary', 'oxford', 'policy', 'public_forum', 'ai_simulation']

  return (
    <section className="page-stack debates-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Practice Arena / Debates</p>
          <h1>Debate Sessions & Sparring Arena</h1>
          <p className="lede">
            Step into structured debates, spar with the Gemini AI Opponent, and receive weighted rubric coaching.
          </p>
        </div>

        <div className="dashboard-actions-row">
          <Link className="button" to="/debates/create">
            <span>+</span> Create New Session
          </Link>
          {(user?.role === 'administrator' || debates.length > 2) && (
            <button
              type="button"
              className="button secondary"
              onClick={handleCleanupDuplicates}
              disabled={cleaningUp}
              title="Safely removes duplicate scheduled debates that have zero arguments"
            >
              {cleaningUp ? 'Cleaning...' : '🧹 Clean Duplicate Empty Sessions'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
      {notice && <p className="success-message" role="status">{notice}</p>}

      {/* Filter and Tab Bar */}
      <div className="debates-filter-bar">
        <div className="tab-pills">
          <button
            type="button"
            className={`tab-pill ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            My Sessions
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Sessions ({debates.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by topic resolution..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            style={{ width: 'auto', padding: '10px 14px' }}
          >
            <option value="all">All Formats</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions Grid */}
      {loading && <div className="loading-state">Loading arena sessions...</div>}

      {!loading && filteredDebates.length === 0 ? (
        <div className="empty-state">
          <h3>No debate sessions found.</h3>
          <p style={{ marginTop: '6px' }}>
            {activeTab === 'my'
              ? "You haven't created or joined any sessions yet. Launch your first debate below!"
              : 'No debate sessions match your search criteria.'}
          </p>
          <Link to="/debates/create" className="button" style={{ marginTop: '16px' }}>
            + Create a New Session
          </Link>
        </div>
      ) : (
        <div className="debates-list-grid">
          {filteredDebates.map((debate) => {
            const isCreator = debate.created_by === user?.id
            const canDelete = isCreator || user?.role === 'administrator'

            return (
              <div className="debate-session-card" key={debate.id}>
                <div className="debate-card-main">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`status status-${debate.status}`}>{debate.status}</span>
                    <span className="tag-badge">{debate.format.replace('_', ' ')}</span>
                    {debate.ai_opponent && <span className="tag-badge ai-badge">🤖 AI Sparring</span>}
                    {isCreator && <span className="tag-badge creator-badge">Created by You</span>}
                  </div>

                  <Link to={`/debates/${debate.id}`} className="debate-topic-title">
                    {debate.topic}
                  </Link>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Created: {new Date(debate.created_at).toLocaleDateString()}
                    {debate.scheduled_at && ` · Scheduled for ${new Date(debate.scheduled_at).toLocaleString()}`}
                  </div>
                </div>

                <div className="debate-card-actions">
                  <Link to={`/debates/${debate.id}`} className="button secondary small-button">
                    Enter Arena →
                  </Link>
                  {canDelete && (
                    <button
                      type="button"
                      className="text-button danger small-button"
                      onClick={() => setDeletingDebate(debate)}
                      title="Delete debate session"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Modal for Safe Deletion */}
      {deletingDebate && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete the debate session:
              </p>
              <strong style={{ display: 'block', margin: '8px 0', color: '#0f172a' }}>
                "{deletingDebate.topic}"
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                This will delete the session, all submitted arguments, AI opponent responses, and related coaching assessments.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeletingDebate(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
