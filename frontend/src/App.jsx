import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import CreateDebate from './pages/CreateDebate'
import Dashboard from './pages/Dashboard'
import DebateDetails from './pages/DebateDetails'
import Debates from './pages/Debates'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Skills from './pages/Skills'
import Settings from './pages/Settings'
import Students from './pages/Students'
import Users from './pages/Users'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  const { isAuthenticated } = useAuth()
  return <Routes><Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} /><Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} /><Route element={<ProtectedRoute />}><Route element={<Layout />}><Route index element={<Navigate to="/dashboard" replace />} /><Route path="dashboard" element={<Dashboard />} /><Route path="profile" element={<Profile />} /><Route path="skills" element={<Skills />} /><Route path="settings" element={<Settings />} /><Route path="debates" element={<Debates />} /><Route path="debates/create" element={<CreateDebate />} /><Route path="debates/:id" element={<DebateDetails />} /><Route path="students" element={<Students />} /><Route path="users" element={<Users />} /></Route></Route><Route path="/unauthorized" element={<Unauthorized />} /><Route path="*" element={<NotFound />} /></Routes>
}
