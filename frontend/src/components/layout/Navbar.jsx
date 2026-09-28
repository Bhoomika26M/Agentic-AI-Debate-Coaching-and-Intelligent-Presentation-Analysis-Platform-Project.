import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, Bell, User, LogOut, ChevronDown, 
  Layers, Shield, GraduationCap, Users, BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import api from '../../services/api';

export const Navbar = () => {
  const { user, role, logout, quickSwitchRole, isLearner, isCoach, isEducator, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.get('/notifications')
        .then(res => {
          setNotifications(res.data);
          setUnreadCount(res.data.filter(n => !n.is_read).length);
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  const handleRoleSwitch = async (targetRole) => {
    setShowRoleSwitcher(false);
    try {
      await quickSwitchRole(targetRole);
      if (targetRole === 'learner') navigate('/learner/dashboard');
      else if (targetRole === 'coach') navigate('/coach/dashboard');
      else if (targetRole === 'educator') navigate('/educator/dashboard');
      else if (targetRole === 'admin') navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadgeColor = (r) => {
    if (r === 'admin') return 'danger';
    if (r === 'coach') return 'warning';
    if (r === 'educator') return 'purple';
    return 'primary';
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-primary-400 bg-clip-text text-transparent">
              DebateAI
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded">
              Agentic Platform
            </span>
          </div>
        </Link>

        {/* Public or Role Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {!user ? (
            <>
              <Link to="/features" className="hover:text-white transition-colors">Features</Link>
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
            </>
          ) : (
            <>
              {isLearner && (
                <>
                  <Link to="/learner/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                  <Link to="/learner/debates/new" className="text-primary-400 font-semibold hover:text-primary-300 transition-colors">+ New Debate</Link>
                  <Link to="/learner/presentations/new" className="hover:text-white transition-colors">Presentation Lab</Link>
                  <Link to="/learner/exercises" className="hover:text-white transition-colors">Drills</Link>
                </>
              )}
              {isCoach && (
                <>
                  <Link to="/coach/dashboard" className="hover:text-white transition-colors">Coach Hub</Link>
                  <Link to="/coach/students" className="hover:text-white transition-colors">Students</Link>
                  <Link to="/coach/evaluations" className="hover:text-white transition-colors">Evaluations</Link>
                </>
              )}
              {isEducator && (
                <>
                  <Link to="/educator/dashboard" className="hover:text-white transition-colors">Class Analytics</Link>
                  <Link to="/educator/reports" className="hover:text-white transition-colors">Assessment Reports</Link>
                </>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin/dashboard" className="hover:text-white transition-colors">Admin Dashboard</Link>
                  <Link to="/admin/users" className="hover:text-white transition-colors">User Directory</Link>
                  <Link to="/admin/ai-monitoring" className="hover:text-white transition-colors">AI Telemetry</Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Right side: Role switcher, Notifications, User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 font-medium transition-all"
              title="Switch demo role for evaluation"
            >
              <Layers className="w-3.5 h-3.5 text-primary-400" />
              <span className="hidden sm:inline">Role:</span>
              <span className="text-white font-bold capitalize">{user ? role : 'Demo'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-700/60">
                  Switch Active Role:
                </div>
                <button
                  onClick={() => handleRoleSwitch('learner')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/60 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-primary-400" /> Learner</span>
                  {role === 'learner' && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                </button>
                <button
                  onClick={() => handleRoleSwitch('coach')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/60 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-amber-400" /> Debate Coach</span>
                  {role === 'coach' && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                </button>
                <button
                  onClick={() => handleRoleSwitch('educator')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/60 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-purple-400" /> Educator</span>
                  {role === 'educator' && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                </button>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/60 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-rose-400" /> Administrator</span>
                  {role === 'admin' && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                </button>
              </div>
            )}
          </div>

          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 animate-ping"></span>
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary-500 border-2 border-slate-900"></span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 max-h-96 overflow-y-auto">
                    <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700/60">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      <span className="text-[10px] text-primary-400 font-semibold">{unreadCount} unread</span>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-3 py-2.5 border-b border-slate-700/30 text-xs ${!n.is_read ? 'bg-primary-950/20' : ''}`}>
                          <p className="font-semibold text-slate-200">{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-700/60">
                      <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      <Badge variant={getRoleBadgeColor(role)} size="sm" className="mt-1.5 capitalize">
                        {role}
                      </Badge>
                    </div>
                    <Link
                      to="/learner/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/60 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5" /> Profile & Skills
                    </Link>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); navigate('/login'); }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-slate-700/60 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-600/30 transition-all"
              >
                Register
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
