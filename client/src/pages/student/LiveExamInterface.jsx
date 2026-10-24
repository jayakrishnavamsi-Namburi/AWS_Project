import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionService, proctorService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useBrowserSecurity } from '../../hooks/useBrowserSecurity';
import { useAudioMonitor } from '../../hooks/useAudioMonitor';
import { useWebcamProctoring } from '../../hooks/useWebcamProctoring';
import { useWebRTC } from '../../hooks/useWebRTC';
import {
  WebcamMonitor,
  AudioVisualizer,
  PolicyWarningModal
} from '../../components/proctoring';
import {
  MobileQRModal,
  SecondaryCameraStream
} from '../../components/camera';
import {
  ShieldCheck, ShieldAlert, Clock, ChevronLeft, ChevronRight,
  Send, Bookmark, CheckCircle2, Circle, CheckSquare, Square,
  Camera, Mic, Maximize2, AlertTriangle, Wifi, Smartphone, X,
  BookOpen, User, Flag, Monitor, RefreshCw, EyeOff
} from 'lucide-react';

// ─── Inline Timer ────────────────────────────────────────────────────────────
function ExamTimer({ serverDeadline, onTimeExpired }) {
  const [secs, setSecs] = useState(null);

  useEffect(() => {
    if (!serverDeadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(serverDeadline) - Date.now()) / 1000));
      setSecs(remaining);
      if (remaining === 0 && onTimeExpired) onTimeExpired();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverDeadline, onTimeExpired]);

  if (secs === null) return null;

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const isUrgent = secs < 300;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
      isUrgent
        ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse'
        : 'bg-slate-800/80 border-slate-700 text-slate-200'
    }`}>
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
      {h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
    </div>
  );
}

// ─── Screen Share Monitor Panel ───────────────────────────────────────────────
function ScreenShareMonitor({ stream, isActive, onStartScreenShare, error }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">Candidate Screen Share</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}>
          {isActive ? '● SHARING' : 'DISCONNECTED'}
        </span>
      </div>
      <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
        {isActive && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="p-3 text-center space-y-2">
            <Monitor className="w-7 h-7 text-slate-600 mx-auto" />
            <p className="text-[11px] text-slate-400">Desktop screen capture is required.</p>
            <button
              onClick={onStartScreenShare}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow"
            >
              Share Entire Screen
            </button>
            {error && <p className="text-[10px] text-rose-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Navigator Palette ───────────────────────────────────────────────
function QuestionPalette({ questions, currentIndex, answers, onSelect }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Question Palette
      </h3>
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, i) => {
          const ans = answers[q._id];
          const hasAnswer = ans?.responseValue !== null && ans?.responseValue !== undefined && ans?.responseValue !== '' &&
            !(Array.isArray(ans?.responseValue) && ans?.responseValue.length === 0);
          const isMarked = ans?.isMarkedForReview;
          const isCurrent = i === currentIndex;

          let cls = 'w-full aspect-square rounded-lg text-xs font-bold border transition-all flex items-center justify-center ';
          if (isCurrent) cls += 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/25';
          else if (isMarked && hasAnswer) cls += 'bg-violet-600/30 border-violet-500/60 text-violet-300';
          else if (isMarked) cls += 'bg-amber-500/20 border-amber-500/40 text-amber-300';
          else if (hasAnswer) cls += 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300';
          else cls += 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200';

          return (
            <button key={q._id} onClick={() => onSelect(i)} className={cls}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-brand-600 inline-block shrink-0" />Current</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-600/20 border border-emerald-500/40 inline-block shrink-0" />Answered</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block shrink-0" />Marked</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block shrink-0" />Not Visited</div>
      </div>
    </div>
  );
}

// ─── Question Card ─────────────────────────────────────────────────────────────
function QuestionDisplay({ question, currentIndex, total, answer, onAnswerChange, onToggleMark, savingStatus }) {
  if (!question) return null;
  const val = answer?.responseValue;
  const isMarked = answer?.isMarkedForReview || false;

  const optId = (opt) => opt._id || opt.id || opt.value;

  const handleOption = (id) => {
    if (question.type === 'multiple_select') {
      const cur = Array.isArray(val) ? [...val] : [];
      const idx = cur.indexOf(id);
      if (idx > -1) cur.splice(idx, 1); else cur.push(id);
      onAnswerChange(cur);
    } else {
      onAnswerChange(id);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full shadow-lg">
      {/* Card Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 font-mono">
            Q{currentIndex + 1} / {total}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
            question.type === 'mcq' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
            question.type === 'multiple_select' ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' :
            question.type === 'true_false' ? 'bg-teal-500/15 text-teal-300 border-teal-500/30' :
            'bg-orange-500/15 text-orange-300 border-orange-500/30'
          }`}>
            {question.type.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </span>
          {question.negativeMark > 0 && (
            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              −{question.negativeMark} wrong
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">
            {savingStatus === 'saving' && '⟳ Saving...'}
            {savingStatus === 'saved' && '✓ Saved'}
            {savingStatus === 'error' && '⚠ Save Failed'}
          </span>
          <button
            onClick={onToggleMark}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              isMarked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-400 text-amber-400' : ''}`} />
            {isMarked ? 'Marked' : 'Mark'}
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div className="px-6 py-5 text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-wrap select-none">
        {question.text}
      </div>

      {/* Options */}
      <div className="px-6 pb-6 flex-1 select-none">
        {(question.type === 'mcq' || question.type === 'true_false') && (
          <div className="space-y-2.5">
            {question.options?.map((opt, oi) => {
              const id = optId(opt);
              const selected = String(val) === String(id);
              const label = String.fromCharCode(65 + oi);
              return (
                <button
                  key={id}
                  onClick={() => handleOption(id)}
                  className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all group ${
                    selected
                      ? 'bg-brand-600/15 border-brand-500 shadow-md shadow-brand-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-600 hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border transition-all ${
                    selected
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-600'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <span className={`text-sm font-medium leading-normal ${selected ? 'text-brand-100' : 'text-slate-300'}`}>
                      {opt.text}
                    </span>
                  </div>
                  <div className="mt-0.5 shrink-0">
                    {selected
                      ? <CheckCircle2 className="w-5 h-5 text-brand-400" />
                      : <Circle className="w-5 h-5 text-slate-700 group-hover:text-slate-500" />
                    }
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'multiple_select' && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-500 mb-3 font-medium">Select all that apply</p>
            {question.options?.map((opt, oi) => {
              const id = optId(opt);
              const selected = Array.isArray(val) && val.includes(id);
              const label = String.fromCharCode(65 + oi);
              return (
                <button
                  key={id}
                  onClick={() => handleOption(id)}
                  className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all group ${
                    selected
                      ? 'bg-brand-600/15 border-brand-500 shadow-md shadow-brand-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-600 hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border transition-all ${
                    selected
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-600'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <span className={`text-sm font-medium ${selected ? 'text-brand-100' : 'text-slate-300'}`}>
                      {opt.text}
                    </span>
                  </div>
                  <div className="mt-0.5 shrink-0">
                    {selected
                      ? <CheckSquare className="w-5 h-5 text-brand-400" />
                      : <Square className="w-5 h-5 text-slate-700 group-hover:text-slate-500" />
                    }
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'short_answer' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Your Answer
            </label>
            <input
              type="text"
              value={val || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Submit Confirmation Modal ────────────────────────────────────────────────
function SubmitModal({ isOpen, onClose, onConfirm, questions, answers, isSubmitting }) {
  if (!isOpen) return null;

  const answered = questions.filter(q => {
    const a = answers[q._id];
    if (!a?.responseValue) return false;
    if (Array.isArray(a.responseValue)) return a.responseValue.length > 0;
    return a.responseValue !== '';
  }).length;
  const marked = questions.filter(q => answers[q._id]?.isMarkedForReview).length;
  const skipped = questions.length - answered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <Send className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Submit Examination?</h2>
            <p className="text-xs text-slate-400">This action cannot be undone</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{answered}</div>
            <div className="text-xs text-slate-400 mt-1">Answered</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-rose-400">{skipped}</div>
            <div className="text-xs text-slate-400 mt-1">Skipped</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{marked}</div>
            <div className="text-xs text-slate-400 mt-1">Marked</div>
          </div>
        </div>

        {skipped > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-5 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>You have <strong>{skipped}</strong> unanswered question{skipped > 1 ? 's' : ''}. Are you sure you want to submit?</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Continue Exam
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</>
            ) : (
              <><Send className="w-4 h-4" />Submit Now</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Live Exam Interface ─────────────────────────────────────────────────
export const LiveExamInterface = () => {
  const { id: examId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinExamRoom, leaveExamRoom } = useSocket();

  // Session & Exam State
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [savingStatus, setSavingStatus] = useState('saved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Security & Violations State
  const [warningsCount, setWarningsCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [toastAlert, setToastAlert] = useState('');
  const [mobileConnected, setMobileConnected] = useState(false);

  // Screen Share State
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenSharePromptOpen, setScreenSharePromptOpen] = useState(true);
  const [screenShareError, setScreenShareError] = useState('');

  const debounceRef = useRef(null);

  // ── 1. Core Violation Handler ──────────────────────────────────────────────
  const handleViolation = useCallback(
    async ({ eventType, severity = 'medium', metadata = {} }) => {
      if (!sessionId) return;
      try {
        // Optimistic strike counter increment
        setWarningsCount((prev) => prev + 1);

        // Visual alert notification
        setToastAlert(`⚠️ Security Infraction Detected: ${eventType.replace(/_/g, ' ').toUpperCase()}`);
        setTimeout(() => setToastAlert(''), 5000);

        // Open policy warning modal immediately
        setActiveWarning({
          eventType,
          message: `Proctoring Policy Infraction: ${eventType.replace(/_/g, ' ')}. Tab switching, proxy windows, and unauthorized focus changes are strictly logged.`
        });
        setShowWarningModal(true);

        const res = await proctorService.recordEvent(sessionId, {
          eventType,
          severity,
          metadata
        });

        if (res.warningsCount !== undefined) {
          setWarningsCount(res.warningsCount);
        }

        if (res.autoSubmitted) {
          navigate(`/student/results/${res.result?._id || ''}`);
        }
      } catch (err) {
        console.error('Failed to log proctor violation:', err);
      }
    },
    [sessionId, navigate]
  );

  // ── 2. Browser Lockdown Security Hook ─────────────────────────────────────
  const { isFullscreen, requestFullscreen } = useBrowserSecurity({
    onViolation: handleViolation,
    enabled: true,
    fullscreenRequired: true
  });

  // ── 3. AI Webcam Vision Proctoring Hook ───────────────────────────────────
  const {
    videoRef,
    cameraActive,
    faceCount,
    headPose,
    modelLoaded,
    permissionError: cameraError,
    startCamera,
    stopCamera
  } = useWebcamProctoring({
    onViolation: handleViolation,
    enabled: true,
    faceAbsentSecs: 3.5,
    headDeviationSecs: 1.8,
    multipleFacesSecs: 2
  });

  // ── 4. Web Audio Real-Time Noise Monitor Hook ─────────────────────────────
  const {
    audioActive,
    volumeLevel,
    permissionError: audioError,
    startAudio,
    stopAudio
  } = useAudioMonitor({
    onViolation: handleViolation,
    enabled: true,
    noiseThreshold: 0.35,
    sustainedSecs: 2.5
  });

  // ── 5. WebRTC Secondary Mobile Camera Hook ─────────────────────────────────
  const {
    remoteStream: mobileStream,
    handleReceiveOffer,
    handleReceiveIceCandidate,
    closeConnection: closeWebRTC
  } = useWebRTC({
    socket,
    sessionId,
    role: 'viewer'
  });

  // ── 6. User-Initiated Screen Sharing Functionality ─────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      setScreenShareError('');
      // Request Entire Screen by default via displaySurface: 'monitor'
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always'
        },
        audio: false
      });

      setScreenStream(stream);
      setScreenShareActive(true);
      setScreenSharePromptOpen(false);

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          setScreenShareActive(false);
          setScreenStream(null);
          setScreenSharePromptOpen(true);
          handleViolation({
            eventType: 'screen_share_stopped',
            severity: 'high',
            metadata: { reason: 'Screen share terminated by candidate' }
          });
        };
      }
    } catch (err) {
      console.warn('Screen share request cancelled or failed:', err);
      setScreenShareError(err.message || 'Please select Entire Screen to continue');
      setScreenShareActive(false);
      handleViolation({
        eventType: 'screen_share_stopped',
        severity: 'high',
        metadata: { reason: 'Screen share permission denied' }
      });
    }
  }, [handleViolation]);

  // ── 7. Load Session Data ───────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await sessionService.getSession(sessionId);
        if (!mounted) return;
        setSession(data.session);
        setQuestions(data.questions || []);
        setWarningsCount(data.session?.warningsCount || 0);

        const map = {};
        (data.savedAnswers || []).forEach((a) => {
          map[a.questionId] = a;
        });
        setAnswers(map);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Session load error:', err);
        setErrorMessage(err?.response?.data?.message || err.message || 'Failed to load session');
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [sessionId]);

  // ── 8. Start Webcam & Audio on Mount ──────────────────────────────────────
  useEffect(() => {
    startCamera();
    startAudio();

    return () => {
      stopCamera();
      stopAudio();
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── 9. Socket Listeners for Real-time Warnings & Mobile Camera ─────────────
  useEffect(() => {
    if (!socket || !sessionId) return;

    joinExamRoom(examId, sessionId);
    socket.emit('camera:join', { sessionId });

    const onWarning = (data) => {
      if (data.warningsCount !== undefined) setWarningsCount(data.warningsCount);
      setActiveWarning(data);
      setShowWarningModal(true);
    };

    const onSubmitted = (data) => {
      navigate(`/student/results/${data.result?._id || ''}`);
    };

    const onCameraStatus = (data) => {
      if (data.status === 'connected' || data.status === 'streaming') {
        setMobileConnected(true);
      } else if (data.status === 'stopped' || data.status === 'disconnected') {
        setMobileConnected(false);
      }
    };

    const onCameraOffer = ({ sdp }) => {
      handleReceiveOffer(sdp);
    };

    const onCameraIce = ({ candidate }) => {
      handleReceiveIceCandidate(candidate);
    };

    socket.on('exam:warning', onWarning);
    socket.on('exam:submitted', onSubmitted);
    socket.on('camera:status', onCameraStatus);
    socket.on('camera:offer', onCameraOffer);
    socket.on('camera:ice-candidate', onCameraIce);

    return () => {
      socket.off('exam:warning', onWarning);
      socket.off('exam:submitted', onSubmitted);
      socket.off('camera:status', onCameraStatus);
      socket.off('camera:offer', onCameraOffer);
      socket.off('camera:ice-candidate', onCameraIce);
      leaveExamRoom(examId, sessionId);
    };
  }, [socket, sessionId, examId, joinExamRoom, leaveExamRoom, handleReceiveOffer, handleReceiveIceCandidate, navigate]);

  // ── 10. Heartbeat Loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      try {
        const res = await sessionService.heartbeat(sessionId);
        if (res?.isExpired) {
          clearInterval(id);
          navigate(`/student/results/${res.resultId || ''}`);
        }
      } catch {}
    }, 20000);
    return () => clearInterval(id);
  }, [sessionId, navigate]);

  // ── 11. Answer Change + Debounced Auto-save ────────────────────────────────
  const handleAnswerChange = useCallback((newValue) => {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers(prev => ({
      ...prev,
      [q._id]: { ...prev[q._id], questionId: q._id, responseValue: newValue }
    }));
    setSavingStatus('saving');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await sessionService.saveAnswer(sessionId, q._id, { responseValue: newValue });
        setSavingStatus('saved');
      } catch {
        setSavingStatus('error');
      }
    }, 700);
  }, [questions, currentIndex, sessionId]);

  // ── 12. Toggle Mark For Review ─────────────────────────────────────────────
  const handleToggleMark = useCallback(async () => {
    const q = questions[currentIndex];
    if (!q) return;
    const newMark = !answers[q._id]?.isMarkedForReview;
    setAnswers(prev => ({
      ...prev,
      [q._id]: { ...prev[q._id], questionId: q._id, isMarkedForReview: newMark }
    }));
    try {
      await sessionService.saveAnswer(sessionId, q._id, {
        responseValue: answers[q._id]?.responseValue || null,
        isMarkedForReview: newMark
      });
    } catch {}
  }, [questions, currentIndex, answers, sessionId]);

  // ── 13. Submit Final Exam ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await sessionService.submitSession(sessionId);
      navigate(`/student/results/${res.result?._id || res.resultId || ''}`);
    } catch (err) {
      console.error('Submit error:', err);
      setIsSubmitting(false);
    }
  };

  const goTo = (idx) => setCurrentIndex(Math.max(0, Math.min(questions.length - 1, idx)));

  // ── Loading & Error Fallbacks ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Synchronizing Authorized Examination Session...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Session Error</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => {
    const a = answers[q._id];
    if (!a?.responseValue) return false;
    if (Array.isArray(a.responseValue)) return a.responseValue.length > 0;
    return a.responseValue !== '';
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none exam-lockdown">
      {/* ── Top Toast Alert Banner ─────────────────────────────────────────── */}
      {toastAlert && (
        <div className="bg-rose-600 text-white px-4 py-2 text-center text-xs font-bold tracking-wide z-50 flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <AlertTriangle className="w-4 h-4" />
          <span>{toastAlert}</span>
        </div>
      )}

      {/* ── Screen Sharing Required Modal ──────────────────────────────────── */}
      {screenSharePromptOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg">
              <Monitor className="w-9 h-9 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Mandatory Full Desktop Screen Share</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                To guarantee assessment integrity, you must share your <strong>Entire Screen</strong>. In the next browser popup, select the <strong>"Entire Screen"</strong> tab and click <strong>Share</strong>.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-left space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Select <strong>Entire Screen</strong> (Not single tab or window)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Stopping screen sharing triggers an automatic strike</span>
              </div>
            </div>

            {screenShareError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {screenShareError}
              </p>
            )}

            <button
              onClick={startScreenShare}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              Share Entire Screen &amp; Begin
            </button>
          </div>
        </div>
      )}

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm text-white">
            SP
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 line-clamp-1">
              {session?.examTitle || 'SecureProctor Examination'}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              <User className="w-3 h-3 inline mr-1" />{user?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-lg text-xs font-mono">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">{answeredCount}/{questions.length}</span>
            <span className="text-slate-500">answered</span>
          </div>

          {/* Violations Strike Meter */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border ${
            warningsCount > 0
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-bold'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}>
            <ShieldAlert className={`w-3.5 h-3.5 ${warningsCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            <span>Strikes: {warningsCount}/{session?.proctoringPolicy?.autoSubmitThreshold || 5}</span>
          </div>

          {/* Fullscreen Button */}
          {!isFullscreen && (
            <button
              onClick={requestFullscreen}
              className="px-2.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          )}

          {/* Authoritative Timer */}
          <ExamTimer
            serverDeadline={session?.serverDeadline}
            onTimeExpired={handleSubmit}
          />

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finish &amp; Submit</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Grid ───────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5 max-w-[1600px] mx-auto w-full">

        {/* ── Left: Question Workspace ────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex-1">
            <QuestionDisplay
              question={currentQuestion}
              currentIndex={currentIndex}
              total={questions.length}
              answer={answers[currentQuestion?._id]}
              onAnswerChange={handleAnswerChange}
              onToggleMark={handleToggleMark}
              savingStatus={savingStatus}
            />
          </div>

          {/* Navigation Footer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-md">
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs text-slate-500 font-mono hidden sm:block">
              {currentIndex + 1} of {questions.length} questions
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold border border-blue-500 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold border border-emerald-500 transition-colors"
              >
                Review &amp; Submit
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Right Sidebar: AI Vision, Screen, Audio & Third-Eye Mobile ──── */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* 1. AI Webcam Monitor */}
          <WebcamMonitor
            videoRef={videoRef}
            cameraActive={cameraActive}
            faceCount={faceCount}
            headPose={headPose}
            modelLoaded={modelLoaded}
            permissionError={cameraError}
          />

          {/* 2. Screen Share Monitor Panel */}
          <ScreenShareMonitor
            stream={screenStream}
            isActive={screenShareActive}
            onStartScreenShare={startScreenShare}
            error={screenShareError}
          />

          {/* 3. Audio Activity Visualizer */}
          <AudioVisualizer
            audioActive={audioActive}
            volumeLevel={volumeLevel}
            permissionError={audioError}
          />

          {/* 4. Secondary Mobile Third-Eye Camera */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 transition-all text-xs font-semibold shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Third-Eye Mobile Camera</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mobileConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}>
                {mobileConnected ? '● Streaming' : 'Pair Phone'}
              </span>
            </button>

            {/* Display Secondary Stream if Connected */}
            {mobileConnected && (
              <SecondaryCameraStream
                stream={mobileStream}
                isConnected={mobileConnected}
                studentName={user?.name}
              />
            )}
          </div>

          {/* 5. Question Palette */}
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            onSelect={goTo}
          />
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <SubmitModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmit}
        questions={questions}
        answers={answers}
        isSubmitting={isSubmitting}
      />

      <MobileQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        sessionId={sessionId}
        mobileConnected={mobileConnected}
      />

      <PolicyWarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        warning={activeWarning}
        warningsCount={warningsCount}
        warningThreshold={session?.proctoringPolicy?.warningThreshold || 3}
        autoSubmitThreshold={session?.proctoringPolicy?.autoSubmitThreshold || 5}
      />
    </div>
  );
};
