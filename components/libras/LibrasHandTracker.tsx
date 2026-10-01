'use client';

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { HandFrame, HandLandmark } from './classifier/types';
import { librasLogger } from './logger';

interface LibrasHandTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onLandmarksUpdate?: (landmarks: HandLandmark[][] | null) => void;
  onFrameUpdate?: (frame: HandFrame) => void;
  onError?: (message: string) => void;
  onModelLoading?: (loading: boolean) => void;
  isActive: boolean;
}

// MediaPipe hand connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

// Typed MediaPipe GestureRecognizer result (subset we actually use)
interface GestureCategory {
  categoryName: string;
  score: number;
}

interface GestureRecognizerResult {
  landmarks?: HandLandmark[][];
  gestures?: GestureCategory[][];
  handedness?: GestureCategory[][];
}

interface Recognizer {
  recognizeForVideo: (video: HTMLVideoElement, timestamp: number) => GestureRecognizerResult;
}

// Module-level singleton — avoids reloading in React StrictMode
let recognizerSingleton: Recognizer | null = null;
let recognizerLoadingPromise: Promise<Recognizer> | null = null;

async function loadGestureRecognizer(): Promise<Recognizer> {
  if (recognizerSingleton) return recognizerSingleton;
  if (recognizerLoadingPromise) return recognizerLoadingPromise;

  recognizerLoadingPromise = (async () => {
    try {
      // Dynamic import from the npm package — avoids CDN dependency
      const { GestureRecognizer, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
      );

      const wasmBase =
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

      const vision = await FilesetResolver.forVisionTasks(wasmBase);

      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'CPU', // CPU is more universally supported than GPU
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      recognizerSingleton = recognizer;
      librasLogger.info('GestureRecognizer', 'READY');
      return recognizer;
    } catch (err: unknown) {
      // Reset so it can be retried
      recognizerLoadingPromise = null;
      throw err;
    }
  })();

  return recognizerLoadingPromise;
}

export default function LibrasHandTracker({
  videoRef,
  canvasRef,
  onLandmarksUpdate,
  onFrameUpdate,
  onError,
  onModelLoading,
  isActive,
}: LibrasHandTrackerProps) {
  const animFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  // Stable callback refs — keep latest version without re-running effects
  const onLandmarksUpdateRef = useRef(onLandmarksUpdate);
  const onFrameUpdateRef = useRef(onFrameUpdate);
  const onErrorRef = useRef(onError);
  const onModelLoadingRef = useRef(onModelLoading);

  // Sync refs outside render (required by react-hooks/refs)
  useLayoutEffect(() => {
    onLandmarksUpdateRef.current = onLandmarksUpdate;
    onFrameUpdateRef.current = onFrameUpdate;
    onErrorRef.current = onError;
    onModelLoadingRef.current = onModelLoading;
  });

  const drawSkeleton = useCallback(
    (
      landmarks: HandLandmark[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      ctx.strokeStyle = 'rgba(159, 207, 213, 0.8)';
      ctx.lineWidth = 2.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        const lA = landmarks[a];
        const lB = landmarks[b];
        if (!lA || !lB) continue;
        ctx.beginPath();
        ctx.moveTo(lA.x * width, lA.y * height);
        ctx.lineTo(lB.x * width, lB.y * height);
        ctx.stroke();
      }
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle =
          i === 0 ? 'rgba(206, 189, 255, 1)' : 'rgba(159, 207, 213, 0.95)';
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

    const startLoop = (recognizer: Recognizer) => {
      const processFrame = (timestamp: number) => {
        if (isDestroyed) return;

        const elapsed = timestamp - lastProcessTimeRef.current;

        if (
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0 &&
          !video.paused &&
          !video.ended &&
          elapsed >= 40 && // ~25 fps cap
          !isProcessingRef.current
        ) {
          lastProcessTimeRef.current = timestamp;
          isProcessingRef.current = true;

          try {
            const results = recognizer.recognizeForVideo(video, Date.now());

            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (results.landmarks && results.landmarks.length > 0) {
              const allLandmarks: HandLandmark[][] = results.landmarks;

              const detections = allLandmarks.map(
                (lms: HandLandmark[], i: number) => {
                  if (ctx) {
                    drawSkeleton(lms, ctx, canvas.width, canvas.height);
                  }
                  const gestureCategory = results.gestures?.[i]?.[0];
                  const gestureLabel: string =
                    gestureCategory?.categoryName ?? 'None';
                  const gestureScore: number = gestureCategory?.score ?? 0;
                  const handednessInfo = results.handedness?.[i]?.[0];

                  return {
                    landmarks: lms,
                    handedness: handednessInfo?.categoryName as
                      | 'Left'
                      | 'Right'
                      | undefined,
                    score: handednessInfo?.score,
                    gestureLabel,
                    gestureScore,
                  };
                }
              );

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
          } catch (err: unknown) {
            librasLogger.warn('GestureRecognizer frame error', err instanceof Error ? err.message : String(err));
          } finally {
            isProcessingRef.current = false;
          }
        }

        if (!isDestroyed) {
          animFrameRef.current = requestAnimationFrame(processFrame);
        }
      };

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    const init = async () => {
      try {
        onModelLoadingRef.current?.(true);
        librasLogger.info('GestureRecognizer', 'LOADING...');

        const recognizer = await loadGestureRecognizer();
        if (isDestroyed) return;

        onModelLoadingRef.current?.(false);

        // Wait for video to be truly playing before starting loop
        if (video.readyState >= 3 && video.videoWidth > 0) {
          startLoop(recognizer);
        } else {
          const onReady = () => {
            if (!isDestroyed) startLoop(recognizer);
            video.removeEventListener('playing', onReady);
            video.removeEventListener('canplay', onReady);
          };
          video.addEventListener('playing', onReady);
          video.addEventListener('canplay', onReady);
        }
      } catch (err: unknown) {
        if (isDestroyed) return;
        onModelLoadingRef.current?.(false);
        const msg = err instanceof Error ? err.message : 'Falha ao carregar o modelo de detecção de mãos.';
        librasLogger.warn('GestureRecognizer init failed', msg);
        onErrorRef.current?.(msg);
      }
    };

    init();

    return () => {
      isDestroyed = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isActive, videoRef, canvasRef, drawSkeleton]);

  return null;
}
