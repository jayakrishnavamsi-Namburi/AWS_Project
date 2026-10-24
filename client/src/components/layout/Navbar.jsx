import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, User, Bell } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 h-16 flex items-center px-4 sm:px-6 justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span>Secure<span className="text-brand-400 font-extrabold">Proctor</span></span>
        </Link>
        <span className="hidden md:inline-flex text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Enterprise v1.0
        </span>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-200">{user.name}</span>
              <span className="text-xs uppercase tracking-wider font-mono text-brand-400 font-medium">
                {user.role}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg shadow-md shadow-brand-500/20 transition-all"
            >
              Student Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
