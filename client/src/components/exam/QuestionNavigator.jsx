import React from 'react';

export const QuestionNavigator = ({
  questions = [],
  currentIndex,
  answers = {},
  onSelectIndex
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
        Question Palette ({questions.length})
      </h4>

      {/* Grid of question buttons */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const ans = answers[q._id];
          const isAnswered =
            ans && ans.responseValue !== null && ans.responseValue !== undefined && ans.responseValue !== '';
          const isMarked = ans && ans.isMarkedForReview;
          const isCurrent = idx === currentIndex;

          let btnStyle = 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700';

          if (isCurrent) {
            btnStyle = 'ring-2 ring-brand-500 bg-brand-600 text-white font-bold border-brand-400';
          } else if (isMarked && isAnswered) {
            btnStyle = 'bg-purple-600/30 text-purple-300 border-purple-500 font-semibold';
          } else if (isMarked) {
            btnStyle = 'bg-amber-600/30 text-amber-300 border-amber-500 font-semibold';
          } else if (isAnswered) {
            btnStyle = 'bg-emerald-600/30 text-emerald-300 border-emerald-500 font-semibold';
          }

          return (
            <button
              key={q._id}
              onClick={() => onSelectIndex(idx)}
              className={`h-9 rounded-lg text-xs flex items-center justify-center border transition-all ${btnStyle}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          <span>Current</span>
        </div>
      </div>
    </div>
  );
};
