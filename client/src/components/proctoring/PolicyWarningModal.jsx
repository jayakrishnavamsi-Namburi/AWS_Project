import React from 'react';
import { Modal, Button } from '../common';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const PolicyWarningModal = ({
  isOpen,
  onClose,
  warning,
  warningsCount = 1,
  warningThreshold = 3,
  autoSubmitThreshold = 5
}) => {
  if (!isOpen || !warning) return null;

  const isSevere = warningsCount >= warningThreshold;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Proctoring Policy Violation Warning"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
          <div className="p-2 rounded-lg bg-rose-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-200">
              {warning.eventType?.replace('_', ' ').toUpperCase() || 'SUSPICIOUS EVENT'}
            </h4>
            <p className="text-xs text-rose-300/90 mt-0.5">
              {warning.message || 'An action violating examination integrity guidelines was logged.'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Violation Count:</span>
            <span className="font-bold font-mono text-rose-400">
              {warningsCount} / {autoSubmitThreshold}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                warningsCount >= autoSubmitThreshold ? 'bg-rose-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (warningsCount / autoSubmitThreshold) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {autoSubmitThreshold - warningsCount > 0
              ? `${autoSubmitThreshold - warningsCount} more violations will trigger automatic examination submission.`
              : 'Auto-submission threshold reached.'}
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <Button variant="primary" size="md" onClick={onClose}>
            I Acknowledge & Continue Exam
          </Button>
        </div>
      </div>
    </Modal>
  );
};
