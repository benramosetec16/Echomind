'use client';

import { useEffect, useRef, useCallback } from 'react';
import { HandFrame, HandLandmark } from './classifier/types';
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
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

declare global {
  interface Window {
    // @mediapipe/tasks-vision exposes its API on window via script bundle
    TasksVision: any;
  }
}

// WASM files are served from jsDelivr alongside the bundle
const TASKS_VISION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/';

// Gesture recognizer model — official MediaPipe hosted model
const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

// Module-level singleton to avoid reloading in React StrictMode
let recognizerPromise: Promise<any> | null = null;

async function loadGestureRecognizer(): Promise<any> {
  if (recognizerPromise) return recognizerPromise;

  recognizerPromise = (async () => {
    // Load the vision bundle script if not already present
    if (!window.TasksVision) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(
          'script[data-mediapipe-tasks-vision]'
        );
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () =>
            reject(new Error('Failed to load @mediapipe/tasks-vision'))
          );
          return;
        }
        const script = document.createElement('script');
        script.src = `${TASKS_VISION_CDN}vision_bundle.js`;
        script.crossOrigin = 'anonymous';
        script.dataset.mediapipeTasksVision = 'true';
        script.onload = () => {
          librasLogger.info('MediaPipe Tasks Vision', 'LOADED');
          resolve();
        };
        script.onerror = () => {
          recognizerPromise = null;
          reject(new Error('Failed to load MediaPipe Tasks Vision from CDN'));
        };
        document.head.appendChild(script);
      });
    }

    const { GestureRecognizer, FilesetResolver } = window.TasksVision;

    const vision = await FilesetResolver.forVisionTasks(
      `${TASKS_VISION_CDN}wasm`
    );

    const recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: GESTURE_MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    librasLogger.info('GestureRecognizer', 'READY');
    return recognizer;
  })();

  return recognizerPromise;
}

export default function LibrasHandTracker({
  videoRef,
  canvasRef,
  onLandmarksUpdate,
  onFrameUpdate,
  isActive,
}: LibrasHandTrackerProps) {
  const animFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  // Stable callback refs
  const onLandmarksUpdateRef = useRef(onLandmarksUpdate);
  onLandmarksUpdateRef.current = onLandmarksUpdate;
  const onFrameUpdateRef = useRef(onFrameUpdate);
  onFrameUpdateRef.current = onFrameUpdate;

  const drawSkeleton = useCallback(
    (
      landmarks: HandLandmark[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
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
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, i === 0 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle =
          i === 0 ? 'rgba(206, 189, 255, 0.95)' : 'rgba(159, 207, 213, 0.95)';
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
    let recognizer: any = null;

    const init = async () => {
      try {
        recognizer = await loadGestureRecognizer();
        if (isDestroyed) return;

        const processFrame = (timestamp: number) => {
          if (isDestroyed) return;

          const elapsed = timestamp - lastProcessTimeRef.current;

          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            !video.paused &&
            !video.ended &&
            elapsed >= 40 && // ~25 fps
            !isProcessingRef.current
          ) {
            lastProcessTimeRef.current = timestamp;
            isProcessingRef.current = true;

            try {
              const results = recognizer.recognizeForVideo(video, Date.now());

              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = video.videoWidth || video.clientWidth || 640;
                canvas.height = video.videoHeight || video.clientHeight || 480;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }

              if (
                results.landmarks &&
                results.landmarks.length > 0
              ) {
                const allLandmarks: HandLandmark[][] = results.landmarks;
                const detections = allLandmarks.map(
                  (lms: HandLandmark[], i: number) => {
                    // Draw skeleton on canvas
                    if (ctx) {
                      drawSkeleton(lms, ctx, canvas.width, canvas.height);
                    }

                    // Extract gesture label + confidence from ML model
                    const gestureCategory = results.gestures?.[i]?.[0];
                    const gestureLabel: string =
                      gestureCategory?.categoryName ?? 'None';
                    const gestureScore: number =
                      gestureCategory?.score ?? 0;

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

                librasLogger.info(
                  'Gesture',
                  detections.map((d) => `${d.gestureLabel}(${d.gestureScore.toFixed(2)})`).join(', ')
                );
              } else {
                onLandmarksUpdateRef.current?.(null);
                onFrameUpdateRef.current?.({
                  timestamp: Date.now(),
                  hands: [],
                });
              }
            } catch (err: any) {
              librasLogger.warn('GestureRecognizer frame error', err?.message);
            } finally {
              isProcessingRef.current = false;
            }
          }

          if (!isDestroyed) {
            animFrameRef.current = requestAnimationFrame(processFrame);
          }
        };

        animFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err: any) {
        librasLogger.warn('GestureRecognizer init failed', err?.message);
      }
    };

    init();

    return () => {
      isDestroyed = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // Note: recognizer instance is reused as singleton; do not close it here
    };
  }, [isActive, videoRef, canvasRef, drawSkeleton]);

  return null;
}
