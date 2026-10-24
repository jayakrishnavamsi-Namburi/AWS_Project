import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from '../../components/common';
import { Mail, Lock, ShieldCheck, UserCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await login({ email, password });
      const role = data.user.role;
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'proctor') {
        navigate('/proctor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@secureproctor.com');
      setPassword('Password@123');
    } else if (role === 'proctor') {
      setEmail('proctor@secureproctor.com');
      setPassword('Password@123');
    } else if (role === 'student') {
      setEmail('student1@university.edu');
      setPassword('Password@123');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 shadow-lg shadow-brand-500/25 mb-2">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Sign in to SecureProctor</h2>
          <p className="text-xs text-slate-400">Access your assessment portal and exam sessions</p>
        </div>

        <Card className="shadow-2xl border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@institution.edu"
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

            <div className="flex items-center justify-between text-xs">
              <Link to="/forgot-password" className="text-brand-400 hover:text-brand-300 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Quick Demo Fillers for Evaluator Ease */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
              Quick Test Autofill (Demo Accounts)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin')}
                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 text-center transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('proctor')}
                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 text-center transition-colors"
              >
                Proctor
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('student')}
                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 text-center transition-colors"
              >
                Student
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">
          New student?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
            Create an assessment account
          </Link>
        </p>
      </div>
    </div>
  );
};
