import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('LEARNER');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        role,
      });
      // New users go to onboarding to pick experience level and debate topics!
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-arena-amber to-arena-prop flex items-center justify-center font-serif font-black text-xl text-black">
            A
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-white">The Arena</span>
        </Link>
        <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Create your Seat</h2>
        <p className="mt-2 text-sm text-arena-muted">
          Join the premier arena for debating, critical reasoning, and speech excellence.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Maya Patel"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                Primary Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-arena-bg-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-arena-parchment focus:outline-none focus:border-arena-amber focus:ring-1 focus:ring-arena-amber transition-all"
              >
                <option value="LEARNER">Learner / Debater</option>
                <option value="DEBATE_COACH">Debate Coach</option>
                <option value="EDUCATOR">Educator / Professor</option>
              </select>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
              Begin Journey
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-arena-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-arena-amber hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};