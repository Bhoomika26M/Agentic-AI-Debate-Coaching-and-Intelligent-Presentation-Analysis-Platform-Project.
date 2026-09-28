import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, UserCheck, Shield, GraduationCap, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, quickSwitchRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'learner') navigate('/learner/dashboard');
      else if (user.role === 'coach') navigate('/coach/dashboard');
      else if (user.role === 'educator') navigate('/educator/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/learner/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError('');
    setLoading(true);
    try {
      await quickSwitchRole(role);
      if (role === 'learner') navigate('/learner/dashboard');
      else if (role === 'coach') navigate('/coach/dashboard');
      else if (role === 'educator') navigate('/educator/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 items-center justify-center shadow-lg shadow-primary-500/25 mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Sign in to DebateAI</h2>
        <p className="mt-2 text-sm text-slate-400">
          Or <Link to="/register" className="font-medium text-primary-400 hover:text-primary-300">create a new learner account</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Quick Demo Login Box */}
        <div className="bg-slate-800/90 border border-primary-500/30 rounded-2xl p-4 shadow-xl">
          <p className="text-xs font-bold text-primary-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-primary-400" /> 1-Click Evaluation Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('learner')}
              type="button"
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <BookOpen className="w-4 h-4 text-primary-400 shrink-0" />
              <div>
                <div>Learner</div>
                <div className="text-[10px] text-slate-400 font-normal">Student Portal</div>
              </div>
            </button>
            <button
              onClick={() => handleDemoLogin('coach')}
              type="button"
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div>Debate Coach</div>
                <div className="text-[10px] text-slate-400 font-normal">Coach Hub</div>
              </div>
            </button>
            <button
              onClick={() => handleDemoLogin('educator')}
              type="button"
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <Users className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div>Educator</div>
                <div className="text-[10px] text-slate-400 font-normal">Class Analytics</div>
              </div>
            </button>
            <button
              onClick={() => handleDemoLogin('admin')}
              type="button"
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all text-left"
            >
              <Shield className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <div>Administrator</div>
                <div className="text-[10px] text-slate-400 font-normal">System Telemetry</div>
              </div>
            </button>
          </div>
        </div>

        {/* Standard Email/Password Form */}
        <Card className="p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
