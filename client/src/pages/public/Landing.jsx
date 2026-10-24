import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Eye, Mic, Smartphone, Lock, Award, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common';

export const Landing = () => {
  return (
    <div className="space-y-20 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Enterprise AI Examination Integrity
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Next-Generation <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-400 bg-clip-text text-transparent">AI-Proctored</span> Online Assessments
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          SecureProctor delivers zero-compromise examination integrity with client-side Google MediaPipe vision models, ambient audio analysis, dual-camera WebRTC pairing, and authoritative server security.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link to="/login">
            <Button size="lg" className="shadow-xl shadow-brand-600/30">
              Access Assessment Portal
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/features">
            <Button variant="secondary" size="lg">
              Explore Proctoring Engine
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-brand-500/40 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 group-hover:scale-110 transition-transform">
            <Eye className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">MediaPipe Face Tracking</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Local browser-based 468-point facial landmark analysis detecting absence, multiple faces, and head pose orientation in real time.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-brand-500/40 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">Third-Eye Mobile Pairing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instant QR code pairing transforms any smartphone into a secondary WebRTC camera streaming hands and desk surroundings.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-brand-500/40 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">Web Audio Acoustic ML</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Client-side RMS frequency monitoring identifies sustained ambient noise spikes and voice activity without recording private audio.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-brand-500/40 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">Lockdown & Escalation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fullscreen enforcement, DevTools interception, clipboard prevention, and authoritative server deadline evaluation.
          </p>
        </div>
      </section>

      {/* Enterprise Trust Section */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
          Built for High-Stakes Assessments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Server-Authoritative Clock</h4>
              <p className="text-xs text-slate-400 mt-1">Prevents client-side time manipulation and enforces hard deadlines.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Zero Answer Leaks</h4>
              <p className="text-xs text-slate-400 mt-1">Answer keys and evaluation formulas are never transmitted to student browsers.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Named Docker Volumes</h4>
              <p className="text-xs text-slate-400 mt-1">Guaranteed data persistence for MongoDB and video logs across restarts.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
