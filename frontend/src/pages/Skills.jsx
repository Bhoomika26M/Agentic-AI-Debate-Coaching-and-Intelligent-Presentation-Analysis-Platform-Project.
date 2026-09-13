import { useEffect, useState } from 'react'
import api from '../services/api'

const fields = [['communication_score', 'Communication'], ['critical_thinking_score', 'Critical thinking'], ['argumentation_score', 'Argumentation'], ['confidence_score', 'Confidence'], ['presentation_score', 'Presentation']]
const initial = Object.fromEntries(fields.map(([key]) => [key, 0]))
export default function Skills() {
  const [skills, setSkills] = useState([]); const [form, setForm] = useState(initial); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true)
  function load() { return api.get('/skills').then(({ data }) => { setSkills(data); if (data[0]) setForm(data[0]) }).catch(() => setError('Unable to load skills.')).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  async function save(event) { event.preventDefault(); setError(''); setMessage(''); try { await api.put('/skills/me', Object.fromEntries(fields.map(([key]) => [key, Number(form[key])]))); await load(); setMessage('Skill scores saved.') } catch (requestError) { setError(requestError.response?.data?.detail || 'Scores must be between 0 and 100.') } }
  async function remove() { await api.delete('/skills/me'); setSkills([]); setForm(initial); setMessage('Skill scores removed.') }
  if (loading) return <div className="loading-state">Loading skills...</div>
  return <section className="page-stack"><p className="eyebrow">Practice / skills</p><h1>Your baseline.</h1><p className="lede">Use simple scores to keep track of where practice is paying off.</p><form className="form-card wide" onSubmit={save}>{fields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="100" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}{error && <p className="error-message">{error}</p>}{message && <p className="success-message">{message}</p>}<div className="form-actions"><button className="button">Save scores</button>{skills.length > 0 && <button className="button secondary" type="button" onClick={remove}>Remove scores</button>}</div></form></section>
}