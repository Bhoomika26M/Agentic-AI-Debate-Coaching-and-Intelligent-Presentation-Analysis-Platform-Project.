import { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', role: 'debate_coach',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/api/dashboard/admin/users')
      .then(r => setUsers(r.data))
      .catch(e => setErr(e.response?.data?.detail || 'Failed to load users'));

  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setBusy(true);
    try {
      await api.post('/api/auth/admin/users', form);
      setMsg(`Created ${form.email} as ${form.role}`);
      setForm({ email: '', full_name: '', password: '', role: 'debate_coach' });
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to create user');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h1>Manage Users</h1>

      <div className="card">
        <h3>Create Coach / Educator / Admin</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Public registration only creates learners. Coaches, educators, and admins
          must be created here by an administrator.
        </p>
        <form onSubmit={createUser}>
          <label>Full name
            <input required value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
          <label>Email
            <input type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password (min 8 chars)
            <input type="password" required minLength={8} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label>Role
            <select value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="learner">Learner</option>
              <option value="debate_coach">Debate Coach</option>
              <option value="educator">Educator</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <button className="btn" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? 'Creating…' : 'Create User'}
          </button>
          {msg && <div className="success">{msg}</div>}
          {err && <div className="error">{err}</div>}
        </form>
      </div>

      <div className="card">
        <h3>All Users ({users.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>{u.is_active ? '✅' : '❌'}</td>
                <td>{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}