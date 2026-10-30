import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import AIDebateCoach from './pages/AIDebateCoach/AIDebateCoach';
import ArgumentAnalysis from './pages/ArgumentAnalysis/ArgumentAnalysis';
import FallacyDetector from './pages/FallacyDetector/FallacyDetector';
import Counterarguments from './pages/Counterarguments/Counterarguments';
import PresentationAnalysis from './pages/PresentationAnalysis/PresentationAnalysis';
import LiveDebates from './pages/LiveDebates/LiveDebates';
import HistoryPage from './pages/History/History';
import Discover from './pages/Discover/Discover';
import Archive from './pages/Archive/Archive';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import Profile from './pages/Profile/Profile';
import AdminPage from './pages/Admin/AdminPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import SettingsPage from './pages/Settings/SettingsPage';
import {
  AboutPage,
  PricingPage,
  ContactPage,
  BlogPage,
  PaymentAdminPage
} from './pages/Info/InfoPages';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="discover" element={<Discover />} />
        <Route path="live-debates" element={<LiveDebates />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="archive" element={<Archive />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="ai-coach" element={<AIDebateCoach />} />
        <Route path="argument-analysis" element={<ArgumentAnalysis />} />
        <Route path="fallacy-detector" element={<FallacyDetector />} />
        <Route path="counterarguments" element={<Counterarguments />} />
        <Route path="presentation-analysis" element={<PresentationAnalysis />} />
        <Route path="admin/payments" element={<PaymentAdminPage />} />
        <Route path="admin/users" element={<AdminPage />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
