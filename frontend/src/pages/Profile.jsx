import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Profile() {
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState('');
  const [topics, setTopics] = useState('');
  const [level, setLevel] = useState('beginner');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/api/auth/profile').then(r => {
      setData(r.data);
      setLevel(r.data.profile.experience_level || 'beginner');
      setGoals((r.data.profile.learning_goals || []).join(', '));
      setTopics((r.data.profile.preferred_topics || []).join(', '));
    }).catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
  }, []);

  const save = async () => {
    setMsg(''); setErr('');
    try {
      await api.put('/api/auth/profile', {
        experience_level: level,
        learning_goals: goals.split(',').map(s=>s.trim()).filter(Boolean),
        preferred_topics: topics.split(',').map(s=>s.trim()).filter(Boolean),
      });
      setMsg('Profile updated ✓');
    } catch (e) { setErr(e.response?.data?.detail || 'Update failed'); }
  };

  if (err) return <div className="card error">{err}</div>;
  if (!data) return <div className="card">Loading…</div>;

  return (
    <div>
      <h1>Profile & Settings</h1>
      <div className="card">
        <div><b>Email:</b> {data.user.email}</div>
        <div><b>Role:</b> {data.user.role}</div>
        <label>Experience Level
          <select value={level} onChange={e=>setLevel(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label>Preferred Debate Topics (comma separated)
          <input value={topics} onChange={e=>setTopics(e.target.value)} placeholder="AI ethics, climate policy…" /></label>
        <label>Learning Goals (comma separated)
          <input value={goals} onChange={e=>setGoals(e.target.value)} placeholder="Improve rebuttals, reduce filler words…" /></label>
        <button className="btn" onClick={save} style={{marginTop:16}}>Save</button>
        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}
      </div>
    </div>
  );
}