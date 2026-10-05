import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { AppLayout } from '../components/common/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LearnerDashboard } from '../pages/learner/LearnerDashboard';
import { ArgumentAnalyzerPage } from '../pages/learner/ArgumentAnalyzerPage';
import { LiveDebateArenaPage } from '../pages/learner/LiveDebateArenaPage';
import { SpeechStudioPage } from '../pages/learner/SpeechStudioPage';
import { PresentationAnalyzerPage } from '../pages/learner/PresentationAnalyzerPage';
import { SkillAnalyticsPage } from '../pages/learner/SkillAnalyticsPage';
import { CoachingDrillsPage } from '../pages/learner/CoachingDrillsPage';
import { ReportsPage } from '../pages/learner/ReportsPage';
import { ProfilePage } from '../pages/learner/ProfilePage';
import { SettingsPage } from '../pages/learner/SettingsPage';
import { StudentRosterPage } from '../pages/coach/StudentRosterPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated Application Shell */}
      <Route element={<AppLayout />}>
        {/* Core Redesigned Modules */}
        <Route path="/dashboard" element={<LearnerDashboard />} />
        <Route path="/debates" element={<LiveDebateArenaPage />} />
        <Route path="/debates/:id" element={<LiveDebateArenaPage />} />
        <Route path="/arguments" element={<ArgumentAnalyzerPage />} />
        <Route path="/speech" element={<SpeechStudioPage />} />
        <Route path="/presentations" element={<PresentationAnalyzerPage />} />
        
        {/* Progress & Analytics */}
        <Route path="/progress" element={<SkillAnalyticsPage />} />
        <Route path="/analytics" element={<SkillAnalyticsPage />} />

        {/* Reports, Coaching, Profile, Settings */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/coaching" element={<CoachingDrillsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Coach / Educator Routes */}
        <Route path="/coach/roster" element={<StudentRosterPage />} />

        {/* Root Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
