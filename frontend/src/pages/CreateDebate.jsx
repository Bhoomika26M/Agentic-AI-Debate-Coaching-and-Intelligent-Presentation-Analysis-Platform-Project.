import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function CreateDebate() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    topic:'', format:'one_on_one', position:'FOR', difficulty:'intermediate', opening_argument:''
  });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api.post('/api/debates', form);
      nav(`/debates/${r.data.id}`);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to create debate');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Start a New Debate</h1>
      <form className="card" onSubmit={submit}>
        <label>Debate Topic
          <input required value={form.topic}
                 onChange={e=>setForm({...form, topic:e.target.value})}
                 placeholder="e.g. AI should be regulated like medicine" /></label>
        <label>Format
          <select value={form.format} onChange={e=>setForm({...form, format:e.target.value})}>
            <option value="one_on_one">One-on-One Debate</option>
            <option value="oxford">Oxford Debate</option>
            <option value="parliamentary">Parliamentary Debate</option>
            <option value="policy">Policy Debate</option>
            <option value="public_forum">Public Forum Debate</option>
            <option value="ai_simulation">AI Debate Simulation</option>
          </select>
        </label>
        <label>Your Position
          <select value={form.position} onChange={e=>setForm({...form, position:e.target.value})}>
            <option value="FOR">FOR</option><option value="AGAINST">AGAINST</option>
          </select>
        </label>
        <label>Difficulty
          <select value={form.difficulty} onChange={e=>setForm({...form, difficulty:e.target.value})}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label>Opening Argument
          <textarea required rows={6} value={form.opening_argument}
                    onChange={e=>setForm({...form, opening_argument:e.target.value})}
                    placeholder="State your claim and reasons…" /></label>
        {err && <div className="error">{err}</div>}
        <button className="btn" disabled={busy} style={{marginTop:16}}>
          {busy ? 'Starting debate…' : 'Start Debate'}
        </button>
      </form>
    </div>
  );
}