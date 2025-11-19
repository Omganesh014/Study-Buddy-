import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AttentionStatus } from '../types';

// Declare TensorFlow and faceLandmarksDetection as global variables
// This is necessary because they are loaded from script tags in index.html
declare const tf: any;
declare const faceLandmarksDetection: any;
// MediaPipe Tasks Vision (loaded from index.html)
declare global {
  interface Window {
    FilesetResolver?: any;
    FaceLandmarker?: any;
  }
}

interface AttentionDetectorProps {
  isActive: boolean;
  onStatusChange: (status: AttentionStatus) => void;
}

const ATTENTION_THRESHOLD = 0.4; // Normalized distance of pupil from eye center
const DEBOUNCE_TIME = 2000; // 2 seconds

const AttentionDetector: React.FC<AttentionDetectorProps> = ({ isActive, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const tasksFaceLandmarkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusTimeoutRef = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastCentroidRef = useRef<{x: number, y: number} | null>(null);
  const lastMovementTsRef = useRef<number>(Date.now());
  const stillAlertedRef = useRef<boolean>(false);

  const [currentStatus, setCurrentStatus] = useState<AttentionStatus>('off');
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [useSafeConstraints, setUseSafeConstraints] = useState<boolean>(false);
  const [showRawVideo, setShowRawVideo] = useState<boolean>(false);
  const lastDrawTsRef = useRef<number>(0);

  const statusColors: Record<AttentionStatus, string> = {
    initializing: 'border-blue-500',
    focused: 'border-green-500',
    distracted: 'border-yellow-500',
    away: 'border-red-500',
    error: 'border-red-700',
    off: 'border-gray-600',
    'permission-needed': 'border-yellow-500',
    'permission-denied': 'border-red-700',
  };
  
  const updateStatusWithDebounce = useCallback((newStatus: AttentionStatus) => {
    if (newStatus === currentStatus) {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = null;
      }
      return;
    }

    if (!statusTimeoutRef.current) {
      statusTimeoutRef.current = window.setTimeout(() => {
        setCurrentStatus(newStatus);
        onStatusChange(newStatus);
        statusTimeoutRef.current = null;
      }, DEBOUNCE_TIME);
    }
  }, [currentStatus, onStatusChange]);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !streamRef.current || videoRef.current.readyState !== 4) {
      if (isActive) animationFrameId.current = requestAnimationFrame(detectFace);
      return;
    }

    const video = videoRef.current;
    let faces: any[] = [];
    if (tasksFaceLandmarkerRef.current) {
      try {
        const res = tasksFaceLandmarkerRef.current.detectForVideo(video, performance.now());
        if (res && res.faceLandmarks && res.faceLandmarks.length) {
          // Map to our faces format with keypoints array {x,y}
          faces = res.faceLandmarks.map((lm: any[]) => ({ keypoints: lm.map((p: any) => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight })) }));
          // Attention from blendshapes/head pose heuristics
          const anyFace = res.faceBlendshapes && res.faceBlendshapes[0];
          if (anyFace && anyFace.categories) {
            const cat = (name: string) => anyFace.categories.find((c: any) => c.categoryName === name)?.score || 0;
            const lookOut = Math.max(cat('eyeLookOutLeft'), cat('eyeLookOutRight'));
            const lookUp = Math.max(cat('eyeLookUpLeft'), cat('eyeLookUpRight'));
            const lookDown = Math.max(cat('eyeLookDownLeft'), cat('eyeLookDownRight'));
            const awayHeuristic = lookOut > 0.6 || lookUp > 0.6 || lookDown > 0.6;
            updateStatusWithDebounce(awayHeuristic ? 'distracted' : 'focused');
          } else {
            updateStatusWithDebounce('focused');
          }
        } else {
          updateStatusWithDebounce('away');
        }
      } catch {}
    } else if (modelRef.current) {
      try {
        faces = await modelRef.current.estimateFaces({ input: video });
      } catch {
        try {
          faces = await modelRef.current.estimateFaces(video);
        } catch {
          // For detector API
          if (typeof (modelRef.current as any).estimateFaces === 'function') {
            faces = await (modelRef.current as any).estimateFaces(video);
          }
        }
      }
    }

    // Render: blur all, keep closest face sharp via canvas
    const canvas = canvasRef.current;
    if (canvas && video) {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 360;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        if (faces.length === 0) {
          // No faces: show unmodified frame
          ctx.drawImage(video, 0, 0, w, h);
        } else {
          // Full blur layer
          ctx.filter = 'blur(12px)';
          ctx.drawImage(video, 0, 0, w, h);
          ctx.filter = 'none';

          // Pick closest face by bbox width
          const bboxes = faces.map((f: any) => {
            const xs = f.keypoints.map((p: any) => p.x);
            const ys = f.keypoints.map((p: any) => p.y);
            const minX = Math.max(0, Math.min(...xs));
            const minY = Math.max(0, Math.min(...ys));
            const maxX = Math.min(w, Math.max(...xs));
            const maxY = Math.min(h, Math.max(...ys));
            return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
          });
          const closest = bboxes.sort((a,b) => b.width - a.width)[0];
          const pad = 0.35; // padding around face
          const sx = Math.max(0, Math.floor(closest.minX - closest.width * pad));
          const sy = Math.max(0, Math.floor(closest.minY - closest.height * pad));
          const sw = Math.min(w - sx, Math.floor(closest.width * (1 + 2*pad)));
          const sh = Math.min(h - sy, Math.floor(closest.height * (1 + 2*pad)));

          // Draw sharp region on top
          ctx.drawImage(video, sx, sy, sw, sh, sx, sy, sw, sh);
        }
        // Mark a successful draw
        lastDrawTsRef.current = Date.now();
      }
    }

    if (faces.length > 0) {
      const face = faces[0];
      // For fallback model, we used named keypoints; with Tasks output, we don't rely on names here.
      const leftEye = face.keypoints[0];
      const rightEye = face.keypoints[Math.floor(face.keypoints.length/8)] || face.keypoints[1];
      const nose = face.keypoints[Math.floor(face.keypoints.length/2)] || face.keypoints[0];
      
      if (leftEye && rightEye) {
        const eyeWidth = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
        const leftPupil = face.keypoints.find((p: any) => p.name === 'leftPupil');
        const rightPupil = face.keypoints.find((p: any) => p.name === 'rightPupil');

        if(leftPupil && rightPupil) {
            const leftDist = Math.hypot(leftPupil.x - leftEye.x, leftPupil.y - leftEye.y) / eyeWidth;
            const rightDist = Math.hypot(rightPupil.x - rightEye.x, rightPupil.y - rightEye.y) / eyeWidth;

            if (leftDist > ATTENTION_THRESHOLD || rightDist > ATTENTION_THRESHOLD) {
                updateStatusWithDebounce('distracted');
            } else {
                updateStatusWithDebounce('focused');
            }
        } else {
             updateStatusWithDebounce('focused'); // Fallback if pupils not detected
        }
      } else {
         updateStatusWithDebounce('focused'); // Fallback if eyes not detected
      }

      // Stillness detection (centroid movement)
      const cx = [leftEye?.x, rightEye?.x, nose?.x].filter(Boolean) as number[];
      const cy = [leftEye?.y, rightEye?.y, nose?.y].filter(Boolean) as number[];
      if (cx.length && cy.length) {
        const centroid = { x: cx.reduce((a,b)=>a+b,0)/cx.length, y: cy.reduce((a,b)=>a+b,0)/cy.length };
        const prev = lastCentroidRef.current;
        if (prev) {
          const dx = centroid.x - prev.x;
          const dy = centroid.y - prev.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1.5) { // pixels threshold
            lastMovementTsRef.current = Date.now();
            stillAlertedRef.current = false;
          }
        }
        lastCentroidRef.current = centroid;
      }
    } else {
      updateStatusWithDebounce('away');
    }

    // Check stillness 10s
    if (isActive) {
      const nowTs = Date.now();
      if (nowTs - lastMovementTsRef.current >= 7000 && !stillAlertedRef.current) {
        try { window.dispatchEvent(new CustomEvent('attention:still', { detail: { duration: 7 } })); } catch {}
        stillAlertedRef.current = true;
      }
      // Auto fallback to raw <video> if we haven't drawn to canvas in > 1200ms
      setShowRawVideo(nowTs - lastDrawTsRef.current > 1200);
      animationFrameId.current = requestAnimationFrame(detectFace);
    }
  }, [isActive, updateStatusWithDebounce]);


  const startStream = async (portrait: boolean) => {
    // Get Webcam with constraints depending on orientation
    const constraints: MediaStreamConstraints = {
      video: useSafeConstraints
        ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        : portrait
          ? { width: { ideal: 720 }, height: { ideal: 1280 }, facingMode: 'user' }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      // @ts-ignore
      videoRef.current.playsInline = true;
      videoRef.current.onloadedmetadata = () => { if (isActive) detectFace(); };
      try { await videoRef.current.play(); } catch { setTimeout(() => { try { videoRef.current && videoRef.current.play(); } catch {} }, 150); }
    }
  };

  const handleGrantAccess = async () => {
    setCurrentStatus('initializing');
    onStatusChange('initializing');
    try {
      // Start camera stream first (respect portrait/safe toggles)
      await startStream(isPortrait);
      // Show camera immediately
      setCurrentStatus('focused');
      onStatusChange('focused');

      // Try to load MediaPipe Tasks Face Landmarker
      try {
        if (!tasksFaceLandmarkerRef.current && window.FilesetResolver && window.FaceLandmarker) {
          const fileset = await window.FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm'
          );
          tasksFaceLandmarkerRef.current = await window.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces: 2,
            outputFaceBlendshapes: true,
          });
        }
      } catch (e) {
        console.warn('Tasks FaceLandmarker init failed, falling back.', e);
      }

      // Fallback to TFJS face landmarks model if Tasks unavailable
      if (!tasksFaceLandmarkerRef.current) {
        try {
          if (typeof tf?.ready === 'function') {
            try { await tf.setBackend?.('webgl'); } catch {}
            await tf.ready();
          }
          if (!modelRef.current) {
            if (faceLandmarksDetection?.SupportedPackages && typeof faceLandmarksDetection.load === 'function') {
              modelRef.current = await faceLandmarksDetection.load(
                faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
                { maxFaces: 1 }
              );
            } else if (faceLandmarksDetection?.SupportedModels && typeof faceLandmarksDetection.createDetector === 'function') {
              const modelType = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
              modelRef.current = await faceLandmarksDetection.createDetector(modelType, {
                runtime: 'mediapipe',
                refineLandmarks: true,
                maxFaces: 1,
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
              });
            }
          }
        } catch (e) {
          console.warn('Fallback model init failed.', e);
        }
      }

      // Begin detection loop
      detectFace();
    } catch (err: any) {
      console.error('Failed to initialize attention detector:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCurrentStatus('permission-denied');
        onStatusChange('permission-denied');
      } else {
        setCurrentStatus('error');
        onStatusChange('error');
      }
    }
  };

  // Handle orientation switch by restarting the stream if active
  useEffect(() => {
    const restart = async () => {
      if (!isActive) return;
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        await startStream(isPortrait);
      } catch (e) {
        console.warn('Failed to switch camera orientation', e);
      }
    };
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortrait]);

  useEffect(() => {
    const cleanup = () => {
         if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        if(statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
        }
        setCurrentStatus('off');
        onStatusChange('off');
    };

    if (isActive) {
        if (!streamRef.current && currentStatus !== 'permission-denied' && currentStatus !== 'error') {
             setCurrentStatus('permission-needed');
             onStatusChange('permission-needed');
        }
    } else {
        cleanup();
    }

    return cleanup;
  }, [isActive]);

  const renderContent = () => {
    switch (currentStatus) {
        case 'permission-needed':
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
                    <p className="text-center text-sm mb-4">Attention Shield needs camera access to work.</p>
                    <button onClick={handleGrantAccess} className="bg-violet-600 px-4 py-2 rounded-lg font-semibold hover:bg-violet-700">Grant Access</button>
                </div>
            );
        case 'permission-denied':
        case 'error':
             return (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                    <p className="text-center text-sm text-red-400">
                        {currentStatus === 'permission-denied'
                            ? "Camera access denied. Please enable it in your browser settings and refresh."
                            : "An error occurred with the camera."
                        }
                    </p>
                </div>
            );
        case 'off':
            return null;
        default:
            return (
              <>
                <canvas ref={canvasRef} className="w-full h-full object-cover transform scale-x-[-1]"></canvas>
                <video ref={videoRef} muted autoPlay playsInline className="absolute inset-0 w-full h-full opacity-0 pointer-events-none transform scale-x-[-1]"></video>
              </>
            );
    }
  }

  return (
    <div className="relative w-full">
      <div className="absolute right-2 top-2 z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setIsPortrait(p => !p)}
            className="px-3 py-1 text-xs rounded-md bg-black/50 hover:bg-black/60 border border-white/20"
            title={isPortrait ? 'Switch to landscape' : 'Switch to portrait'}
          >{isPortrait ? 'Portrait' : 'Landscape'}</button>
          <button
            onClick={() => setUseSafeConstraints(v => !v)}
            className="px-3 py-1 text-xs rounded-md bg-black/50 hover:bg-black/60 border border-white/20"
            title="Toggle safe camera constraints (640x480)"
          >{useSafeConstraints ? 'Safe' : 'HD'}</button>
          <button
            onClick={() => setShowDebug(v => !v)}
            className="px-3 py-1 text-xs rounded-md bg-black/50 hover:bg-black/60 border border-white/20"
            title="Toggle debug overlay"
          >Debug</button>
        </div>
      </div>
      <div
        className={`relative rounded-lg overflow-hidden border-4 transition-colors ${statusColors[currentStatus]}`}
        style={{ aspectRatio: isPortrait ? '9 / 16' as any : '16 / 9' as any }}
      >
        {renderContent()}
        {showDebug && (
          <div className="absolute left-2 bottom-2 z-10 text-xs bg-black/50 rounded px-2 py-1">
            <div>status: {currentStatus}</div>
            <div>video: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
            <div>tracks: {streamRef.current ? streamRef.current.getVideoTracks().length : 0}</div>
            <div>model: {modelRef.current ? 'loaded' : 'not loaded'}</div>
            <div>canvasDrawn(ms): {Date.now() - lastDrawTsRef.current}</div>
            <div>fallbackRawVideo: {String(showRawVideo)}</div>
            <div>portrait: {String(isPortrait)} | safe: {String(useSafeConstraints)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttentionDetector;