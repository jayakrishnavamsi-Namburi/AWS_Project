import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analyticsService } from '../../services';
import { Card, Button, Badge, LoadingSkeleton } from '../../components/common';
import { Award, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Clock, HelpCircle } from 'lucide-react';

export const ExamResult = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await analyticsService.getResultById(id);
        setResult(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load examination result');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (loading) return <LoadingSkeleton count={4} className="h-28" />;

  if (error || !result) {
    return (
      <Card className="text-center p-8 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-100">Result Unavailable</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">{error || 'No result data found'}</p>
        <Link to="/student/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Header Result Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={result.isPassed ? 'success' : 'danger'} size="lg">
                {result.isPassed ? 'PASSED' : 'FAILED'}
              </Badge>
              <Badge variant="default" size="sm">
                Evaluated: {new Date(result.evaluatedAt).toLocaleDateString()}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{result.examId?.title || 'Examination Assessment'}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Candidate: {result.studentId?.name} ({result.studentId?.studentId || 'ID Verified'})
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-8">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Total Score</span>
            <div className="text-4xl font-extrabold text-brand-400 font-mono mt-1">
              {result.totalScore} <span className="text-lg text-slate-500 font-normal">/ {result.maxMarks}</span>
            </div>
            <span className="text-xs text-slate-300 font-mono font-medium">
              Overall Score: {result.percentage}%
            </span>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-slate-800 text-center">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-emerald-400 font-semibold uppercase block">Correct Answers</span>
            <span className="text-xl font-bold text-emerald-300 font-mono mt-0.5 block">{result.correctAnswersCount}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-rose-400 font-semibold uppercase block">Incorrect Answers</span>
            <span className="text-xl font-bold text-rose-300 font-mono mt-0.5 block">{result.incorrectAnswersCount}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase block">Unanswered</span>
            <span className="text-xl font-bold text-slate-300 font-mono mt-0.5 block">{result.unansweredCount}</span>
          </div>
        </div>
      </div>

      {/* Detailed Question Review Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-400" />
          Detailed Performance & Question Analysis
        </h2>

        <div className="space-y-4">
          {result.detailedBreakdown?.map((item, index) => (
            <div
              key={index}
              className={`p-5 rounded-2xl border ${
                item.isCorrect
                  ? 'bg-slate-900/80 border-emerald-500/30'
                  : item.marksAwarded < 0
                  ? 'bg-slate-900/80 border-rose-500/30'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold font-mono flex items-center justify-center text-slate-300">
                    {index + 1}
                  </span>
                  <Badge variant={item.isCorrect ? 'success' : item.marksAwarded < 0 ? 'danger' : 'default'} size="sm">
                    {item.isCorrect ? 'CORRECT' : item.studentResponse ? 'INCORRECT' : 'UNANSWERED'}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    Awarded: {item.marksAwarded} / {item.maxMarks} marks
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.timeSpentSeconds || 0}s spent</span>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-100 mb-4 whitespace-pre-line">
                {item.questionText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block mb-1">Your Submission:</span>
                  <span className={item.isCorrect ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                    {JSON.stringify(item.studentResponse) || 'None (Left blank)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Correct Answer:</span>
                  <span className="text-emerald-400 font-semibold">
                    {JSON.stringify(item.correctResponse)}
                  </span>
                </div>
              </div>

              {item.explanation && (
                <div className="mt-3 text-xs text-slate-300 bg-brand-500/5 border border-brand-500/15 rounded-lg p-3">
                  <span className="font-semibold text-brand-300 block mb-0.5">Solution Explanation:</span>
                  <p className="text-slate-400 leading-relaxed">{item.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Link to="/student/dashboard">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
