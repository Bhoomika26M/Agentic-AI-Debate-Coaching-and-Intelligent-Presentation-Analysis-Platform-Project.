import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, MessageSquare, Mic, BookOpen, User, 
  Award, Bell, Settings, History, PlusCircle, Users, BarChart3,
  Shield, Cpu, FileText, CheckSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { role } = useAuth();

  const learnerNav = [
    { to: '/learner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/learner/debates/new', label: 'Create Debate', icon: PlusCircle },
    { to: '/learner/debates/history', label: 'Debate History', icon: History },
    { to: '/learner/presentations/new', label: 'Presentation Lab', icon: Mic },
    { to: '/learner/presentations/history', label: 'Presentation Archive', icon: FileText },
    { to: '/learner/skills', label: 'Skill Analytics', icon: Award },
    { to: '/learner/learning-path', label: 'Learning Path', icon: BookOpen },
    { to: '/learner/exercises', label: 'Practice Drills', icon: CheckSquare },
    { to: '/learner/profile', label: 'My Profile', icon: User },
    { to: '/learner/notifications', label: 'Notifications', icon: Bell },
  ];

  const coachNav = [
    { to: '/coach/dashboard', label: 'Coach Hub', icon: LayoutDashboard },
    { to: '/coach/students', label: 'Student Directory', icon: Users },
    { to: '/coach/evaluations', label: 'Debate Evaluations', icon: MessageSquare },
  ];

  const educatorNav = [
    { to: '/educator/dashboard', label: 'Class Analytics', icon: BarChart3 },
    { to: '/educator/reports', label: 'Assessment Reports', icon: FileText },
  ];

  const adminNav = [
    { to: '/admin/dashboard', label: 'Admin Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/ai-monitoring', label: 'AI Telemetry', icon: Cpu },
    { to: '/admin/system-reports', label: 'System Health', icon: Shield },
  ];

  let activeNav = learnerNav;
  if (role === 'coach') activeNav = coachNav;
  if (role === 'educator') activeNav = educatorNav;
  if (role === 'admin') activeNav = adminNav;

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
        {role.toUpperCase()} NAVIGATION
      </div>
      <nav className="space-y-1">
        {activeNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
