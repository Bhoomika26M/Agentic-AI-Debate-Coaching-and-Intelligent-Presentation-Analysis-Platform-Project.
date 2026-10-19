import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateDebate from './pages/CreateDebate';
import DebateSession from './pages/DebateSession';
import DebateHistory from './pages/DebateHistory';
import ArgumentAnalysis from './pages/ArgumentAnalysis';
import FallacyDetection from './pages/FallacyDetection';
import CounterArguments from './pages/CounterArguments';
import PresentationAnalysis from './pages/PresentationAnalysis';
import PerformanceReport from './pages/PerformanceReport';
import Coaching from './pages/Coaching';
import CoachDashboard from './pages/CoachDashboard';
import EducatorDashboard from './pages/EducatorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// RoleGate: only allow specific roles to see this route
function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    // send them to their proper home
    const home = { learner: '/dashboard', debate_coach: '/coach', educator: '/educator', admin: '/admin' }[user.role] || '/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
}

// HomeRedirect: root "/" sends each role to their own home
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const home = { learner: '/dashboard', debate_coach: '/coach', educator: '/educator', admin: '/admin' }[user.role] || '/dashboard';
  return <Navigate to={home} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Protected><AppLayout /></Protected>}>
            {/* Learner-only */}
            <Route path="/dashboard" element={<RoleGate roles={['learner']}><Dashboard /></RoleGate>} />
            <Route path="/debates" element={<RoleGate roles={['learner']}><DebateHistory /></RoleGate>} />
            <Route path="/debates/new" element={<RoleGate roles={['learner']}><CreateDebate /></RoleGate>} />
            <Route path="/debates/:id" element={<RoleGate roles={['learner']}><DebateSession /></RoleGate>} />
            <Route path="/analysis/argument" element={<RoleGate roles={['learner']}><ArgumentAnalysis /></RoleGate>} />
            <Route path="/analysis/fallacy" element={<RoleGate roles={['learner']}><FallacyDetection /></RoleGate>} />
            <Route path="/analysis/counterargument" element={<RoleGate roles={['learner']}><CounterArguments /></RoleGate>} />
            <Route path="/presentation" element={<RoleGate roles={['learner']}><PresentationAnalysis /></RoleGate>} />
            <Route path="/reports" element={<RoleGate roles={['learner']}><PerformanceReport /></RoleGate>} />
            <Route path="/coaching" element={<RoleGate roles={['learner']}><Coaching /></RoleGate>} />

            {/* Coach-only */}
            <Route path="/coach" element={<RoleGate roles={['debate_coach']}><CoachDashboard /></RoleGate>} />

            {/* Educator-only */}
            <Route path="/educator" element={<RoleGate roles={['educator']}><EducatorDashboard /></RoleGate>} />

            {/* Admin-only */}
            <Route path="/admin" element={<RoleGate roles={['admin']}><AdminDashboard /></RoleGate>} />
            <Route path="/admin/users" element={<RoleGate roles={['admin']}><AdminUsers /></RoleGate>} />

            {/* Shared */}
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}