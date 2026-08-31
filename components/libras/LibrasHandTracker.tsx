'use client';

import { useEffect, useRef, useCallback } from 'react';

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface LibrasHandTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onLandmarksUpdate?: (landmarks: HandLandmark[][] | null) => void;
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

export default function LibrasHandTracker({
  videoRef,
  canvasRef,
  onLandmarksUpdate,
  isActive,
}: LibrasHandTrackerProps) {
  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastLandmarksRef = useRef<HandLandmark[][] | null>(null);

  const drawSkeleton = useCallback(
    (landmarks: HandLandmark[], ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Draw connections
      ctx.strokeStyle = 'rgba(159, 207, 213, 0.6)';
      ctx.lineWidth = 1.5;
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
        ctx.arc(lm.x * width, lm.y * height, i === 0 ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? 'rgba(206, 189, 255, 0.9)' : 'rgba(159, 207, 213, 0.9)';
        ctx.fill();
      }
    },
    []
  );

  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Load MediaPipe Hands via CDN script tag (avoids WASM bundling issues)
    const loadMediaPipe = () => {
      return new Promise<void>((resolve, reject) => {
        if (typeof window !== 'undefined' && window.Hands) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MediaPipe'));
        document.head.appendChild(script);
      });
    };

    let hands: any;

    const init = async () => {
      try {
        await loadMediaPipe();
        const HandsClass = window.Hands;
        if (!HandsClass) return;

        hands = new HandsClass({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          const ctx = canvas.getContext('2d');
          if (!ctx || !video) return;

          canvas.width = video.videoWidth || video.clientWidth;
          canvas.height = video.videoHeight || video.clientHeight;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const allLandmarks: HandLandmark[][] = results.multiHandLandmarks;
            lastLandmarksRef.current = allLandmarks;
            onLandmarksUpdate?.(allLandmarks);

            for (const landmarks of allLandmarks) {
              drawSkeleton(landmarks, ctx, canvas.width, canvas.height);
            }
          } else {
            lastLandmarksRef.current = null;
            onLandmarksUpdate?.(null);
          }
        });

        handsRef.current = hands;

        // Process loop
        const processFrame = async () => {
          if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            animFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }
          try {
            await hands.send({ image: video });
          } catch {
            // silently skip frames on error
          }
          animFrameRef.current = requestAnimationFrame(processFrame);
        };

        animFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.warn('MediaPipe Hands init failed:', err);
      }
    };

    init();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (hands) hands.close?.();
    };
  }, [isActive, videoRef, canvasRef, onLandmarksUpdate, drawSkeleton]);

  return null; // Renders nothing — side effects only
}
