import React from 'react';
import { Modal, Button } from '../common';
import { CheckCircle2, HelpCircle, Bookmark, AlertCircle } from 'lucide-react';

export const ExamSummaryModal = ({
  isOpen,
  onClose,
  onSubmitConfirm,
  questions = [],
  answers = {},
  isSubmitting = false
}) => {
  const total = questions.length;
  let answeredCount = 0;
  let markedCount = 0;

  questions.forEach((q) => {
    const ans = answers[q._id];
    if (ans && ans.responseValue !== null && ans.responseValue !== undefined && ans.responseValue !== '') {
      answeredCount++;
    }
    if (ans && ans.isMarkedForReview) {
      markedCount++;
    }
  });

  const unansweredCount = total - answeredCount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Examination Submission Summary" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Are you sure you want to submit your examination? Once submitted, you cannot change your responses.
        </p>

        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Answered</span>
            </div>
            <span className="text-xl font-bold text-emerald-300 font-mono">{answeredCount}</span>
          </div>

          <div className="text-center p-2 rounded-lg bg-slate-800/40 border border-slate-700">
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Unanswered</span>
            </div>
            <span className="text-xl font-bold text-slate-300 font-mono">{unansweredCount}</span>
          </div>

          <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
              <Bookmark className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Marked</span>
            </div>
            <span className="text-xl font-bold text-amber-300 font-mono">{markedCount}</span>
          </div>
        </div>

        {unansweredCount > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>You have {unansweredCount} unanswered questions remaining.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Return to Exam
          </Button>
          <Button variant="danger" onClick={onSubmitConfirm} isLoading={isSubmitting}>
            Confirm & Finalize
          </Button>
        </div>
      </div>
    </Modal>
  );
};
