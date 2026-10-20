import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Swords,
  Scale,
  Mic,
  Presentation,
  TrendingUp,
  FileText,
  User,
  Settings,
  X,
  Sparkles,
  Users
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, onClose }) => {
  const { user } = useAuth();
  const isCoachOrEducator = user?.role === 'COACH' || user?.role === 'EDUCATOR' || user?.role === 'ADMIN';

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/debates', label: 'Practice Debate', icon: Swords },
    { to: '/arguments', label: 'Argument Analysis', icon: Scale },
    { to: '/speech', label: 'Speech Practice', icon: Mic },
    { to: '/presentations', label: 'Presentation Analysis', icon: Presentation },
    { to: '/progress', label: 'My Progress', icon: TrendingUp },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo & Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#172554] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="font-bold text-base text-[#172554] tracking-tight flex items-center gap-1.5">
                DebateIQ
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Debate & Speech Coach</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Navigation
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#172554] text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-200' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Educator / Coach cohort section if applicable */}
          {isCoachOrEducator && (
            <div className="pt-4 mt-2 border-t border-slate-100 space-y-1">
              <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Management
              </div>
              <NavLink
                to="/coach/roster"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#172554] text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Users className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Student Roster</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Bottom User Card / Status */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#172554] font-bold text-xs flex items-center justify-center shrink-0">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {user?.username || 'Debater'}
                </div>
                <div className="text-[11px] text-slate-500 capitalize">
                  {user?.role?.toLowerCase() || 'Learner'}
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
          </div>
        </div>
      </aside>
    </>
  );
};
