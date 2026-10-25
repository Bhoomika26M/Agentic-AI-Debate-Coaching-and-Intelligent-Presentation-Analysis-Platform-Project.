import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  User,
  Compass,
  Calendar,
  PlusCircle,
  Shield,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const MainLayout = () => {
  const { user, logout, isAdmin, isCoach, isEducator } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'AI Sparring', path: '/simulation', icon: Sparkles },
    { label: 'Topics', path: '/topics', icon: Compass },
    { label: 'Sessions', path: '/sessions', icon: Calendar },
    { label: 'Profile & Skills', path: '/profile', icon: User },
  ];

  if (isCoach || isEducator || isAdmin) {
    navItems.push({ label: 'Schedule Session', path: '/sessions/new', icon: PlusCircle });
  }

  if (isAdmin) {
    navItems.push({ label: 'User Admin', path: '/admin', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-arena-bg-card border-r border-white/5 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-arena-amber to-arena-prop flex items-center justify-center font-serif font-black text-lg text-black shadow-spotlight">
              A
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-white block">
                The Arena
              </span>
              <span className="text-[10px] text-arena-muted tracking-wider uppercase font-semibold block">
                Debate Platform
              </span>
            </div>
          </NavLink>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-arena-bg-elevated/70 border border-white/5 flex items-center gap-3">
          <img
            src={user?.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
            alt={user?.full_name}
            className="w-10 h-10 rounded-full bg-arena-bg-dark border border-white/10"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
            <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-arena-amber/15 text-arena-amber border border-arena-amber/30">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-arena-amber/15 text-arena-amber font-semibold border border-arena-amber/20'
                      : 'text-arena-muted hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-arena-muted hover:text-arena-opp transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <span className="text-[10px] text-arena-muted/60 font-mono">v0.1 M1</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
