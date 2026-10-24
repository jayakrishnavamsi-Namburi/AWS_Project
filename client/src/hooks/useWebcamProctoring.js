import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export const useWebcamProctoring = ({
  onViolation,
  enabled = true,
  faceAbsentSecs = 3.5,
  headDeviationSecs = 1.8,
  multipleFacesSecs = 2
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [faceCount, setFaceCount] = useState(1);
  const [headPose, setHeadPose] = useState('center'); // 'center', 'left', 'right', 'up', 'down'
  const [statusMessage, setStatusMessage] = useState('Initializing proctoring engine...');

  // Timers to track sustained intervals
  const absentStartTimeRef = useRef(null);
  const deviationStartTimeRef = useRef(null);
  const multipleFacesStartTimeRef = useRef(null);
  const lastViolationEmitRef = useRef({});

  const emitViolation = useCallback((eventType, severity, metadata) => {
    const now = Date.now();
    const lastEmit = lastViolationEmitRef.current[eventType] || 0;
    if (now - lastEmit >= 2500) { // 2.5s cooldown
      lastViolationEmitRef.current[eventType] = now;
      if (onViolation) {
        onViolation({ eventType, severity, metadata });
      }
    }
  }, [onViolation]);

  // 1. Initialize MediaPipe Face Landmarker with CPU fallback
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const initModel = async () => {
      try {
        setStatusMessage('Loading MediaPipe Vision Model...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        let landmarker = null;
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numFaces: 3,
            minFaceDetectionConfidence: 0.4,
            minFacePresenceConfidence: 0.4,
            minTrackingConfidence: 0.4
          });
        } catch (gpuErr) {
          console.warn('GPU delegate failed, retrying with CPU delegate...', gpuErr);
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numFaces: 3,
            minFaceDetectionConfidence: 0.4,
            minFacePresenceConfidence: 0.4,
            minTrackingConfidence: 0.4
          });
        }

        if (isMounted && landmarker) {
          landmarkerRef.current = landmarker;
          setModelLoaded(true);
          setStatusMessage('AI Proctoring Vision Ready');
        }
      } catch (err) {
        console.warn('MediaPipe remote model load notice, optical fallback active:', err);
        if (isMounted) {
          setModelLoaded(true);
          setStatusMessage('Optical Proctoring Vision Active');
        }
      }
    };

    initModel();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch (_) {}
      }
    };
  }, [enabled]);

  // 2. Start Webcam Stream
  const startCamera = useCallback(async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera permission failed:', err);
      setPermissionError(err.message || 'Camera permission denied');
      setCameraActive(false);
    }
  }, []);

  // 3. Stop Webcam Stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // 4. Optical Analysis Frame Loop
  useEffect(() => {
    if (!enabled || !cameraActive) return;

    let lastVideoTime = -1;

    // Create offscreen canvas for fallback optical analysis
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 160;
      canvasRef.current.height = 120;
    }

    const processFrame = () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const now = Date.now();

      // Path A: MediaPipe Face Landmark Detection
      if (video.currentTime !== lastVideoTime && landmarkerRef.current) {
        lastVideoTime = video.currentTime;

        try {
          const results = landmarkerRef.current.detectForVideo(video, now);
          const detectedCount = results.faceLandmarks ? results.faceLandmarks.length : 0;
          setFaceCount(detectedCount);

          // Check A1: Face Absence
          if (detectedCount === 0) {
            if (!absentStartTimeRef.current) {
              absentStartTimeRef.current = now;
            } else if ((now - absentStartTimeRef.current) / 1000 >= faceAbsentSecs) {
              emitViolation('face_absent', 'high', {
                message: 'No face detected in webcam view',
                duration: Math.round((now - absentStartTimeRef.current) / 1000)
              });
            }
          } else {
            absentStartTimeRef.current = null;
          }

          // Check A2: Multiple Faces
          if (detectedCount > 1) {
            if (!multipleFacesStartTimeRef.current) {
              multipleFacesStartTimeRef.current = now;
            } else if ((now - multipleFacesStartTimeRef.current) / 1000 >= multipleFacesSecs) {
              emitViolation('multiple_faces', 'critical', {
                message: `${detectedCount} faces detected in frame`,
                detectedCount
              });
            }
          } else {
            multipleFacesStartTimeRef.current = null;
          }

          // Check A3: Head Pose & Rotation (Single Face)
          if (detectedCount === 1) {
            const landmarks = results.faceLandmarks[0];
            const noseTip = landmarks[1];    // Nose tip
            const leftCheek = landmarks[234]; // Person's right (image left)
            const rightCheek = landmarks[454];// Person's left (image right)
            const chin = landmarks[152];
            const forehead = landmarks[10];

            if (noseTip && leftCheek && rightCheek) {
              const faceWidth = Math.abs(rightCheek.x - leftCheek.x) || 0.001;
              const midX = (leftCheek.x + rightCheek.x) / 2;
              const yawOffset = (noseTip.x - midX) / faceWidth;

              let currentPose = 'center';

              // Yaw (Left / Right head rotation)
              if (yawOffset > 0.16) {
                currentPose = 'left';  // User turned head to left
              } else if (yawOffset < -0.16) {
                currentPose = 'right'; // User turned head to right
              }

              // Pitch (Up / Down head rotation)
              if (forehead && chin) {
                const faceHeight = Math.abs(chin.y - forehead.y) || 0.001;
                const midY = (forehead.y + chin.y) / 2;
                const pitchOffset = (noseTip.y - midY) / faceHeight;

                if (pitchOffset < -0.15) {
                  currentPose = 'up';
                } else if (pitchOffset > 0.20) {
                  currentPose = 'down';
                }
              }

              setHeadPose(currentPose);

              if (currentPose !== 'center') {
                if (!deviationStartTimeRef.current) {
                  deviationStartTimeRef.current = now;
                } else if ((now - deviationStartTimeRef.current) / 1000 >= headDeviationSecs) {
                  emitViolation('head_deviation', 'medium', {
                    message: `Head turned ${currentPose.toUpperCase()} away from screen`,
                    pose: currentPose
                  });
                }
              } else {
                deviationStartTimeRef.current = null;
              }
            }
          }
        } catch (procErr) {
          // Ignore individual frame processing drops
        }
      } else if (!landmarkerRef.current && canvasRef.current) {
        // Path B: Optical skin/motion centroid tracking fallback
        try {
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, 160, 120);
            const frame = ctx.getImageData(0, 0, 160, 120);
            const data = frame.data;

            let totalSkinPixels = 0;
            let sumX = 0;
            let sumY = 0;

            for (let i = 0; i < data.length; i += 16) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Skin tone thresholding in RGB space
              if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
                const pixelIndex = i / 4;
                const x = pixelIndex % 160;
                const y = Math.floor(pixelIndex / 160);
                sumX += x;
                sumY += y;
                totalSkinPixels++;
              }
            }

            if (totalSkinPixels < 80) {
              setFaceCount(0);
              if (!absentStartTimeRef.current) {
                absentStartTimeRef.current = now;
              } else if ((now - absentStartTimeRef.current) / 1000 >= faceAbsentSecs) {
                emitViolation('face_absent', 'high', { message: 'Candidate not detected in webcam' });
              }
            } else {
              setFaceCount(1);
              absentStartTimeRef.current = null;
              const avgX = sumX / totalSkinPixels / 160; // 0 to 1

              let currentPose = 'center';
              if (avgX < 0.35) currentPose = 'right';
              else if (avgX > 0.65) currentPose = 'left';

              setHeadPose(currentPose);

              if (currentPose !== 'center') {
                if (!deviationStartTimeRef.current) {
                  deviationStartTimeRef.current = now;
                } else if ((now - deviationStartTimeRef.current) / 1000 >= headDeviationSecs) {
                  emitViolation('head_deviation', 'medium', { pose: currentPose });
                }
              } else {
                deviationStartTimeRef.current = null;
              }
            }
          }
        } catch (_) {}
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, cameraActive, faceAbsentSecs, headDeviationSecs, multipleFacesSecs, emitViolation]);

  return {
    videoRef,
    cameraActive,
    modelLoaded,
    permissionError,
    faceCount,
    headPose,
    statusMessage,
    startCamera,
    stopCamera
  };
};
