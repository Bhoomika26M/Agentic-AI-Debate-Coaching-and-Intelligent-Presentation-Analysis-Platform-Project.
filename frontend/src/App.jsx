import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import AIDebateCoach from './pages/AIDebateCoach/AIDebateCoach';
import ArgumentAnalysis from './pages/ArgumentAnalysis/ArgumentAnalysis';
import FallacyDetector from './pages/FallacyDetector/FallacyDetector';
import Counterarguments from './pages/Counterarguments/Counterarguments';
import PresentationAnalysis from './pages/PresentationAnalysis/PresentationAnalysis';
import LiveDebates from './pages/LiveDebates/LiveDebates';
import HistoryPage from './pages/History/History';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import Profile from './pages/Profile/Profile';
import AdminPage from './pages/Admin/AdminPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import SettingsPage from './pages/Settings/SettingsPage';

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#D49B19] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Validating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected JustiTalk Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        
        {/* Main Debate & Performance Navigation */}
        <Route path="debates" element={<LiveDebates />} />
        <Route path="live-debates" element={<LiveDebates />} />
        <Route path="ai-coach" element={<AIDebateCoach />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* AI Argument & Speech Tools */}
        <Route path="argument-analysis" element={<ArgumentAnalysis />} />
        <Route path="fallacy-detector" element={<FallacyDetector />} />
        <Route path="counterarguments" element={<Counterarguments />} />
        <Route path="presentation-analysis" element={<PresentationAnalysis />} />

        {/* Account Management */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Administration (strictly protected to Administrator role) */}
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['Administrator']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/system"
          element={
            <ProtectedRoute allowedRoles={['Administrator']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
