import React from 'react';
import { Bookmark, CheckSquare, Square, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '../common';

export const QuestionCard = ({
  question,
  currentIndex,
  totalQuestions,
  currentAnswer,
  onAnswerChange,
  onToggleMarkForReview,
  savingStatus
}) => {
  if (!question) return null;

  const isMarked = currentAnswer?.isMarkedForReview || false;
  const val = currentAnswer?.responseValue;

  const handleOptionSelect = (optionId) => {
    if (question.type === 'multiple_select') {
      const currentList = Array.isArray(val) ? [...val] : [];
      const index = currentList.indexOf(optionId);
      if (index > -1) {
        currentList.splice(index, 1);
      } else {
        currentList.push(optionId);
      }
      onAnswerChange(currentList);
    } else {
      onAnswerChange(optionId);
    }
  };

  const handleShortAnswerChange = (e) => {
    onAnswerChange(e.target.value);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[420px]">
      <div>
        {/* Question Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-100 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-mono">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <Badge variant="primary" size="sm">
              {question.type.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="default" size="sm">
              {question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              {savingStatus === 'saving' && 'Saving...'}
              {savingStatus === 'saved' && '✓ Saved'}
              {savingStatus === 'error' && '⚠ Save Failed'}
            </span>
            <button
              onClick={onToggleMarkForReview}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isMarked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-400 text-amber-400' : ''}`} />
              {isMarked ? 'Marked for Review' : 'Mark for Review'}
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="text-base sm:text-lg font-medium text-slate-100 mb-6 leading-relaxed whitespace-pre-line">
          {question.text}
        </div>

        {/* Answer Options Controls */}
        <div className="space-y-3">
          {(question.type === 'mcq' || question.type === 'true_false') && (
            <div className="space-y-2.5">
              {question.options?.map((opt) => {
                const isSelected = String(val) === String(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt.id)}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-brand-600/15 border-brand-500 text-brand-100 shadow-md shadow-brand-500/10'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-sm font-medium leading-normal">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'multiple_select' && (
            <div className="space-y-2.5">
              {question.options?.map((opt) => {
                const isSelected = Array.isArray(val) && val.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt.id)}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-brand-600/15 border-brand-500 text-brand-100 shadow-md shadow-brand-500/10'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-brand-400 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-sm font-medium leading-normal">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'short_answer' && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Your Answer
              </label>
              <input
                type="text"
                value={val || ''}
                onChange={handleShortAnswerChange}
                placeholder="Type your answer here..."
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-mono"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
