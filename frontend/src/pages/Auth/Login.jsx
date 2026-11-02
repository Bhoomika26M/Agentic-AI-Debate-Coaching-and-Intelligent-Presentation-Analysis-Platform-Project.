import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect query parameters (e.g. ?logged_out=true or ?session_expired=true or ?registered=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('logged_out') === 'true') {
      setFlashMessage({
        type: 'success',
        text: 'You have been logged out successfully.'
      });
    } else if (params.get('session_expired') === 'true') {
      setFlashMessage({
        type: 'warning',
        text: 'Your session has expired. Please sign in again.'
      });
    } else if (params.get('registered') === 'true') {
      setFlashMessage({
        type: 'success',
        text: 'Account created successfully! Please sign in with your credentials.'
      });
    }
  }, [location.search]);

  // If already authenticated, redirect to destination or home
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address format.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, password, rememberMe);
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (!err.response) {
        setError('Unable to reach the JustiTalk backend service. Please check your connection.');
      } else {
        setError('An unexpected authentication error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSubmitted(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSubmitted(false);
      setForgotEmail('');
      setFlashMessage({
        type: 'info',
        text: `If an account with ${forgotEmail} exists, password reset instructions have been dispatched.`
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card space-y-6">
        {/* BRANDING HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#DF9E16] to-[#B87E0E] flex items-center justify-center text-white mx-auto shadow-sm">
            <Shield className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-black text-[#1E242B] tracking-tight">JustiTalk</h1>
          <p className="text-xs text-gray-500">
            Agentic AI Debate Coach & Presentation Analysis Platform
          </p>
        </div>

        {/* FLASH NOTIFICATION */}
        {flashMessage && (
          <div
            className={`p-3 text-xs rounded-xl border flex items-start space-x-2.5 ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : flashMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{flashMessage.text}</span>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
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
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-[11px] text-[#B87E0E] hover:underline font-semibold"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
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

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#D49B19] focus:ring-[#D49B19] border-[#ECE7DE]"
              />
              <span className="text-xs text-gray-600 font-medium">Remember me on this device</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to JustiTalk'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* REGISTER REDIRECT */}
        <div className="text-center text-xs text-gray-500 pt-1">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-[#D49B19] font-bold hover:underline">
            Create an account
          </Link>
        </div>

        {/* QUICK DEMO ROLE BUTTONS */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 block text-center">
            Instant Demo Sign-In
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemo('learner@justitalk.com')}
              className="py-1.5 px-2 bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] rounded-lg text-gray-700 font-semibold text-center transition-colors"
            >
              🎓 Learner
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('coach@justitalk.com')}
              className="py-1.5 px-2 bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] rounded-lg text-gray-700 font-semibold text-center transition-colors"
            >
              ⚖️ Debate Coach
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('educator@justitalk.com')}
              className="py-1.5 px-2 bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] rounded-lg text-gray-700 font-semibold text-center transition-colors"
            >
              📚 Educator
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@justitalk.com')}
              className="py-1.5 px-2 bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] rounded-lg text-gray-700 font-semibold text-center transition-colors"
            >
              🛡️ Administrator
            </button>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#ECE7DE] shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-[#1E242B]">Reset JustiTalk Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Enter your registered JustiTalk email address to receive password reset instructions.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                placeholder="you@institution.edu"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#ECE7DE] text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotSubmitted}
                  className="px-4 py-1.5 rounded-lg bg-[#D49B19] text-white text-xs font-bold hover:bg-[#B87E0E]"
                >
                  {forgotSubmitted ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
