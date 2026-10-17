import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import DebateSessions from './pages/DebateSessions'
import ArgumentAnalysis from './pages/ArgumentAnalysis'
import DebateSimulation from './pages/DebateSimulation'
import Coaching from './pages/Coaching'
import PresentationAnalysis from './pages/PresentationAnalysis'
import Reports from './pages/Reports'
import './index.css'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"       element={<Landing />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* M1 */}
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/sessions"    element={<DebateSessions />} />
            <Route path="/profile"     element={<Profile />} />
            {/* M2 */}
            <Route path="/analysis"    element={<ArgumentAnalysis />} />
            {/* M3 */}
            <Route path="/simulation"  element={<DebateSimulation />} />
            <Route path="/coaching"    element={<Coaching />} />
            {/* M4 */}
            <Route path="/presentation" element={<PresentationAnalysis />} />
            <Route path="/reports"     element={<Reports />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
