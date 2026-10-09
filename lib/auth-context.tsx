'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from './types';

const MOCK_PROFILES: Record<UserRole, UserProfile> = {
  learner: {
    id: 'usr-101',
    name: 'Alex Rivera',
    email: 'alex.rivera@debate.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'learner',
    experienceLevel: 'Intermediate',
    preferredTopics: ['AI Ethics & Governance', 'Climate Policy', 'Economic Sanctions', 'Healthcare Access'],
    presentationDomains: ['Tech Keynotes', 'Startup Pitches', 'Academic Lectures'],
    learningGoals: ['Eliminate filler words', 'Master Point-of-Information refutation', 'Improve Logos score to 90+'],
    coachingPreferences: {
      feedbackStrictness: 'Rigorous',
      focusAreas: ['Logical Fallacy Spotting', 'Evidence Backing', 'WPM Pacing'],
      aiPersona: 'Socratic Scholar'
    },
    metrics: {
      debatesCompleted: 18,
      winRate: 72,
      avgScore: 84.5,
      presentationsAnalyzed: 12,
      fallaciesIdentified: 34
    }
  },
  coach: {
    id: 'usr-202',
    name: 'Prof. Elena Rostova',
    email: 'elena.rostova@debatecoach.org',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'coach',
    experienceLevel: 'Elite',
    preferredTopics: ['World Schools Parliamentary', 'Oxford Debate', 'Policy Synthesis'],
    presentationDomains: ['Executive Keynotes', 'Public Advocacy'],
    learningGoals: ['Mentor collegiate debate squad', 'Audit AI judge accuracy'],
    coachingPreferences: {
      feedbackStrictness: 'Debate Coach Master',
      focusAreas: ['Strategy', 'Cross-Examination', 'Refutation Speed'],
      aiPersona: 'Sharp Critic'
    },
    metrics: {
      debatesCompleted: 140,
      winRate: 88,
      avgScore: 92.0,
      presentationsAnalyzed: 65,
      fallaciesIdentified: 210
    }
  },
  educator: {
    id: 'usr-303',
    name: 'Dr. Marcus Vance',
    email: 'm.vance@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'educator',
    experienceLevel: 'Advanced',
    preferredTopics: ['Curriculum Design', 'Argumentation Theory', 'Rhetoric'],
    presentationDomains: ['Classroom Lectures', 'Research Defense'],
    learningGoals: ['Track student cohort progress', 'Export performance scorecards'],
    coachingPreferences: {
      feedbackStrictness: 'Balanced',
      focusAreas: ['Argument Construction', 'Evidence Quality'],
      aiPersona: 'Oxford Orator'
    },
    metrics: {
      debatesCompleted: 85,
      winRate: 80,
      avgScore: 87.2,
      presentationsAnalyzed: 45,
      fallaciesIdentified: 150
    }
  },
  admin: {
    id: 'usr-404',
    name: 'System Admin (DevOps)',
    email: 'admin@verbalarena.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    experienceLevel: 'Elite',
    preferredTopics: ['Platform Performance', 'Model Safety', 'Latency Metrics'],
    presentationDomains: ['System Demos'],
    learningGoals: ['Maintain zero API downtime', 'Monitor LLM token usage'],
    coachingPreferences: {
      feedbackStrictness: 'Gentle',
      focusAreas: ['System Health'],
      aiPersona: 'Policy Specialist'
    },
    metrics: {
      debatesCompleted: 300,
      winRate: 95,
      avgScore: 96.0,
      presentationsAnalyzed: 200,
      fallaciesIdentified: 500
    }
  }
};

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: UserProfile;
  updateProfile: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('learner');
  const [user, setUser] = useState<UserProfile>(MOCK_PROFILES['learner']);

  useEffect(() => {
    setUser(MOCK_PROFILES[role]);
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <AuthContext.Provider value={{ role, setRole, user, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
