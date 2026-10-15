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

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Protected><AppLayout /></Protected>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/debates/new" element={<CreateDebate />} />
            <Route path="/debates/:id" element={<DebateSession />} />
            <Route path="/debates" element={<DebateHistory />} />
            <Route path="/analysis/argument" element={<ArgumentAnalysis />} />
            <Route path="/analysis/fallacy" element={<FallacyDetection />} />
            <Route path="/analysis/counterargument" element={<CounterArguments />} />
            <Route path="/presentation" element={<PresentationAnalysis />} />
            <Route path="/reports" element={<PerformanceReport />} />
            <Route path="/coaching" element={<Coaching />} />
            <Route path="/coach" element={<RoleGate roles={['debate_coach','admin']}><CoachDashboard /></RoleGate>} />
            <Route path="/educator" element={<RoleGate roles={['educator','admin']}><EducatorDashboard /></RoleGate>} />
            <Route path="/admin" element={<RoleGate roles={['admin']}><AdminDashboard /></RoleGate>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}