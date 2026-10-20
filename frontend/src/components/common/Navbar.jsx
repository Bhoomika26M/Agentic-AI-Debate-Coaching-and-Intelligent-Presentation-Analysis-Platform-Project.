import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Settings as SettingsIcon,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Map route to readable page title
  const getPageTitle = (path) => {
    if (path.startsWith('/debates')) return 'Practice Debate';
    if (path.startsWith('/arguments')) return 'Argument Analysis';
    if (path.startsWith('/speech')) return 'Speech Practice';
    if (path.startsWith('/presentations')) return 'Presentation Analysis';
    if (path.startsWith('/analytics') || path.startsWith('/progress')) return 'My Progress';
    if (path.startsWith('/reports')) return 'Session Reports';
    if (path.startsWith('/profile')) return 'User Profile';
    if (path.startsWith('/settings')) return 'Platform Settings';
    if (path.startsWith('/coach')) return 'Student Roster & Cohort Review';
    return 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden lg:flex items-center max-w-xs w-full mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search topics, drills, sessions..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 pl-9 pr-3.5 py-2 text-slate-800 placeholder-slate-400 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[11px] text-blue-700 font-medium">2 New</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <p className="font-semibold text-blue-900">New Rebuttal Drill Ready</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">AI Coach prepared a 3-minute warrant exercise.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-800">Score Improved +4.2%</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Your speech delivery cadence reached optimal WPM.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#172554] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 line-clamp-1 leading-tight">
                  {user.username}
                </div>
                <div className="text-[11px] text-slate-500 capitalize leading-tight">
                  {user.role?.toLowerCase() || 'Learner'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{user.username}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.email || 'No email attached'}</div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings</span>
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-[#172554] hover:text-[#1E3A8A] px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold bg-[#172554] text-white hover:bg-[#1E3A8A] px-3.5 py-2 rounded-xl shadow-xs transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
