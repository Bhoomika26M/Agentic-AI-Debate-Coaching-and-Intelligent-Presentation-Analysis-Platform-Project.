import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function Debates() {
  const [debates, setDebates] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { api.get('/debates').then(({ data }) => setDebates(data)).catch(() => setError('Unable to load debate sessions.')).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="loading-state">Loading sessions...</div>
  return <section className="page-stack"><div className="page-heading"><div><p className="eyebrow">Practice / debates</p><h1>Make a case.</h1></div><Link className="button" to="/debates/create">New session</Link></div>{error && <p className="error-message">{error}</p>}{debates.length === 0 ? <div className="empty-state">No debate sessions yet. Create one to begin.</div> : <div className="list-stack">{debates.map((debate) => <Link className="list-item" to={`/debates/${debate.id}`} key={debate.id}><div><strong>{debate.topic}</strong><span>{debate.format.replaceAll('_', ' ')}</span></div><span className={`status status-${debate.status}`}>{debate.status}</span></Link>)}</div>}</section>
}