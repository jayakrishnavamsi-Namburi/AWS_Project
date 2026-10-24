import React from 'react';
import { ShieldCheck, Eye, Mic, Smartphone, Lock, Cpu, Server, Key } from 'lucide-react';

export const Features = () => {
  return (
    <div className="space-y-12 py-8 max-w-5xl mx-auto">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
          Core Engine & Security Architecture
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Deep dive into the cryptographic, browser-level, and computer-vision subsystems powering SecureProctor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-brand-400">
            <Cpu className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-100">Edge AI Computer Vision</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike legacy proctoring tools that stream continuous raw video to central servers (inducing massive bandwidth costs and privacy vulnerabilities), SecureProctor runs Google MediaPipe Face Landmarker directly on the student’s GPU via WebAssembly.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>468 3D facial landmark estimation</li>
            <li>Head pose yaw and pitch deviation smoothing</li>
            <li>Multiple face intrusion detection</li>
            <li>No raw webcam recording by default</li>
          </ul>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <Smartphone className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-100">QR-Based Mobile WebRTC Pairing</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Eliminates blind spots with secondary camera invigilation. A time-bound cryptographic token binds the student's mobile browser to the active exam session without installing third-party native apps.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Zero mobile app installation required</li>
            <li>Uses rear environment camera (facingMode: environment)</li>
            <li>Direct WebRTC P2P stream via STUN/TURN</li>
            <li>Real-time signaling orchestrated by Socket.IO</li>
          </ul>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <Server className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-100">Server-Authoritative Evaluation</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The frontend is treated as an untrusted environment. Timing, question randomization, answer scoring, negative marking penalties, and auto-submission thresholds are strictly executed server-side.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Hard server deadlines calculated at session creation</li>
            <li>Idempotent atomic exam submission</li>
            <li>Answer keys completely sanitized in student API responses</li>
            <li>Deterministic negative marking formulas</li>
          </ul>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-rose-400">
            <Lock className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-100">Browser Lockdown & Escalation</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Comprehensive client-side security event listeners capture fullscreen departures, tab blur events, DevTools shortcut attempts, and clipboard operations, streaming structured telemetry to the backend.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Configurable violation thresholds (default: 3 warnings)</li>
            <li>Automatic session termination on threshold breach</li>
            <li>Audit logging of all administrative actions</li>
            <li>Human proctor live review controls</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
