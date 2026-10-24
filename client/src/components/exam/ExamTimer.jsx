import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export const ExamTimer = ({ remainingSeconds: initialRemainingSeconds, onTimeExpired }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialRemainingSeconds);

  useEffect(() => {
    setSecondsLeft(initialRemainingSeconds);
  }, [initialRemainingSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onTimeExpired) onTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeExpired) onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeExpired]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedTime = [
    hours > 0 ? String(hours).padStart(2, '0') : null,
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ]
    .filter(Boolean)
    .join(':');

  const isLowTime = secondsLeft < 300; // less than 5 mins
  const isCritical = secondsLeft < 60;

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border font-mono font-semibold transition-colors ${
        isCritical
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
          : isLowTime
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-slate-900 text-brand-300 border-slate-800'
      }`}
    >
      {isLowTime ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <Clock className="w-4 h-4 text-brand-400" />}
      <span className="text-sm tracking-wider">{formattedTime}</span>
    </div>
  );
};
