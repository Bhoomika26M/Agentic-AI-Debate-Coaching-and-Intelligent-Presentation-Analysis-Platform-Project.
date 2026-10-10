import React, { useState, useEffect } from 'react';
import { 
  Shield, User, Award, BookOpen, Clock, Calendar, CheckCircle2, 
  AlertCircle, ChevronRight, MessageSquare, Play, Sparkles, Filter, 
  Users, BarChart3, Database, Layers, ArrowRight, PlusCircle, LogIn, 
  LogOut, RefreshCw, Compass, Target, Volume2, Mic
} from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ email: '', password: '', full_name: '', role: 'Learner' });
  const [authError, setAuthError] = useState('');

  // Active view
  const [currentTab, setCurrentTab] = useState('sessions'); // 'sessions' | 'topics' | 'skills' | 'formats' | 'architecture'

  // Data states
  const [sessions, setSessions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [formats, setFormats] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userSkills, setUserSkills] = useState(null);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modals
  const [scheduleModal, setScheduleModal] = useState(false);
  const [newTopicModal, setNewTopicModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);

  // Form states
  const [sessionForm, setSessionForm] = useState({
    topic_id: '',
    debate_format: 'Oxford Debate',
    session_title: '',
    scheduled_start: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    initial_position: 'proposition'
  });

  const [topicForm, setTopicForm] = useState({
    title: '',
    motion_text: 'This House Would ',
    category: 'AI & Technology',
    difficulty_level: 'Intermediate',
    proposition_stance: '',
    opposition_stance: ''
  });

  const [profileForm, setProfileForm] = useState({
    experience_level: 'Novice',
    preferred_topics: [],
    presentation_domains: [],
    learning_goals: '',
    coaching_preferences: 'Socratic & Constructive',
    bio: ''
  });

  // Notification / Alert banner
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper auth headers
  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Fetch initial data
  useEffect(() => {
    fetchFormats();
    fetchTopics();
    fetchSessions();
  }, []);

  // Fetch user data when token changes
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchProfileAndSkills();
    } else {
      // Auto login as demo learner if no token
      handleDemoLogin('learner@debatecoach.ai');
    }
  }, [token]);

  const fetchFormats = async () => {
    try {
      const res = await fetch(`${API_BASE}/debates/formats`);
      if (res.ok) {
        const data = await res.json();
        setFormats(data);
      }
    } catch (e) {
      console.error('Formats fetch error:', e);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${API_BASE}/debates/topics`);
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
        if (data.length > 0 && !sessionForm.topic_id) {
          setSessionForm(prev => ({ ...prev, topic_id: data[0].id }));
        }
      }
    } catch (e) {
      console.error('Topics fetch error:', e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/debates/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error('Sessions fetch error:', e);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
      }
    } catch (e) {
      console.error('User fetch error:', e);
    }
  };

  const fetchProfileAndSkills = async () => {
    try {
      const pRes = await fetch(`${API_BASE}/profiles/me`, { headers: getHeaders() });
      if (pRes.ok) {
        const pData = await pRes.json();
        setUserProfile(pData);
        setProfileForm({
          experience_level: pData.experience_level,
          preferred_topics: pData.preferred_topics || [],
          presentation_domains: pData.presentation_domains || [],
          learning_goals: pData.learning_goals || '',
          coaching_preferences: pData.coaching_preferences || 'Socratic & Constructive',
          bio: pData.bio || ''
        });
      }

      const sRes = await fetch(`${API_BASE}/skills/me`, { headers: getHeaders() });
      if (sRes.ok) {
        const sData = await sRes.json();
        setUserSkills(sData);
      }
    } catch (e) {
      console.error('Profile/Skills fetch error:', e);
    }
  };

  // Quick Demo Login Handler
  const handleDemoLogin = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setUser({ id: data.user_id, email: data.email, full_name: data.full_name, role: data.role });
        showToast(`Switched active persona to ${data.full_name} (${data.role})`);
      }
    } catch (e) {
      console.error('Demo login error:', e);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = authMode === 'login' 
      ? { email: authForm.email, password: authForm.password }
      : authForm;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || 'Authentication failed');
        return;
      }
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      setUser({ id: data.user_id, email: data.email, full_name: data.full_name, role: data.role });
      setAuthModal(false);
      showToast(`Welcome, ${data.full_name}!`);
    } catch (e) {
      setAuthError('Connection error. Please verify backend is running.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setUserProfile(null);
    setUserSkills(null);
    showToast('Signed out successfully.');
  };

  // Schedule Session Submit
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/debates/sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(sessionForm)
      });
      if (res.ok) {
        showToast('Debate session scheduled successfully!');
        setScheduleModal(false);
        fetchSessions();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to schedule session', 'error');
      }
    } catch (e) {
      showToast('Error connecting to backend', 'error');
    }
  };

  // Create Topic Submit
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/debates/topics`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(topicForm)
      });
      if (res.ok) {
        showToast('Debate motion created successfully!');
        setNewTopicModal(false);
        fetchTopics();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to create topic', 'error');
      }
    } catch (e) {
      showToast('Error connecting to backend', 'error');
    }
  };

  // Update Profile Submit
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/profiles/me`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        showToast('Profile and preferences updated!');
        setEditProfileModal(false);
        fetchProfileAndSkills();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Update failed', 'error');
      }
    } catch (e) {
      showToast('Error connecting to backend', 'error');
    }
  };

  // Session Action: Join position
  const handleJoinPosition = async (sessionId, position) => {
    try {
      const res = await fetch(`${API_BASE}/debates/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ position, speaking_order: 1 })
      });
      if (res.ok) {
        showToast(`Assigned as ${position.toUpperCase()}`);
        fetchSessions();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Could not join session', 'error');
      }
    } catch (e) {
      showToast('Error connecting to server', 'error');
    }
  };

  // Session Action: Update Status (Start / Complete)
  const handleUpdateSessionStatus = async (sessionId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/debates/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Session marked as ${newStatus.toUpperCase()}`);
        fetchSessions();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Status transition denied', 'error');
      }
    } catch (e) {
      showToast('Error connecting to server', 'error');
    }
  };

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    if (selectedFormatFilter !== 'ALL' && s.debate_format !== selectedFormatFilter) return false;
    if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-bounce ${
          toast.type === 'error' 
            ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' 
            : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                Agentic AI Debate Coach
              </div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">
                Presentation & Argumentation Intelligence
              </div>
            </div>
          </div>

          {/* Quick Demo Persona Switcher */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-xs">
            <span className="text-slate-400 font-medium">Switch Persona:</span>
            <button 
              onClick={() => handleDemoLogin('learner@debatecoach.ai')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${user?.role === 'Learner' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}>
              Alex (Learner)
            </button>
            <button 
              onClick={() => handleDemoLogin('coach@debatecoach.ai')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${user?.role === 'Debate Coach' ? 'bg-violet-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}>
              Dr. Marcus (Coach)
            </button>
            <button 
              onClick={() => handleDemoLogin('educator@debatecoach.ai')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${user?.role === 'Educator' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}>
              Prof. Elena (Educator)
            </button>
            <button 
              onClick={() => handleDemoLogin('admin@debatecoach.ai')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${user?.role === 'Administrator' ? 'bg-amber-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}>
              Admin
            </button>
          </div>

          {/* User Profile / Auth State */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-200">{user.full_name}</div>
                  <div className="text-xs font-mono text-indigo-400">{user.role}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
                  {user.full_name.charAt(0)}
                </div>
                <button 
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/30">
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-slate-800/60 no-scrollbar">
          {[
            { id: 'sessions', label: 'Debate Sessions & Scheduling', icon: Calendar },
            { id: 'topics', label: 'Motions & Topics', icon: BookOpen },
            { id: 'skills', label: 'Profile & Skill Matrix', icon: Award },
            { id: 'formats', label: 'Debate Formats & Rules', icon: Compass },
            { id: 'architecture', label: 'Architecture & DB Schema', icon: Layers },
          ].map(tab => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  active 
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ================= TAB 1: SESSIONS & SCHEDULING ================= */}
        {currentTab === 'sessions' && (
          <div className="space-y-6">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Debate Sessions & Arena</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Schedule matches, assign speaker positions, and run AI debate sparring rounds.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30">
                  <PlusCircle className="w-4 h-4" />
                  <span>Schedule Debate</span>
                </button>
                <button
                  onClick={fetchSessions}
                  className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
                  title="Refresh Sessions">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Filter className="w-4 h-4" />
                <span>Filter By Format:</span>
              </div>
              <select
                value={selectedFormatFilter}
                onChange={e => setSelectedFormatFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500">
                <option value="ALL">All Formats ({formats.length})</option>
                {formats.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 text-slate-400 ml-auto">
                <span>Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500">
                  <option value="ALL">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Sessions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSessions.map(session => {
                const isProp = session.participants.some(p => p.user_id === user?.id && p.position === 'proposition');
                const isOpp = session.participants.some(p => p.user_id === user?.id && p.position === 'opposition');

                return (
                  <div key={session.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-slate-700 transition-all shadow-md flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="p-5 border-b border-slate-800/80 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                              {session.debate_format}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                              session.status === 'scheduled' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50' :
                              session.status === 'in_progress' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 animate-pulse' :
                              session.status === 'completed' ? 'bg-blue-950/80 text-blue-300 border border-blue-800/50' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white tracking-tight">{session.session_title}</h3>
                        </div>
                        <div className="text-right text-xs text-slate-400 font-mono">
                          <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                          {new Date(session.scheduled_start).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Motion details */}
                      <div className="p-5 space-y-3">
                        {session.topic && (
                          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                            <span className="text-indigo-400 font-semibold block mb-1">Formal Motion:</span>
                            <p className="text-slate-300 italic">"{session.topic.motion_text}"</p>
                          </div>
                        )}

                        {/* Speaker Positions Lineup */}
                        <div>
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Speaker Lineup & Positions</span>
                            <span className="text-slate-500 text-[11px]">{session.participants.length} Participant(s)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Proposition Box */}
                            <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs">
                              <span className="text-indigo-400 font-bold block text-[10px] uppercase">Proposition (Affirmative)</span>
                              {session.participants.filter(p => p.position === 'proposition').length > 0 ? (
                                session.participants.filter(p => p.position === 'proposition').map(p => (
                                  <div key={p.id} className="text-slate-200 mt-1 font-medium truncate">
                                    • {p.user_name}
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500 italic block mt-1">Open position</span>
                              )}
                            </div>

                            {/* Opposition Box */}
                            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs">
                              <span className="text-rose-400 font-bold block text-[10px] uppercase">Opposition (Negative)</span>
                              {session.participants.filter(p => p.position === 'opposition').length > 0 ? (
                                session.participants.filter(p => p.position === 'opposition').map(p => (
                                  <div key={p.id} className="text-slate-200 mt-1 font-medium truncate">
                                    • {p.user_name}
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500 italic block mt-1">Open position</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 bg-slate-950/50 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!isProp && (
                          <button
                            onClick={() => handleJoinPosition(session.id, 'proposition')}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors">
                            Take Proposition
                          </button>
                        )}
                        {!isOpp && (
                          <button
                            onClick={() => handleJoinPosition(session.id, 'opposition')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors">
                            Take Opposition
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {session.status === 'scheduled' && (
                          <button
                            onClick={() => handleUpdateSessionStatus(session.id, 'in_progress')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm">
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Session</span>
                          </button>
                        )}
                        {session.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateSessionStatus(session.id, 'completed')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete & Score</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MOTIONS & TOPICS ================= */}
        {currentTab === 'topics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Debate Motions & Case Repository</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Structured motions with proposition and opposition rationales across 6 domain disciplines.
                </p>
              </div>
              {user && ['Debate Coach', 'Educator', 'Administrator'].includes(user.role) && (
                <button
                  onClick={() => setNewTopicModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30">
                  <PlusCircle className="w-4 h-4" />
                  <span>Draft New Motion</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topics.map(topic => (
                <div key={topic.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-950 text-violet-300 border border-violet-800/60">
                          {topic.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300">
                          {topic.difficulty_level}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{topic.title}</h3>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-sm">
                    <span className="text-indigo-400 font-semibold block mb-1">Motion Resolution:</span>
                    <p className="text-slate-200 font-medium">"{topic.motion_text}"</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    {topic.proposition_stance && (
                      <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40">
                        <span className="text-indigo-400 font-bold block mb-1 uppercase tracking-wider">Proposition Case:</span>
                        <p className="text-slate-300">{topic.proposition_stance}</p>
                      </div>
                    )}
                    {topic.opposition_stance && (
                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40">
                        <span className="text-rose-400 font-bold block mb-1 uppercase tracking-wider">Opposition Case:</span>
                        <p className="text-slate-300">{topic.opposition_stance}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setSessionForm(prev => ({
                          ...prev,
                          topic_id: topic.id,
                          session_title: `Debate Match: ${topic.title}`
                        }));
                        setScheduleModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                      <span>Schedule Match on this Motion</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: PROFILE & SKILL MATRIX ================= */}
        {currentTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Competency Matrix & Skill Analytics</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Weighted 5-pillar debate performance scoring model, delivery metrics, and coaching profiles.
                </p>
              </div>
              <button
                onClick={() => setEditProfileModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700">
                Edit Learning Profile
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-xl text-white">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{user?.full_name}</h3>
                    <p className="text-xs text-indigo-400 font-mono">{user?.role} • {userProfile?.experience_level} Tier</p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Debate Domains & Topics:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile?.preferred_topics?.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Presentation Format:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile?.presentation_domains?.map((d, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Learning Target:</span>
                    <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 italic">
                      "{userProfile?.learning_goals || 'Master structured argumentation and rapid rebuttal formulation.'}"
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Coaching Preference:</span>
                    <span className="text-emerald-400 font-medium">{userProfile?.coaching_preferences}</span>
                  </div>
                </div>
              </div>

              {/* Skills Scoring Breakdown (2 Columns) */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Weighted Debate Performance Model</h3>
                    <p className="text-xs text-slate-400">Calculated strictly against the canonical 5-factor scoring rubric</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                      {userSkills?.overall_performance_score || 74.0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Overall Score / 100</div>
                  </div>
                </div>

                {/* Progress bars for 5 pillars */}
                <div className="space-y-4">
                  {[
                    { label: 'Argument Quality', weight: '30%', val: userSkills?.argument_quality || 82, color: 'from-indigo-500 to-indigo-600' },
                    { label: 'Evidence Usage & Verification', weight: '20%', val: userSkills?.evidence_usage || 74, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Logical Consistency & Syllogism', weight: '20%', val: userSkills?.logical_consistency || 85, color: 'from-emerald-500 to-teal-500' },
                    { label: 'Rebuttal & Counterargument Speed', weight: '15%', val: userSkills?.rebuttal_effectiveness || 70, color: 'from-amber-500 to-orange-500' },
                    { label: 'Communication, Clarity & Rhetoric', weight: '15%', val: userSkills?.communication_skills || 78, color: 'from-violet-500 to-purple-500' },
                  ].map((skill, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300">
                          {skill.label} <span className="text-slate-500 font-normal">({skill.weight} weight)</span>
                        </span>
                        <span className="font-mono font-bold text-indigo-300">{skill.val} / 100</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${skill.color} transition-all duration-500`}
                          style={{ width: `${skill.val}%` }}>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Speech & Presentation Analytics Cards */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <Volume2 className="w-4 h-4 mx-auto text-indigo-400 mb-1" />
                    <div className="text-lg font-bold text-white">{userSkills?.speech_pace_wpm || 138}</div>
                    <div className="text-[11px] text-slate-400">Words / Min (Optimal)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <Mic className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                    <div className="text-lg font-bold text-white">{userSkills?.confidence_score || 80}%</div>
                    <div className="text-[11px] text-slate-400">Confidence Metric</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <Award className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                    <div className="text-lg font-bold text-white">{userSkills?.debates_completed || 8}</div>
                    <div className="text-[11px] text-slate-400">Completed Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: DEBATE FORMATS & RULES ================= */}
        {currentTab === 'formats' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-slate-800">
              <h1 className="text-2xl font-bold text-white tracking-tight">Canonical Debate Frameworks</h1>
              <p className="text-slate-400 text-sm mt-1">
                The platform supports 6 distinct formal debate formats with custom speaking turns, time bounds, and AI simulation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formats.map(f => (
                <div key={f.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                        Team Size: {f.team_size} per side
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{f.name}</h3>
                    <p className="text-slate-300 text-xs leading-relaxed mb-4">{f.description}</p>
                    
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90">
                      <span className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider block mb-2">Round Order:</span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {f.rounds.map((round, rIdx) => (
                          <li key={rIdx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span>{round}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setSessionForm(prev => ({ ...prev, debate_format: f.name }));
                        setCurrentTab('sessions');
                        setScheduleModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium transition-all text-center">
                      Launch {f.name}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: ARCHITECTURE & DB SCHEMA ================= */}
        {currentTab === 'architecture' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-slate-800">
              <h1 className="text-2xl font-bold text-white tracking-tight">System Architecture & Relational Schema</h1>
              <p className="text-slate-400 text-sm mt-1">
                Milestone 1 architectural blueprints, role-based access design, and entity-relationship specifications.
              </p>
            </div>

            {/* Architecture Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span>Role-Based Access Control (RBAC)</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-indigo-400 font-bold">1. Learner:</span> Participates in debates, reviews personal weighted scores, customizes learning goals, engages with AI debate opponents.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-violet-400 font-bold">2. Debate Coach:</span> Drafts topics/motions, creates and schedules tournaments, adjudicates matches, recalibrates student skill scores.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-emerald-400 font-bold">3. Educator:</span> Inspects classroom cohorts, monitors team rankings, assigns curriculum debate resolutions.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-amber-400 font-bold">4. Administrator:</span> System governance, LLM provider routing, user role elevations, security audits.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <span>Agentic Pipeline Execution Flow</span>
                </h3>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
                  <div className="text-indigo-400 font-bold">Step 1: Session Orchestration</div>
                  <p className="text-[11px] text-slate-400">FastAPI creates debate room, establishes positions & format rules.</p>
                  <div className="text-indigo-400 font-bold">Step 2: Argument & Fallacy Engine (Milestone 2)</div>
                  <p className="text-[11px] text-slate-400">Extracts claims, evidence validity, and checks 8 canonical fallacies.</p>
                  <div className="text-indigo-400 font-bold">Step 3: AI Opponent Sparring (Milestone 3)</div>
                  <p className="text-[11px] text-slate-400">Agent synthesizes rebuttals, policy counterplans, and Socratic challenges.</p>
                  <div className="text-indigo-400 font-bold">Step 4: Presentation & Scoring (Milestone 4)</div>
                  <p className="text-[11px] text-slate-400">Analyzes prosody, filler words, speech pace, and publishes feedback.</p>
                </div>
              </div>
            </div>

            {/* Database Tables Overview */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <span>Core Relational Database Tables</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-sm mb-1">users</div>
                  <div className="text-slate-400 text-[11px]">id, email, hashed_password, full_name, role, is_active, created_at</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-sm mb-1">profiles</div>
                  <div className="text-slate-400 text-[11px]">user_id, experience_level, preferred_topics, presentation_domains, learning_goals</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-sm mb-1">user_skills</div>
                  <div className="text-slate-400 text-[11px]">user_id, argument_quality, evidence_usage, logical_consistency, rebuttal_eff, comm_skills</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-sm mb-1">debate_topics</div>
                  <div className="text-slate-400 text-[11px]">id, title, motion_text, category, difficulty_level, proposition_stance, opposition_stance</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-sm mb-1">debate_sessions</div>
                  <div className="text-slate-400 text-[11px]">id, topic_id, debate_format, session_title, status, scheduled_start, actual_start</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-indigo-400 font-bold text-sm mb-1">session_participants</div>
                  <div className="text-slate-400 text-[11px]">session_id, user_id, position (prop/opp/adj/obs), speaking_order, score_awarded</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL 1: AUTHENTICATION ================= */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {authMode === 'login' ? 'Sign In to Debate Coach' : 'Create an Account'}
              </h2>
              <button onClick={() => setAuthModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'register' && (
                <div>
                  <label className="text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authForm.full_name}
                    onChange={e => setAuthForm({ ...authForm, full_name: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  placeholder="user@debatecoach.ai"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="text-slate-400 block mb-1">Platform Role</label>
                  <select
                    value={authForm.role}
                    onChange={e => setAuthForm({ ...authForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                    <option value="Learner">Learner (Debater / Speaker)</option>
                    <option value="Debate Coach">Debate Coach</option>
                    <option value="Educator">Educator</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30">
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              {authMode === 'login' ? (
                <span>Don't have an account? <button onClick={() => setAuthMode('register')} className="text-indigo-400 hover:underline">Register</button></span>
              ) : (
                <span>Already have an account? <button onClick={() => setAuthMode('login')} className="text-indigo-400 hover:underline">Sign In</button></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: SCHEDULE DEBATE ================= */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Schedule Debate Match</h2>
              <button onClick={() => setScheduleModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={sessionForm.session_title}
                  onChange={e => setSessionForm({ ...sessionForm, session_title: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  placeholder="e.g. Cambridge Oxford Prep Duel"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Debate Motion / Topic</label>
                <select
                  value={sessionForm.topic_id}
                  onChange={e => setSessionForm({ ...sessionForm, topic_id: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.title} - ({t.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Debate Format</label>
                  <select
                    value={sessionForm.debate_format}
                    onChange={e => setSessionForm({ ...sessionForm, debate_format: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                    {formats.map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Scheduled Start</label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionForm.scheduled_start}
                    onChange={e => setSessionForm({ ...sessionForm, scheduled_start: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">My Speaking Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionForm({ ...sessionForm, initial_position: 'proposition' })}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      sessionForm.initial_position === 'proposition' 
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                    Proposition (Affirmative)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionForm({ ...sessionForm, initial_position: 'opposition' })}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      sessionForm.initial_position === 'opposition' 
                        ? 'bg-rose-600/30 border-rose-500 text-rose-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                    Opposition (Negative)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30">
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CREATE TOPIC ================= */}
      {newTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Draft Formal Debate Motion</h2>
              <button onClick={() => setNewTopicModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Short Title</label>
                <input
                  type="text"
                  required
                  value={topicForm.title}
                  onChange={e => setTopicForm({ ...topicForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  placeholder="e.g. AI Governance Liability"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Formal Motion Resolution</label>
                <textarea
                  required
                  rows="2"
                  value={topicForm.motion_text}
                  onChange={e => setTopicForm({ ...topicForm, motion_text: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  placeholder="This House Would..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select
                    value={topicForm.category}
                    onChange={e => setTopicForm({ ...topicForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                    <option value="AI & Technology">AI & Technology</option>
                    <option value="Ethics">Ethics</option>
                    <option value="Economics">Economics</option>
                    <option value="Climate Policy">Climate Policy</option>
                    <option value="Law & Governance">Law & Governance</option>
                    <option value="Healthcare">Healthcare</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={topicForm.difficulty_level}
                    onChange={e => setTopicForm({ ...topicForm, difficulty_level: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Proposition Core Stance</label>
                <textarea
                  rows="2"
                  value={topicForm.proposition_stance}
                  onChange={e => setTopicForm({ ...topicForm, proposition_stance: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  placeholder="Primary affirmative justifications..."
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Opposition Core Stance</label>
                <textarea
                  rows="2"
                  value={topicForm.opposition_stance}
                  onChange={e => setTopicForm({ ...topicForm, opposition_stance: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  placeholder="Primary negative rebuttals..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewTopicModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30">
                  Publish Motion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: EDIT PROFILE ================= */}
      {editProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Debater Profile</h2>
              <button onClick={() => setEditProfileModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Experience Level</label>
                <select
                  value={profileForm.experience_level}
                  onChange={e => setProfileForm({ ...profileForm, experience_level: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                  <option value="Novice">Novice</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Champion">Champion</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Learning Goals</label>
                <textarea
                  rows="2"
                  value={profileForm.learning_goals}
                  onChange={e => setProfileForm({ ...profileForm, learning_goals: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  placeholder="e.g. Sharpen counterarguments and eliminate hasty generalizations."
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Coaching Preference</label>
                <select
                  value={profileForm.coaching_preferences}
                  onChange={e => setProfileForm({ ...profileForm, coaching_preferences: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
                  <option value="Socratic & Constructive">Socratic & Constructive</option>
                  <option value="Direct Fallacy Deconstruction">Direct Fallacy Deconstruction</option>
                  <option value="Speed & Rebuttal Drills">Speed & Rebuttal Drills</option>
                  <option value="Rubric-Based Evaluation">Rubric-Based Evaluation</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Agentic AI Debate Coach & Presentation Analysis Platform • Milestone 1
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            FastAPI + SQLAlchemy + React + Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
}
