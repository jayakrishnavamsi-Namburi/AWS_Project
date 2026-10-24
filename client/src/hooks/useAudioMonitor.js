import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioMonitor = ({
  onViolation,
  enabled = true,
  noiseThreshold = 0.35,
  sustainedSecs = 2.5
}) => {
  const [audioActive, setAudioActive] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 1
  const [permissionError, setPermissionError] = useState(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const spikeStartRef = useRef(null);
  const lastEmitRef = useRef(0);

  const startAudio = useCallback(async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setAudioActive(true);
    } catch (err) {
      console.error('Audio permission error:', err);
      setPermissionError(err.message || 'Microphone access denied');
      setAudioActive(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioActive(false);
  }, []);

  useEffect(() => {
    if (!enabled || !audioActive || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Compute RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      setVolumeLevel(Math.min(1, Math.round(rms * 100) / 100));

      const now = Date.now();
      if (rms > noiseThreshold) {
        if (!spikeStartRef.current) {
          spikeStartRef.current = now;
        } else if ((now - spikeStartRef.current) / 1000 >= sustainedSecs) {
          if (now - lastEmitRef.current >= 4000) {
            lastEmitRef.current = now;
            if (onViolation) {
              onViolation({
                eventType: 'audio_spike',
                severity: 'medium',
                metadata: { volume: Math.round(rms * 100) }
              });
            }
          }
        }
      } else {
        spikeStartRef.current = null;
      }

      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };

    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, audioActive, noiseThreshold, sustainedSecs, onViolation]);

  return {
    audioActive,
    volumeLevel,
    permissionError,
    startAudio,
    stopAudio
  };
};
