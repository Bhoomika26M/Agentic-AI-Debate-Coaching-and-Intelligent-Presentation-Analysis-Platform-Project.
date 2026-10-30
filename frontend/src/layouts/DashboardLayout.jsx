import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Video,
  History,
  Archive,
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
  Info,
  Mail,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Bell,
  Shield,
  RotateCw,
  Check,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout, switchRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navSections = [
    {
      title: 'Navigation',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Discover', path: '/discover', icon: Compass },
        { name: 'Live Debates', path: '/live-debates', icon: Video },
        { name: 'History', path: '/history', icon: History },
        { name: 'Archive', path: '/archive', icon: Archive },
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Creator Tools',
      items: [
        { name: 'AI Debate Coach', path: '/ai-coach', icon: Bot },
        { name: 'Argument Analysis', path: '/argument-analysis', icon: FileText },
        { name: 'Fallacy Detector', path: '/fallacy-detector', icon: AlertTriangle },
        { name: 'Counterarguments', path: '/counterarguments', icon: Swords },
        { name: 'Presentation Analysis', path: '/presentation-analysis', icon: Mic },
      ],
    },
    {
      title: 'Administration',
      items: [
        { name: 'Payment Admin', path: '/admin/payments', icon: CreditCard },
        { name: 'User Management', path: '/admin/users', icon: Users },
      ],
    },
    {
      title: 'Settings',
      items: [
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Pricing', path: '/pricing', icon: Tag },
      ],
    },
    {
      title: 'Info',
      items: [
        { name: 'About', path: '/about', icon: Info },
        { name: 'Contact', path: '/contact', icon: Mail },
        { name: 'Blog', path: '/blog', icon: BookOpen },
      ],
    },
  ];

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F3] text-[#1E242B]">
      {/* LEFT SIDEBAR */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } shrink-0 bg-[#FAF8F3] border-r border-[#ECE7DE] flex flex-col justify-between transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-30`}
      >
        {/* Brand & Collapse Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#ECE7DE]/60">
            <div className="flex items-center space-x-2.5 overflow-hidden cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DF9E16] to-[#B87E0E] flex items-center justify-center text-white shadow-sm shrink-0">
                <Shield className="w-5 h-5 fill-current" />
              </div>
              {!collapsed && (
                <span className="font-bold text-xl text-[#1E242B] tracking-tight">
                  JustiTalk
                </span>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-[#F2ECE1] transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links Scroll Container */}
          <div className="px-3 py-4 overflow-y-auto max-h-[calc(100vh-140px)] space-y-6">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-[11px] font-medium tracking-wider text-gray-400 uppercase">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
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
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#D49B19]' : 'text-gray-400 group-hover:text-gray-600'
                          } ${collapsed ? 'mx-auto' : 'mr-3'}`}
                        />
                        {!collapsed && <span>{item.name}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM USER PROFILE & LOGOUT */}
        <div className="p-3 border-t border-[#ECE7DE] bg-[#FAF8F3]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#ECE7DE]/70 shadow-xs">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DF9E16] to-[#F5CA65] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                <Shield className="w-4 h-4 fill-white" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#1E242B] truncate leading-tight">
                    {user?.full_name || 'Admin'}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {user?.subscription?.plan_name || 'Pro Plan'}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
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
      <div className={`flex-1 flex flex-col min-w-0 ${collapsed ? 'pl-20' : 'pl-64'} transition-all duration-300`}>
        {/* TOPBAR */}
        <header className="h-16 bg-[#FAF8F3]/90 backdrop-blur-md border-b border-[#ECE7DE] px-8 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-bold text-[#1E242B] tracking-tight">
              {location.pathname === '/' ? 'Dashboard' :
               location.pathname === '/ai-coach' ? 'AI Debate Coach' :
               location.pathname === '/argument-analysis' ? 'Argument Analysis' :
               location.pathname === '/fallacy-detector' ? 'Logical Fallacy Detector' :
               location.pathname === '/counterarguments' ? 'Counterargument Generator' :
               location.pathname === '/presentation-analysis' ? 'Presentation Analysis' :
               location.pathname === '/analytics' ? 'Performance Analytics' :
               location.pathname === '/live-debates' ? 'Live Debates' :
               location.pathname === '/profile' ? 'User Profile' :
               location.pathname === '/admin/users' ? 'User Management' : 'JustiTalk Platform'}
            </h1>
            <p className="text-xs text-gray-500">
              {location.pathname === '/' ? "Welcome back! Here's your debate activity overview." : 'AI-Powered Dialectic & Rhetoric Intelligence'}
            </p>
          </div>

          <div className="flex items-center space-x-3.5">
            {/* Refresh Button matching screenshot */}
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-[#ECE7DE] rounded-lg hover:bg-gray-50 shadow-xs transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-gray-500" />
              <span>Refresh</span>
            </button>

            {/* Theme Toggle icon */}
            <button
              title="Light theme active"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-[#F2ECE1] rounded-lg transition-colors"
            >
              <Sun className="w-4 h-4 text-[#D49B19]" />
            </button>

            {/* Notifications with counter */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-[#F2ECE1] rounded-lg transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D49B19] rounded-full ring-2 ring-white"></span>
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#ECE7DE] p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <span className="text-xs font-bold text-gray-800">Notifications</span>
                    <span className="text-[10px] text-[#D49B19] cursor-pointer">Mark all read</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-[#FBF9F4] rounded-lg border border-[#F4EFE6]">
                      <p className="font-semibold text-gray-800">New Comment</p>
                      <p className="text-gray-500 text-[11px]">Pro AI commented on your debate round.</p>
                      <span className="text-[10px] text-gray-400">2 mins ago</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                      <p className="font-semibold text-gray-800">Milestone Reached</p>
                      <p className="text-gray-500 text-[11px]">Completed 7 debate matches this month.</p>
                      <span className="text-[10px] text-gray-400">1 day ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluator Role Switcher Badge */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#FCF6E5] border border-[#F4E9C0] text-[#B87E0E] text-xs font-semibold hover:bg-[#F8EBC3] transition-colors shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 fill-current" />
                <span>{user?.role || 'Admin'}</span>
                <ChevronDown className="w-3 h-3 text-[#B87E0E]" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#ECE7DE] py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                    Switch Active Role
                  </div>
                  {['Administrator', 'Learner', 'Debate Coach', 'Educator'].map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        switchRole(role);
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-[#FCF6E5] hover:text-[#B87E0E] flex items-center justify-between transition-colors"
                    >
                      <span>{role}</span>
                      {user?.role === role && <Check className="w-3.5 h-3.5 text-[#D49B19]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Pill Badge matching screenshot */}
            <div className="flex items-center space-x-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-[#FCF6E5] border border-[#F4E9C0] flex items-center justify-center text-[#B87E0E] font-bold text-xs shadow-xs">
                <Shield className="w-4 h-4 fill-[#D49B19] text-[#D49B19]" />
              </div>
              <span className="text-xs font-semibold text-gray-800 hidden sm:inline-block">
                {user?.full_name || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT ROUTE */}
        <main className="p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
