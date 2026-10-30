import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Video,
  History,
  BarChart3,
  Bot,
  FileText,
  AlertTriangle,
  Swords,
  Mic,
  CreditCard,
  Users,
  User,
  Tag,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Bell,
  Shield,
  RotateCw,
  Check,
  ChevronDown,
  Menu,
  X,
  Cpu
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout, switchRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Fetch AI engine status
  useEffect(() => {
    const checkAi = async () => {
      try {
        const res = await api.get('/system/ai-status');
        setAiStatus(res.data);
      } catch (e) {
        console.error('Failed to get AI status:', e);
      }
    };
    checkAi();
  }, []);

  // 4 Clear Sections per Prompt Phase 4.1
  const mainNav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Live Debates', path: '/live-debates', icon: Video },
    { name: 'History', path: '/history', icon: History },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const aiToolsNav = [
    { name: 'AI Debate Coach', path: '/ai-coach', icon: Bot },
    { name: 'Argument Analysis', path: '/argument-analysis', icon: FileText },
    { name: 'Fallacy Detector', path: '/fallacy-detector', icon: AlertTriangle },
    { name: 'Counterarguments', path: '/counterarguments', icon: Swords },
    { name: 'Presentation Analysis', path: '/presentation-analysis', icon: Mic },
  ];

  const accountNav = [
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Pricing', path: '/pricing', icon: Tag },
  ];

  const adminNav = [
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Payment Admin', path: '/admin/payments', icon: CreditCard },
  ];

  const handleSmoothRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 300);
  };

  const isAdmin = user?.role === 'Administrator';

  return (
    <div className="min-h-screen flex bg-[#FAF8F3] text-[#1E242B]">
      {/* MOBILE BACKDROP OVERLAY */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* LEFT SIDEBAR (Desktop Fixed, Mobile Slide-out Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#FAF8F3] border-r border-[#ECE7DE] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand & Collapse Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#ECE7DE]/60">
            <div
              className="flex items-center space-x-2.5 overflow-hidden cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DF9E16] to-[#B87E0E] flex items-center justify-center text-white shadow-sm shrink-0">
                <Shield className="w-5 h-5 fill-current" />
              </div>
              {(!collapsed || mobileOpen) && (
                <span className="font-bold text-xl text-[#1E242B] tracking-tight">
                  JustiTalk
                </span>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-[#F2ECE1] transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links Scroll Container */}
          <div className="px-3 py-4 overflow-y-auto max-h-[calc(100vh-140px)] space-y-5">
            {/* 1. MAIN */}
            <div className="space-y-1">
              {(!collapsed || mobileOpen) && (
                <p className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Main
                </p>
              )}
              <div className="space-y-0.5">
                {mainNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        isActive
                          ? 'bg-[#FBF3DC] text-[#B87E0E] font-semibold shadow-xs'
                          : 'text-[#475562] hover:bg-[#F4EFE6] hover:text-[#1E242B]'
                      }`}
                      title={collapsed && !mobileOpen ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D49B19]' : 'text-gray-400'} ${collapsed && !mobileOpen ? 'mx-auto' : 'mr-3'}`} />
                      {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* 2. AI TOOLS */}
            <div className="space-y-1">
              {(!collapsed || mobileOpen) && (
                <p className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  AI Tools
                </p>
              )}
              <div className="space-y-0.5">
                {aiToolsNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        isActive
                          ? 'bg-[#FBF3DC] text-[#B87E0E] font-semibold shadow-xs'
                          : 'text-[#475562] hover:bg-[#F4EFE6] hover:text-[#1E242B]'
                      }`}
                      title={collapsed && !mobileOpen ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D49B19]' : 'text-gray-400'} ${collapsed && !mobileOpen ? 'mx-auto' : 'mr-3'}`} />
                      {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* 3. ACCOUNT */}
            <div className="space-y-1">
              {(!collapsed || mobileOpen) && (
                <p className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Account
                </p>
              )}
              <div className="space-y-0.5">
                {accountNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        isActive
                          ? 'bg-[#FBF3DC] text-[#B87E0E] font-semibold shadow-xs'
                          : 'text-[#475562] hover:bg-[#F4EFE6] hover:text-[#1E242B]'
                      }`}
                      title={collapsed && !mobileOpen ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D49B19]' : 'text-gray-400'} ${collapsed && !mobileOpen ? 'mx-auto' : 'mr-3'}`} />
                      {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* 4. ADMINISTRATION (Guarded: Only for Administrator) */}
            {isAdmin && (
              <div className="space-y-1">
                {(!collapsed || mobileOpen) && (
                  <p className="px-3 text-[11px] font-bold tracking-wider text-[#B87E0E] uppercase flex items-center justify-between">
                    <span>Administration</span>
                    <span className="text-[9px] bg-[#FCF6E5] px-1.5 py-0.2 rounded border border-[#F4E9C0]">Admin</span>
                  </p>
                )}
                <div className="space-y-0.5">
                  {adminNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-[#FBF3DC] text-[#B87E0E] font-semibold shadow-xs'
                            : 'text-[#475562] hover:bg-[#F4EFE6] hover:text-[#1E242B]'
                        }`}
                        title={collapsed && !mobileOpen ? item.name : undefined}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D49B19]' : 'text-gray-400'} ${collapsed && !mobileOpen ? 'mx-auto' : 'mr-3'}`} />
                        {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM USER PROFILE & LOGOUT */}
        <div className="p-3 border-t border-[#ECE7DE] bg-[#FAF8F3]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#ECE7DE]/70 shadow-xs">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DF9E16] to-[#F5CA65] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                <Shield className="w-4 h-4 fill-white" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#1E242B] truncate leading-tight">
                    {user?.full_name || 'Admin'}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {user?.role || 'Learner'} • {user?.subscription?.plan_name || 'Pro Plan'}
                  </p>
                </div>
              )}
            </div>
            {(!collapsed || mobileOpen) && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        collapsed ? 'md:pl-20' : 'md:pl-64'
      }`}>
        {/* TOPBAR */}
        <header className="h-16 bg-[#FAF8F3]/90 backdrop-blur-md border-b border-[#ECE7DE] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-[#F2ECE1] rounded-lg"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-lg md:text-xl font-bold text-[#1E242B] tracking-tight">
                {location.pathname === '/' ? 'Dashboard' :
                 location.pathname === '/ai-coach' ? 'AI Debate Coach' :
                 location.pathname === '/argument-analysis' ? 'Argument Analysis' :
                 location.pathname === '/fallacy-detector' ? 'Logical Fallacy Detector' :
                 location.pathname === '/counterarguments' ? 'Counterargument Generator' :
                 location.pathname === '/presentation-analysis' ? 'Presentation Analysis' :
                 location.pathname === '/analytics' ? 'Performance Analytics' :
                 location.pathname === '/live-debates' ? 'Live Debates' :
                 location.pathname === '/history' ? 'Debate History' :
                 location.pathname === '/discover' ? 'Discover Debates' :
                 location.pathname === '/profile' ? 'User Profile' :
                 location.pathname === '/settings' ? 'Settings' :
                 location.pathname === '/pricing' ? 'Pricing & Plans' :
                 location.pathname === '/admin/users' ? 'User Management' :
                 location.pathname === '/admin/payments' ? 'Payment Admin' : 'JustiTalk Platform'}
              </h1>
              <p className="text-[11px] md:text-xs text-gray-500 hidden sm:block">
                {location.pathname === '/' ? "Welcome back! Here's your debate activity overview." : 'AI-Powered Dialectic & Rhetoric Intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3.5">
            {/* Live AI Engine Status Pill */}
            <div
              className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                aiStatus?.live_ai_connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={aiStatus?.guidance || "AI status"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${aiStatus?.live_ai_connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{aiStatus?.live_ai_connected ? 'OpenAI GPT-4o' : 'Dev NLP Engine'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleSmoothRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-[#ECE7DE] rounded-lg hover:bg-gray-50 shadow-xs transition-colors"
              title="Refresh Data"
            >
              <RotateCw className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-[#D49B19]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Theme Toggle Icon */}
            <button
              title="Warm Theme Active"
              className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 hover:bg-[#F2ECE1] rounded-lg transition-colors"
            >
              <Sun className="w-4 h-4 text-[#D49B19]" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 hover:bg-[#F2ECE1] rounded-lg transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#D49B19] rounded-full ring-2 ring-white"></span>
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#ECE7DE] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <span className="text-xs font-bold text-gray-800">Notifications</span>
                    <span className="text-[10px] text-[#D49B19] cursor-pointer" onClick={() => setShowNotifMenu(false)}>Close</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-[#FBF9F4] rounded-lg border border-[#F4EFE6]">
                      <p className="font-semibold text-gray-800">New Feedback</p>
                      <p className="text-gray-500 text-[11px]">Pro AI reviewed your debate stance.</p>
                      <span className="text-[10px] text-gray-400">Just now</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#FCF6E5] border border-[#F4E9C0] text-[#B87E0E] text-xs font-semibold hover:bg-[#F8EBC3] transition-colors shadow-xs"
                title="Switch Role for Evaluation"
              >
                <Shield className="w-3.5 h-3.5 fill-current" />
                <span>{user?.role || 'Admin'}</span>
                <ChevronDown className="w-3 h-3 text-[#B87E0E]" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#ECE7DE] py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                    Switch Active Role
                  </div>
                  {['Administrator', 'Learner', 'Debate Coach', 'Educator'].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-[#FCF6E5] hover:text-[#B87E0E] flex items-center justify-between transition-colors"
                    >
                      <span>{r}</span>
                      {user?.role === r && <Check className="w-3.5 h-3.5 text-[#D49B19]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-4 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
