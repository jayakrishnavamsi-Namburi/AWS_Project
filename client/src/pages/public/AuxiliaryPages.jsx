import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '../../components/common';
import { Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import { authService } from '../../services';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.forgotPassword(email);
      setSuccessMsg(res.message || 'Password reset link prepared.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request reset token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Reset Password</h2>
          <p className="text-xs text-slate-400">Enter your email to receive recovery instructions</p>
        </div>

        <Card className="shadow-2xl border-slate-800">
          {successMsg ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-xs text-emerald-300">{successMsg}</p>
              <Link to="/login" className="inline-block mt-2">
                <Button size="sm">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-rose-500/10 text-rose-300 text-xs">{error}</div>}
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
              />
              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export const ResetPassword = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <Card className="w-full max-w-md text-center p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Set New Password</h2>
        <p className="text-xs text-slate-400">Please provide your new password with at least 8 characters.</p>
        <Link to="/login">
          <Button size="sm">Return to Login</Button>
        </Link>
      </Card>
    </div>
  );
};

export const Unauthorized = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Unauthorized</h1>
      <p className="text-xs text-slate-400 max-w-md mb-6">
        You do not possess the required administrative or proctoring permissions to view this resource.
      </p>
      <Link to="/">
        <Button variant="secondary">Return to Safety</Button>
      </Link>
    </div>
  );
};

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <span className="text-6xl font-extrabold text-slate-800 font-mono mb-2">404</span>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-md mb-6">
        The requested URL was not found on this assessment server.
      </p>
      <Link to="/">
        <Button variant="primary">Return Home</Button>
      </Link>
    </div>
  );
};
