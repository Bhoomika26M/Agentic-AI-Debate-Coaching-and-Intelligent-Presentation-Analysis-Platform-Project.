import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navigation = [
  ['/', 'Dashboard'],
  ['/profile', 'Profile'],
  ['/skills', 'Skills'],
  ['/debates', 'Debates'],
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Rhetoric / 01</div>
        <p className="eyebrow">Debate coach</p>
        <nav>{navigation.map(([path, label]) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}</nav>
        <NavLink className="new-debate" to="/debates/create">+ New debate</NavLink>
        <div className="sidebar-footer"><span>{user?.name}</span><button className="text-button" onClick={() => { logout(); navigate('/login') }}>Log out</button></div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  )
}
