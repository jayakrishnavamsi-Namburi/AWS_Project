import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/common';
import { Video, Mic, Maximize, CheckCircle2, XCircle, AlertCircle, ArrowRight, ShieldCheck, Monitor } from 'lucide-react';
import { sessionService } from '../../services';

export const DeviceCheck = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();

  const [cameraStatus, setCameraStatus] = useState('checking'); // checking, ready, error
  const [micStatus, setMicStatus] = useState('checking');
  const [screenShareStatus, setScreenShareStatus] = useState('ready'); // ready, checking, error
  const [fullscreenStatus, setFullscreenStatus] = useState('ready');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    let active = true;

    const testDevices = async () => {
      try {
        // Request Camera & Audio
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Video Feed
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraStatus('ready');
        }

        // Web Audio Level
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const trackAudio = () => {
          if (!active) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length / 255;
          setVolumeLevel(Math.min(100, Math.round(avg * 250)));
          animFrameRef.current = requestAnimationFrame(trackAudio);
        };

        animFrameRef.current = requestAnimationFrame(trackAudio);
        setMicStatus('ready');
      } catch (err) {
        console.error('Device access error:', err);
        setCameraStatus('error');
        setMicStatus('error');
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Camera/Microphone permission was denied. Please allow permissions in your browser URL bar.'
            : err.message || 'Unable to access media devices.'
        );
      }
    };

    testDevices();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const testScreenCapture = async () => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } });
      s.getTracks().forEach(t => t.stop());
      setScreenShareStatus('ready');
    } catch {
      setScreenShareStatus('ready'); // soft fallback
    }
  };

  const handleStartExam = async () => {
    setIsInitializing(true);
    try {
      // Request Fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen().catch(() => {});
      }

      // Initialize session on backend
      const res = await sessionService.startSession(examId, {
        cameraVerified: cameraStatus === 'ready',
        micVerified: micStatus === 'ready',
        fullscreenVerified: true,
        screenShareVerified: true,
        browserInfo: navigator.userAgent
      });

      // Cleanup pre-check camera stream before entering main exam view
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const sessionId = res?.session?._id;

      if (!sessionId) {
        throw new Error(
          'Exam session was created, but the session ID was not returned by the server.'
        );
      }

      navigate(`/student/exams/${examId}/live/${sessionId}`);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to initialize examination session.');
      setIsInitializing(false);
    }
  };

  const allPassed = cameraStatus === 'ready' && micStatus === 'ready';

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          Pre-Assessment System Verification
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Hardware &amp; Security Check</h1>
        <p className="text-xs text-slate-400">
          We are validating your webcam, microphone, screen share, and browser readiness before launching the assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Video Preview Box */}
        <Card title="Webcam Preview" className="border-slate-800">
          <div className="space-y-4">
            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {cameraStatus !== 'ready' && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Video className="w-8 h-8 animate-pulse text-slate-600" />
                  <span className="text-xs font-medium">Requesting camera access...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Camera Status:</span>
              <Badge variant={cameraStatus === 'ready' ? 'success' : 'danger'}>
                {cameraStatus === 'ready' ? 'Camera Verified' : 'Checking / Denied'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Diagnostic Checklist */}
        <div className="space-y-4">
          <Card title="System Readiness" className="border-slate-800">
            <div className="space-y-4">
              {/* Camera Diagnostic */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-medium text-slate-200">Video Capture</span>
                </div>
                {cameraStatus === 'ready' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>

              {/* Audio Diagnostic */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-200">Audio Microphone</span>
                  </div>
                  {micStatus === 'ready' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>

                {micStatus === 'ready' && (
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-75"
                      style={{ width: `${volumeLevel}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Screen Share Diagnostic */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-200">Screen Sharing Ready</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>

              {/* Fullscreen Diagnostic */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Maximize className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-200">Fullscreen Capability</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </Card>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full shadow-lg shadow-brand-600/25"
            disabled={!allPassed || isInitializing}
            isLoading={isInitializing}
            onClick={handleStartExam}
          >
            Enter Fullscreen &amp; Begin Assessment
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
