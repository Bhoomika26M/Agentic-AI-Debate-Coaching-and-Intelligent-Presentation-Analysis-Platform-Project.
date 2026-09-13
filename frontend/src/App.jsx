import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Skills from './pages/Skills'
import Debates from './pages/Debates'
import CreateDebate from './pages/CreateDebate'
import DebateDetail from './pages/DebateDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return <BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route element={<ProtectedRoute />}><Route element={<AppLayout />}><Route path="/" element={<Dashboard />} /><Route path="/profile" element={<Profile />} /><Route path="/skills" element={<Skills />} /><Route path="/debates" element={<Debates />} /><Route path="/debates/create" element={<CreateDebate />} /><Route path="/debates/:debateId" element={<DebateDetail />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>
}
