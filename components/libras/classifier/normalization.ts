/**
 * EchoMind Libras — Landmark Normalization
 * 
 * Normalizes 21 3D hand landmarks:
 * - Translates wrist (index 0) to origin (0, 0, 0)
 * - Scales coordinates by reference palm distance ||P_9 - P_0|| (wrist to middle MCP)
 * - Produces scale-invariant, position-invariant coordinates
 */

import { HandLandmark, NormalizedHand, NormalizedLandmark } from './types';

/**
 * Calculates Euclidean distance between two 2D or 3D points
 */
export function euclideanDistance(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalizes an array of 21 hand landmarks
 */
export function normalizeLandmarks(
  rawLandmarks: HandLandmark[],
  handedness?: 'Left' | 'Right'
): NormalizedHand {
  if (!rawLandmarks || rawLandmarks.length < 21) {
    throw new Error('normalizeLandmarks requires 21 landmarks');
  }

  const wrist = rawLandmarks[0];
  const middleMcp = rawLandmarks[9];

  // Palm reference scale: distance from wrist (0) to middle finger MCP (9)
  let palmScale = euclideanDistance(wrist, middleMcp);
  if (palmScale < 0.001) {
    // Fallback: distance from wrist to index MCP (5)
    palmScale = euclideanDistance(wrist, rawLandmarks[5]);
  }
  if (palmScale < 0.001) {
    palmScale = 1.0;
  }

  // Scale and translate: (P_i - wrist) / palmScale
  const normalizedLandmarks: NormalizedLandmark[] = rawLandmarks.map((lm) => ({
    x: (lm.x - wrist.x) / palmScale,
    y: (lm.y - wrist.y) / palmScale,
    z: (lm.z - wrist.z) / palmScale,
  }));

  return {
    landmarks: normalizedLandmarks,
    handedness,
    palmScale,
    wrist: { ...wrist },
  };
}
