import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Alert } from '../../components/common/Alert';
import { Sparkles, ArrowRight, Lock, User } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('alex_debater');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#172554] text-white items-center justify-center shadow-sm mx-auto mb-2">
            <Sparkles className="w-6 h-6 text-blue-200" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Welcome to DebateIQ
          </h1>
          <p className="text-sm text-slate-500">
            Sign in to your AI debate coach & presentation platform
          </p>
        </div>

        {/* Clean Light Login Card */}
        <Card className="border-slate-200 shadow-md">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              icon={User}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_debater"
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full justify-center"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Demonstration Helper Note */}
          <div className="mt-6 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-[#172554]">Demo Accounts Available:</div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span><strong>Learner:</strong> alex_debater</span> &bull; 
              <span><strong>Coach:</strong> sarah_coach</span>
            </div>
            <div className="text-[11px] text-slate-400">Password: password123</div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
