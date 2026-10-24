import { useState, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = ({ socket, sessionId, role = 'viewer' }) => {
  const [connectionState, setConnectionState] = useState('new');
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const initPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('camera:ice-candidate', {
          sessionId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    if (role === 'viewer') {
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, sessionId, role]);

  const startBroadcast = useCallback(async (mediaStream) => {
    localStreamRef.current = mediaStream;
    const pc = initPeerConnection();

    mediaStream.getTracks().forEach((track) => {
      pc.addTrack(track, mediaStream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (socket) {
      socket.emit('camera:offer', {
        sessionId,
        sdp: pc.localDescription
      });
    }
  }, [initPeerConnection, socket, sessionId]);

  const handleReceiveOffer = useCallback(async (offerSdp) => {
    const pc = initPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (socket) {
      socket.emit('camera:answer', {
        sessionId,
        sdp: pc.localDescription
      });
    }
  }, [initPeerConnection, socket, sessionId]);

  const handleReceiveAnswer = useCallback(async (answerSdp) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answerSdp));
    }
  }, []);

  const handleReceiveIceCandidate = useCallback(async (candidate) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE candidate addition error:', e);
      }
    }
  }, []);

  const closeConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState('closed');
  }, []);

  return {
    connectionState,
    remoteStream,
    startBroadcast,
    handleReceiveOffer,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    closeConnection
  };
};
