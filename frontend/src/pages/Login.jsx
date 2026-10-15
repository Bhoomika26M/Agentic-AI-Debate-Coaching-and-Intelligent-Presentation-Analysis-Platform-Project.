import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card">
        <h2>Welcome back 🎙️</h2>
        <p style={{color:'var(--muted)'}}>Sign in to your Debate Coach account.</p>
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
          {err && <div className="error">{err}</div>}
          <button className="btn" style={{marginTop:16, width:'100%'}} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{marginTop:14, fontSize:13, color:'var(--muted)'}}>
          No account? <Link to="/register" style={{color:'var(--accent)'}}>Register</Link>
        </p>
      </div>
    </div>
  );
}