'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import LearnerDashboard from '@/components/LearnerDashboard';
import CoachDashboard from '@/components/CoachDashboard';
import EducatorDashboard from '@/components/EducatorDashboard';
import AdminDashboard from '@/components/AdminDashboard';

export default function DashboardPage() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      {role === 'learner' && <LearnerDashboard />}
      {role === 'coach' && <CoachDashboard />}
      {role === 'educator' && <EducatorDashboard />}
      {role === 'admin' && <AdminDashboard />}
    </div>
  );
}
