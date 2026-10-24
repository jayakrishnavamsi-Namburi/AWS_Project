import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  Users,
  Video,
  BarChart3,
  Award,
  ShieldAlert,
  Settings
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/exams', label: 'Examinations', icon: FileText },
    { to: '/admin/questions', label: 'Question Bank', icon: HelpCircle },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/live-monitor', label: 'Live Sessions', icon: Video },
    { to: '/admin/analytics', label: 'Analytics & Reports', icon: BarChart3 }
  ];

  const proctorLinks = [
    { to: '/proctor/dashboard', label: 'Active Invigilation', icon: Video },
    { to: '/admin/exams', label: 'Exam Schedules', icon: FileText }
  ];

  const studentLinks = [
    { to: '/student/dashboard', label: 'My Assessments', icon: LayoutDashboard },
    { to: '/student/exams', label: 'Available Exams', icon: FileText },
    { to: '/student/results', label: 'My Results', icon: Award }
  ];

  const links =
    role === 'admin' ? adminLinks : role === 'proctor' ? proctorLinks : studentLinks;

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 flex flex-col shrink-0">
      <div className="p-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3">
          Navigation
        </span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Proctor Engine
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Local Computer Vision & Audio ML Telemetry active.
          </p>
        </div>
      </div>
    </aside>
  );
};
