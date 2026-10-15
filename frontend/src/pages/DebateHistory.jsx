import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function DebateHistory() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  const load = () => api.get('/api/debates').then(r => setRows(r.data)).catch(e=>setErr(e.response?.data?.detail||'Failed'));

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this debate session?')) return;
    try { await api.delete(`/api/debates/${id}`); await load(); }
    catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
  };

  return (
    <div>
      <h1>My Debates</h1>
      {err && <div className="card error">{err}</div>}
      <div className="card">
        {rows.length === 0 ? <p style={{color:'var(--muted)'}}>No debates yet. <Link to="/debates/new">Start one.</Link></p> : (
          <table>
            <thead><tr><th>Topic</th><th>Position</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td><Link to={`/debates/${r.id}`} style={{color:'var(--accent)'}}>{r.topic}</Link></td>
                <td>{r.position}</td>
                <td><span className="badge">{r.status}</span></td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td><button className="btn-danger" onClick={()=>remove(r.id)}>Delete</button></td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}