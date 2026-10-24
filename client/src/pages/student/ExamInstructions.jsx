import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { examService } from '../../services';
import { Card, Button, Badge, LoadingSkeleton } from '../../components/common';
import { ShieldCheck, Eye, Mic, Lock, AlertTriangle, CheckSquare, Square, ArrowRight, ArrowLeft } from 'lucide-react';

export const ExamInstructions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const data = await examService.getExamById(id);
        setExam(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load examination instructions');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  if (loading) return <LoadingSkeleton count={3} className="h-36" />;

  if (error || !exam) {
    return (
      <Card className="text-center p-8 max-w-lg mx-auto">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-100">Unable to Open Examination</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">{error || 'Exam not found'}</p>
        <Link to="/student/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </Card>
    );
  }

  const policy = exam.proctoringPolicy || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm">Assessment Briefing</Badge>
          <Badge variant="default" size="sm">{exam.durationMinutes} Minutes</Badge>
          <Badge variant="default" size="sm">{exam.totalMarks} Total Marks</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{exam.title}</h1>
        <p className="text-xs text-slate-400">{exam.description}</p>
      </div>

      {/* Instructions Card */}
      <Card title="Candidate Guidelines & Integrity Rules" className="border-slate-800">
        <div className="space-y-6 text-xs text-slate-300">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 font-sans">
            <h4 className="font-semibold text-slate-200">Official Instructions:</h4>
            <p className="whitespace-pre-line text-slate-400 leading-relaxed">
              {exam.instructions || 'Please maintain complete examination decorum.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-brand-400 font-semibold">
                <Eye className="w-4 h-4" />
                <span>Camera & Facial Tracking</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Stay positioned directly in front of your webcam. Looking away for prolonged intervals or multiple faces entering the camera frame will generate integrity warnings.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Mic className="w-4 h-4" />
                <span>Microphone & Acoustic Level</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Take the assessment in a quiet room. Continuous speech or sustained noise spikes exceeding the noise threshold will be flagged for invigilator review.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Lock className="w-4 h-4" />
                <span>Lockdown & Navigation Policy</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The test requires active fullscreen mode. Exiting fullscreen, switching tabs, opening developer tools, or copying/pasting will log security infractions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Automated Escalation Rule</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                You are permitted up to <span className="font-bold text-rose-300 font-mono">{policy.autoSubmitThreshold || 5} warnings</span>. Upon exceeding this limit, the system will immediately auto-submit your exam.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[11px] leading-relaxed">
            <span className="font-bold">Privacy Disclosure:</span> Face tracking executes locally on your device via Google MediaPipe WebAssembly. No continuous raw webcam stream is stored without your explicit notification.
          </div>
        </div>
      </Card>

      {/* Acknowledgment */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setAgreed(!agreed)}
          className="flex items-center gap-3 text-left"
        >
          <div className="text-brand-400">
            {agreed ? <CheckSquare className="w-5 h-5 text-brand-400" /> : <Square className="w-5 h-5 text-slate-600" />}
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-200">
            I confirm that I have read, understood, and agree to abide by all examination integrity rules.
          </span>
        </button>

        <Button
          variant="primary"
          size="md"
          disabled={!agreed}
          onClick={() => navigate(`/student/exams/${id}/device-check`)}
        >
          Proceed to Device Check
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
};
