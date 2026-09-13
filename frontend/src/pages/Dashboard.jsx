import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    api.get('/health').then(() => setApiStatus('connected')).catch(() => setApiStatus('offline'))
  }, [])

  return <section className="page-stack"><p className="eyebrow">Workspace / overview</p><h1>Make your next point count.</h1><p className="lede">A focused home for your practice sessions, personal goals, and debate schedule.</p><p className="api-status">API {apiStatus}</p><div className="dashboard-grid"><article><span>01</span><h2>Build your profile</h2><p>Set your context so future coaching sessions can meet you where you are.</p><Link to="/profile">Open profile</Link></article><article><span>02</span><h2>Start a debate</h2><p>Create a session and invite participants when you are ready to practice.</p><Link to="/debates/create">Create debate</Link></article><article><span>03</span><h2>Track your skills</h2><p>Keep your foundation ready for the analysis tools coming in later milestones.</p><Link to="/skills">View skills</Link></article></div></section>
}
