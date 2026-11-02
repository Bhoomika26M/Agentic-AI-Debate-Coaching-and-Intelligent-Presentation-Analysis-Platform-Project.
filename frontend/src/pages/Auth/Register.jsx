import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Learner');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    if (role === 'Administrator') {
      setError('Administrator accounts cannot be registered publicly.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: cleanName,
        email: cleanEmail,
        password,
        role
      });
      // Redirect to login with confirmation parameter
      navigate('/login?registered=true', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'An account with this email address already exists.');
      } else if (err.response?.status === 403) {
        setError(err.response.data.detail || 'This role cannot be selected via public registration.');
      } else {
        setError('Failed to create account. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card space-y-6">
        {/* BRANDING HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#DF9E16] to-[#B87E0E] flex items-center justify-center text-white mx-auto shadow-sm">
            <Shield className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-black text-[#1E242B] tracking-tight">Create JustiTalk Account</h1>
          <p className="text-xs text-gray-500">
            Join the AI-powered dialectic and presentation analysis platform
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* REGISTRATION FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Jordan Hayes"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19]"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jordan@institution.edu"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Re-enter your password"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19]"
              />
            </div>
          </div>

          {/* Select User Role (Learner, Debate Coach, Educator) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              User Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
            >
              <option value="Learner">Learner (Debate & Speech Training)</option>
              <option value="Debate Coach">Debate Coach (Mentoring & Student Evaluations)</option>
              <option value="Educator">Educator (Classroom & Cohort Analytics)</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* LOGIN LINK */}
        <div className="text-center text-xs text-gray-500 pt-1">
          Already have an account?{' '}
          <Link to="/login" className="text-[#D49B19] font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
