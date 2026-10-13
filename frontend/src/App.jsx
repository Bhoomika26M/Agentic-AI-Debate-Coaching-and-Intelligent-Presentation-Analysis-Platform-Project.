import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

// Guards & Layouts
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { RoleRoute } from './components/guards/RoleRoute';
import { MainLayout } from './layouts/MainLayout';

// Auth & Onboarding Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { UnauthorizedPage } from './pages/common/UnauthorizedPage';
import { NotFoundPage } from './pages/common/NotFoundPage';

// Real Application Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { TopicsPage } from './pages/topics/TopicsPage';
import { SessionsListPage } from './pages/sessions/SessionsListPage';
import { CreateSessionWizard } from './pages/sessions/CreateSessionWizard';
import { SessionRoomPage } from './pages/sessions/SessionRoomPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

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

            {/* Onboarding Flow */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

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
              <Route path="sessions" element={<SessionsListPage />} />
              <Route path="sessions/new" element={<CreateSessionWizard />} />
              <Route path="sessions/:id" element={<SessionRoomPage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Admin Protected Route */}
              <Route
                path="admin"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
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
