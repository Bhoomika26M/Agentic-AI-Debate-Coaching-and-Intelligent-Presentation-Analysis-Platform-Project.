import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">🎙️ Debate Coach AI</div>
        <nav>
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/debates" className={link}>My Debates</NavLink>
          <NavLink to="/debates/new" className={link}>New Debate</NavLink>
          <NavLink to="/analysis/argument" className={link}>Argument Analysis</NavLink>
          <NavLink to="/analysis/fallacy" className={link}>Fallacy Detection</NavLink>
          <NavLink to="/analysis/counterargument" className={link}>Counterarguments</NavLink>
          <NavLink to="/presentation" className={link}>Presentations</NavLink>
          <NavLink to="/coaching" className={link}>Coaching</NavLink>
          <NavLink to="/reports" className={link}>Reports</NavLink>
          {['debate_coach','admin'].includes(user?.role) && <NavLink to="/coach" className={link}>Coach</NavLink>}
          {['educator','admin'].includes(user?.role) && <NavLink to="/educator" className={link}>Educator</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
          <NavLink to="/profile" className={link}>Profile</NavLink>
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>{user?.full_name} · <span className="role-badge">{user?.role}</span></div>
          <button className="btn-secondary" onClick={() => { logout(); nav('/login'); }}>Logout</button>
        </header>
        <div className="page-body"><Outlet /></div>
      </main>
    </div>
  );
}