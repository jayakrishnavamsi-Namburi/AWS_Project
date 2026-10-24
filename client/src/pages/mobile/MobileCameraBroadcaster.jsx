import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { proctorService } from '../../services';
import { useWebRTC } from '../../hooks/useWebRTC';
import { Button, Badge, Card } from '../../components/common';
import { Smartphone, Video, CheckCircle2, AlertCircle, RefreshCw, Power } from 'lucide-react';

export const MobileCameraBroadcaster = () => {
  const { token } = useParams();
  const [pairingInfo, setPairingInfo] = useState(null);
  const [socket, setSocket] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Verifying authorization token...');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 1. Verify Pairing Token
  useEffect(() => {
    const verify = async () => {
      try {
        const data = await proctorService.verifyPairing(token, {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`
        });
        setPairingInfo(data);
        setStatusMessage('Token verified. Connecting signaling socket...');
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired pairing token.');
      }
    };

    if (token) verify();
  }, [token]);

  // 2. Initialize Socket Connection for Mobile Camera
  useEffect(() => {
    if (!pairingInfo) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      auth: { pairingToken: token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setStatusMessage('Connected to assessment room. Ready to stream.');
      newSocket.emit('camera:join', { sessionId: pairingInfo.sessionId });
    });

    newSocket.on('camera:answer', ({ sdp }) => {
      handleReceiveAnswer(sdp);
    });

    newSocket.on('camera:ice-candidate', ({ candidate }) => {
      handleReceiveIceCandidate(candidate);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [pairingInfo, token]);

  // 3. WebRTC Hook
  const {
    startBroadcast,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    closeConnection
  } = useWebRTC({
    socket,
    sessionId: pairingInfo?.sessionId,
    role: 'broadcaster'
  });

  // 4. Start Rear Environment Camera
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      await startBroadcast(stream);
      setIsBroadcasting(true);
      setStatusMessage('Broadcasting live desk & hands feed.');

      if (socket) {
        socket.emit('camera:status', {
          sessionId: pairingInfo.sessionId,
          status: 'streaming'
        });
      }
    } catch (err) {
      console.error('Mobile camera start error:', err);
      setError('Camera access denied. Please grant camera permission.');
      setCameraActive(false);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    closeConnection();
    setCameraActive(false);
    setIsBroadcasting(false);
    setStatusMessage('Stream stopped.');
    if (socket) {
      socket.emit('camera:status', {
        sessionId: pairingInfo?.sessionId,
        status: 'stopped'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col justify-between max-w-md mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Smartphone className="w-4 h-4" />
          SecureProctor Third-Eye Mobile Node
        </div>
        <h1 className="text-xl font-bold text-slate-100">Secondary Camera Streaming</h1>
        {pairingInfo && (
          <p className="text-xs text-slate-400">
            Candidate: <span className="text-slate-200 font-semibold">{pairingInfo.studentName}</span>
          </p>
        )}
      </div>

      {/* Main Video View */}
      <div className="space-y-4 my-6">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl h-64 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!cameraActive ? 'hidden' : 'block'}`}
          />

          {!cameraActive && (
            <div className="text-center p-6 space-y-3">
              <Video className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Position your phone to the side of your workspace showing your desk and hands.
              </p>
            </div>
          )}

          <div className="absolute top-3 left-3 z-10">
            <Badge variant={isBroadcasting ? 'success' : 'default'} size="sm">
              {isBroadcasting ? 'LIVE BROADCASTING' : 'READY TO STREAM'}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-xs text-slate-400 font-mono">{statusMessage}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="space-y-3 pb-4">
        {!isBroadcasting ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full shadow-lg shadow-brand-600/30"
            onClick={startCamera}
            disabled={!pairingInfo}
          >
            <Video className="w-5 h-5 mr-2" />
            Enable Camera & Start Stream
          </Button>
        ) : (
          <Button
            variant="danger"
            size="lg"
            className="w-full"
            onClick={stopStream}
          >
            <Power className="w-5 h-5 mr-2" />
            Stop Video Broadcast
          </Button>
        )}

        <p className="text-[11px] text-slate-500 text-center">
          Do not close this browser tab during your assessment session.
        </p>
      </div>
    </div>
  );
};
