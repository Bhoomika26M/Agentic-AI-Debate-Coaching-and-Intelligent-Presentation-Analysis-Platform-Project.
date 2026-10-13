import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setIsLoading(true);
    setError('');
    try {
      await login(demoEmail, 'Password123!');
      navigate(from, { replace: true });
    } catch (err) {
      setError('Could not log in with demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Spotlight Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-arena-amber/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-arena-prop/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-arena-opp/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-arena-amber to-arena-prop flex items-center justify-center font-serif font-black text-xl text-black">
            A
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-white">The Arena</span>
        </Link>
        <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Step into the Chamber</h2>
        <p className="mt-2 text-sm text-arena-muted">
          Master debate, logical forensics, and presentation confidence.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0"
      >
        <Card className="backdrop-blur-md bg-arena-bg-card/90 border-white/10 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-arena-opp/10 border border-arena-opp/30 flex items-center gap-2.5 text-arena-opp text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Enter The Arena
            </Button>
          </form>

          {/* Quick Demo Logins for Testing */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-arena-amber mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Test Access (Pre-Seeded)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin('learner1@arena.ai')}
                className="px-3 py-2 rounded-lg bg-arena-bg-elevated hover:bg-white/10 border border-white/5 text-arena-parchment text-left transition"
              >
                <div className="font-semibold text-white">Learner</div>
                <div className="text-[10px] text-arena-muted">Alexander Hayes</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('coach@arena.ai')}
                className="px-3 py-2 rounded-lg bg-arena-bg-elevated hover:bg-white/10 border border-white/5 text-arena-parchment text-left transition"
              >
                <div className="font-semibold text-white">Debate Coach</div>
                <div className="text-[10px] text-arena-muted">Marcus Aurelius</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('educator@arena.ai')}
                className="px-3 py-2 rounded-lg bg-arena-bg-elevated hover:bg-white/10 border border-white/5 text-arena-parchment text-left transition"
              >
                <div className="font-semibold text-white">Educator</div>
                <div className="text-[10px] text-arena-muted">Dr. Sophia Chen</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@arena.ai')}
                className="px-3 py-2 rounded-lg bg-arena-bg-elevated hover:bg-white/10 border border-white/5 text-arena-parchment text-left transition"
              >
                <div className="font-semibold text-white">Admin</div>
                <div className="text-[10px] text-arena-muted">Eleanor Vance</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-arena-muted">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-arena-amber hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
