import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email:'', full_name:'', password:'' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await register(form.email, form.full_name, form.password);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Registration failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card">
        <h2>Create your account</h2>
        <form onSubmit={submit}>
          <label>Full name<input required minLength={2} value={form.full_name}
                 onChange={e=>setForm({...form, full_name:e.target.value})} /></label>
          <label>Email<input type="email" required value={form.email}
                 onChange={e=>setForm({...form, email:e.target.value})} /></label>
          <label>Password (min 8 chars)<input type="password" required minLength={8}
                 value={form.password}
                 onChange={e=>setForm({...form, password:e.target.value})} /></label>
          {err && <div className="error">{err}</div>}
          <button className="btn" style={{marginTop:16, width:'100%'}} disabled={busy}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <p style={{marginTop:14, fontSize:13, color:'var(--muted)'}}>
          Already registered? <Link to="/login" style={{color:'var(--accent)'}}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}