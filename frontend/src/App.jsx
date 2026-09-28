import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { AboutPage } from './pages/public/AboutPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Learner pages
import { LearnerDashboard } from './pages/learner/LearnerDashboard';
import { CreateDebatePage } from './pages/learner/CreateDebatePage';
import { DebateRoomPage } from './pages/learner/DebateRoomPage';
import { PostDebateReportPage } from './pages/learner/PostDebateReportPage';
import { DebateHistoryPage } from './pages/learner/DebateHistoryPage';
import { PresentationUploadPage } from './pages/learner/PresentationUploadPage';
import { PresentationAnalysisPage } from './pages/learner/PresentationAnalysisPage';
import { PresentationHistoryPage } from './pages/learner/PresentationHistoryPage';
import { SkillAnalyticsPage } from './pages/learner/SkillAnalyticsPage';
import { LearningPathPage } from './pages/learner/LearningPathPage';
import { ExercisesPage } from './pages/learner/ExercisesPage';
import { ProfilePage } from './pages/learner/ProfilePage';
import { NotificationsPage } from './pages/learner/NotificationsPage';

// Coach pages
import { CoachDashboard } from './pages/coach/CoachDashboard';
import { CoachStudentsPage } from './pages/coach/CoachStudentsPage';
import { CoachEvaluationsPage } from './pages/coach/CoachEvaluationsPage';

// Educator pages
import { EducatorDashboard } from './pages/educator/EducatorDashboard';
import { EducatorReportsPage } from './pages/educator/EducatorReportsPage';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUserManagementPage } from './pages/admin/AdminUserManagementPage';
import { AdminAIMonitoringPage } from './pages/admin/AdminAIMonitoringPage';
import { AdminSystemReportsPage } from './pages/admin/AdminSystemReportsPage';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'admin') {
    return <Navigate to="/learner/dashboard" replace />;
  }

  return children;
};

// Layout Shell
const LayoutShell = ({ children }) => {
  const location = useLocation();
  const isPublic = ['/', '/features', '/about', '/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        {!isPublic && <Sidebar />}
        <main className={`flex-1 ${!isPublic ? 'p-6 max-w-7xl mx-auto w-full overflow-y-auto' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <LayoutShell>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Learner */}
            <Route path="/learner/dashboard" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><LearnerDashboard /></ProtectedRoute>} />
            <Route path="/learner/debates/new" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><CreateDebatePage /></ProtectedRoute>} />
            <Route path="/learner/debates/:id/room" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><DebateRoomPage /></ProtectedRoute>} />
            <Route path="/learner/debates/:id/report" element={<ProtectedRoute allowedRoles={['learner', 'coach', 'educator', 'admin']}><PostDebateReportPage /></ProtectedRoute>} />
            <Route path="/learner/debates/:id" element={<ProtectedRoute allowedRoles={['learner', 'coach', 'educator', 'admin']}><PostDebateReportPage /></ProtectedRoute>} />
            <Route path="/learner/debates/history" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><DebateHistoryPage /></ProtectedRoute>} />
            <Route path="/learner/presentations/new" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><PresentationUploadPage /></ProtectedRoute>} />
            <Route path="/learner/presentations/:id" element={<ProtectedRoute allowedRoles={['learner', 'coach', 'educator', 'admin']}><PresentationAnalysisPage /></ProtectedRoute>} />
            <Route path="/learner/presentations/history" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><PresentationHistoryPage /></ProtectedRoute>} />
            <Route path="/learner/skills" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><SkillAnalyticsPage /></ProtectedRoute>} />
            <Route path="/learner/learning-path" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><LearningPathPage /></ProtectedRoute>} />
            <Route path="/learner/exercises" element={<ProtectedRoute allowedRoles={['learner', 'admin']}><ExercisesPage /></ProtectedRoute>} />
            <Route path="/learner/profile" element={<ProtectedRoute allowedRoles={['learner', 'coach', 'educator', 'admin']}><ProfilePage /></ProtectedRoute>} />
            <Route path="/learner/notifications" element={<ProtectedRoute allowedRoles={['learner', 'coach', 'educator', 'admin']}><NotificationsPage /></ProtectedRoute>} />

            {/* Coach */}
            <Route path="/coach/dashboard" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute>} />
            <Route path="/coach/students" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachStudentsPage /></ProtectedRoute>} />
            <Route path="/coach/evaluations" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachEvaluationsPage /></ProtectedRoute>} />

            {/* Educator */}
            <Route path="/educator/dashboard" element={<ProtectedRoute allowedRoles={['educator', 'admin']}><EducatorDashboard /></ProtectedRoute>} />
            <Route path="/educator/reports" element={<ProtectedRoute allowedRoles={['educator', 'admin']}><EducatorReportsPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUserManagementPage /></ProtectedRoute>} />
            <Route path="/admin/ai-monitoring" element={<ProtectedRoute allowedRoles={['admin']}><AdminAIMonitoringPage /></ProtectedRoute>} />
            <Route path="/admin/system-reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminSystemReportsPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LayoutShell>
      </Router>
    </AuthProvider>
  );
}
