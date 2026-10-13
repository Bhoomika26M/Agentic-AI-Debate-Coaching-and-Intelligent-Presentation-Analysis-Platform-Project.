import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

// Guards & Layouts
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { RoleRoute } from './components/guards/RoleRoute';
import { MainLayout } from './layouts/MainLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { UnauthorizedPage } from './pages/common/UnauthorizedPage';
import { NotFoundPage } from './pages/common/NotFoundPage';

// Placeholder Pages (will be fully implemented in Phases 5 & 6)
const DashboardPage = () => (
  <div className="p-8">
    <h1 className="text-3xl font-serif font-bold text-white mb-2">Arena Dashboard</h1>
    <p className="text-arena-muted text-sm">Welcome to the debating chamber.</p>
  </div>
);

const TopicsPage = () => (
  <div className="p-8">
    <h1 className="text-3xl font-serif font-bold text-white mb-2">Debate Topics</h1>
    <p className="text-arena-muted text-sm">Browse and explore forensic motions.</p>
  </div>
);

const SessionsPage = () => (
  <div className="p-8">
    <h1 className="text-3xl font-serif font-bold text-white mb-2">Debate Sessions</h1>
    <p className="text-arena-muted text-sm">Scheduled and live chamber deliberations.</p>
  </div>
);

const ProfilePage = () => (
  <div className="p-8">
    <h1 className="text-3xl font-serif font-bold text-white mb-2">Profile & Skills</h1>
    <p className="text-arena-muted text-sm">Track your forensics radar and learning goals.</p>
  </div>
);

const AdminPage = () => (
  <div className="p-8">
    <h1 className="text-3xl font-serif font-bold text-white mb-2">Platform Administration</h1>
    <p className="text-arena-muted text-sm">Manage user roster, roles, and chamber governance.</p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes inside MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="topics" element={<TopicsPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Admin Protected Route */}
              <Route
                path="admin"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminPage />
                  </RoleRoute>
                }
              />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
