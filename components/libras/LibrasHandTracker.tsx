'use client';

import { useEffect, useRef, useCallback } from 'react';
import { HandDetection, HandFrame, HandLandmark } from './classifier/types';
import { librasLogger } from './logger';

interface LibrasHandTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onLandmarksUpdate?: (landmarks: HandLandmark[][] | null) => void;
  onFrameUpdate?: (frame: HandFrame) => void;
  isActive: boolean;
}

// MediaPipe hand connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

// Module-level script loader promise to avoid duplicate loads in React StrictMode
let mediaPipeLoadPromise: Promise<void> | null = null;

function loadMediaPipeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Hands) return Promise.resolve();

  if (mediaPipeLoadPromise) return mediaPipeLoadPromise;

  mediaPipeLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-mediapipe-hands]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load MediaPipe Hands')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.crossOrigin = 'anonymous';
    script.dataset.mediapipeHands = 'true';
    script.onload = () => {
      librasLogger.info('MediaPipe Script', 'LOADED');
      resolve();
    };
    script.onerror = () => {
      mediaPipeLoadPromise = null;
      reject(new Error('Failed to load MediaPipe from CDN'));
    };
    document.head.appendChild(script);
  });

  return mediaPipeLoadPromise;
}

export default function LibrasHandTracker({
  videoRef,
  canvasRef,
  onLandmarksUpdate,
  onFrameUpdate,
  isActive,
}: LibrasHandTrackerProps) {
  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const isProcessingFrameRef = useRef(false);
  const lastProcessTimeRef = useRef(0);

  // Keep callback refs stable to avoid re-triggering effect
  const onLandmarksUpdateRef = useRef(onLandmarksUpdate);
  onLandmarksUpdateRef.current = onLandmarksUpdate;
  const onFrameUpdateRef = useRef(onFrameUpdate);
  onFrameUpdateRef.current = onFrameUpdate;

  const drawSkeleton = useCallback(
    (landmarks: HandLandmark[], ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Draw bones
      ctx.strokeStyle = 'rgba(159, 207, 213, 0.7)';
      ctx.lineWidth = 2.0;
      for (const [a, b] of HAND_CONNECTIONS) {
        const lA = landmarks[a];
        const lB = landmarks[b];
        if (!lA || !lB) continue;
        ctx.beginPath();
        ctx.moveTo(lA.x * width, lA.y * height);
        ctx.lineTo(lB.x * width, lB.y * height);
        ctx.stroke();
      }

      // Draw joints
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, i === 0 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? 'rgba(206, 189, 255, 0.95)' : 'rgba(159, 207, 213, 0.95)';
        ctx.fill();
      }
    },
    []
  );

  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let isDestroyed = false;
    let handsInstance: any = null;

    const init = async () => {
      try {
        await loadMediaPipeScript();
        if (isDestroyed) return;

        const HandsClass = window.Hands;
        if (!HandsClass) {
          librasLogger.error('MediaPipe', 'window.Hands não disponível');
          return;
        }

        handsInstance = new HandsClass({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.5,
        });

        handsInstance.onResults((results: any) => {
          if (isDestroyed) return;
          const ctx = canvas.getContext('2d');
          if (!ctx || !video) return;

          canvas.width = video.videoWidth || video.clientWidth || 640;
          canvas.height = video.videoHeight || video.clientHeight || 480;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const allLandmarks: HandLandmark[][] = results.multiHandLandmarks;
            const detections: HandDetection[] = [];

            for (let i = 0; i < allLandmarks.length; i++) {
              const lms = allLandmarks[i];
              const handednessInfo = results.multiHandedness?.[i];
              detections.push({
                landmarks: lms,
                handedness: handednessInfo?.label as ('Left' | 'Right' | undefined),
                score: handednessInfo?.score,
              });
              drawSkeleton(lms, ctx, canvas.width, canvas.height);
            }

            onLandmarksUpdateRef.current?.(allLandmarks);
            onFrameUpdateRef.current?.({
              timestamp: Date.now(),
              hands: detections,
            });
          } else {
            onLandmarksUpdateRef.current?.(null);
            onFrameUpdateRef.current?.({
              timestamp: Date.now(),
              hands: [],
            });
          }
        });

        handsRef.current = handsInstance;
        librasLogger.info('MediaPipe', 'READY');

        // Processing loop throttled to ~25 fps (40ms) with lock
        const processFrame = async (timestamp: number) => {
          if (isDestroyed) return;

          const timeSinceLast = timestamp - lastProcessTimeRef.current;

          // Check video element state before sending frame
          if (
            video &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            !video.paused &&
            !video.ended &&
            timeSinceLast >= 40 &&
            !isProcessingFrameRef.current
          ) {
            lastProcessTimeRef.current = timestamp;
            isProcessingFrameRef.current = true;
            try {
              await handsInstance.send({ image: video });
            } catch {
              // Frame dropped, proceed safely
            } finally {
              isProcessingFrameRef.current = false;
            }
          }

          if (!isDestroyed) {
            animFrameRef.current = requestAnimationFrame(processFrame);
          }
        };

        animFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err: any) {
        librasLogger.warn('MediaPipe Hands init failed', err?.message || err);
      }
    };

    init();

    return () => {
      isDestroyed = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (handsInstance) {
        try {
          handsInstance.close?.();
        } catch {
          // ignore cleanup errors
        }
      }
      handsRef.current = null;
    };
  }, [isActive, videoRef, canvasRef, drawSkeleton]);

  return null;
}
