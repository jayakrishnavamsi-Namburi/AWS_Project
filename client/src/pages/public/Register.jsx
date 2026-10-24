import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from '../../components/common';
import { Mail, Lock, User, GraduationCap, Building } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: 'Computer Science'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register({ ...formData, role: 'student' });
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Create Student Account</h2>
          <p className="text-xs text-slate-400">Register to take assigned proctored examinations</p>
        </div>

        <Card className="shadow-2xl border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              name="name"
              icon={User}
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Alex Mercer"
            />

            <Input
              label="Institutional Email"
              type="email"
              name="email"
              icon={Mail}
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="student@university.edu"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Student ID / Roll No."
                name="studentId"
                icon={GraduationCap}
                required
                value={formData.studentId}
                onChange={handleChange}
                placeholder="STU-2026-042"
              />

              <Input
                label="Department"
                name="department"
                icon={Building}
                required
                value={formData.department}
                onChange={handleChange}
                placeholder="Computer Science"
              />
            </div>

            <Input
              label="Password (min 8 characters)"
              type="password"
              name="password"
              icon={Lock}
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
              Complete Registration
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};
