import React from 'react';
import { Mic, MicOff } from 'lucide-react';

export const AudioVisualizer = ({ audioActive, volumeLevel = 0, permissionError }) => {
  const percentage = Math.min(100, Math.round(volumeLevel * 150));
  const isHigh = volumeLevel > 0.35;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className={`p-1.5 rounded-lg ${
            audioActive ? (isHigh ? 'bg-rose-500/20 text-rose-400' : 'bg-brand-500/20 text-brand-400') : 'bg-slate-800 text-slate-500'
          }`}
        >
          {audioActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-200 block">
            {audioActive ? (isHigh ? 'Audio Spike Detected' : 'Microphone Active') : 'Microphone Inactive'}
          </span>
          <span className="text-[10px] text-slate-400">
            {permissionError || (audioActive ? 'Ambient noise level monitored' : 'Permission needed')}
          </span>
        </div>
      </div>

      {audioActive && (
        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all duration-100 ${
              isHigh ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
