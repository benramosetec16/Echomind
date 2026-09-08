/**
 * EchoMind Libras — Anatomical & Motion Feature Extraction
 * 
 * Extracts geometric, anatomical and kinematic features from hand landmarks:
 * - Finger flexion/extension and curl ratios
 * - Palm orientation vector
 * - Special hand shapes (fist, open hand, thumbs up/down, V, index pointing)
 * - Temporal motion trajectories (waving, nodding, forward stroke, static)
 */

import { euclideanDistance } from './normalization';
import {
  FingerName,
  FingerState,
  HandDetection,
  HandFrame,
  HandLandmark,
  HandPoseFeatures,
  MotionFeatures,
  NormalizedHand,
} from './types';

// Landmark indices for each finger
const FINGER_INDICES = {
  thumb: { mcp: 2, pip: 3, dip: 3, tip: 4 },
  index: { mcp: 5, pip: 6, dip: 7, tip: 8 },
  middle: { mcp: 9, pip: 10, dip: 11, tip: 12 },
  ring: { mcp: 13, pip: 14, dip: 15, tip: 16 },
  pinky: { mcp: 17, pip: 18, dip: 19, tip: 20 },
} as const;

/**
 * Extracts pose features from a single normalized hand
 */
export function extractHandPoseFeatures(
  normalized: NormalizedHand,
  rawLandmarks: HandLandmark[]
): HandPoseFeatures {
  const nLm = normalized.landmarks;
  const origin = { x: 0, y: 0, z: 0 };

  const fingers: Record<FingerName, FingerState> = {} as any;

  // 1. Analyze 4 main fingers (Index, Middle, Ring, Pinky)
  const mainFingers: Array<'index' | 'middle' | 'ring' | 'pinky'> = [
    'index',
    'middle',
    'ring',
    'pinky',
  ];

  for (const finger of mainFingers) {
    const idx = FINGER_INDICES[finger];
    const mcp = nLm[idx.mcp];
    const pip = nLm[idx.pip];
    const tip = nLm[idx.tip];

    const tipDistanceToWrist = euclideanDistance(tip, origin);
    const pipDistanceToWrist = euclideanDistance(pip, origin);
    const tipToMcpDistance = euclideanDistance(tip, mcp);
    const pipToMcpDistance = euclideanDistance(pip, mcp);

    const curlRatio = tipDistanceToWrist / (pipDistanceToWrist + 0.0001);

    // Finger is extended if tip is distinctly further from wrist than PIP and MCP
    const isExtended =
      tipDistanceToWrist > pipDistanceToWrist * 1.12 &&
      tipToMcpDistance > pipToMcpDistance * 1.05;

    // Finger is curled if tip is tucked close to MCP or closer to wrist than PIP
    const isCurled =
      tipDistanceToWrist < pipDistanceToWrist * 0.96 ||
      tipToMcpDistance < pipToMcpDistance * 0.85;

    const dirLen = tipToMcpDistance || 1;
    fingers[finger] = {
      isExtended,
      isCurled,
      curlRatio,
      tipDistanceToWrist,
      tipToMcpDistance,
      direction: {
        x: (tip.x - mcp.x) / dirLen,
        y: (tip.y - mcp.y) / dirLen,
        z: (tip.z - mcp.z) / dirLen,
      },
    };
  }

  // 2. Analyze Thumb
  const thumbMcp = nLm[FINGER_INDICES.thumb.mcp];
  const thumbTip = nLm[FINGER_INDICES.thumb.tip];
  const pinkyMcp = nLm[17];
  const indexMcp = nLm[5];

  const thumbTipDistWrist = euclideanDistance(thumbTip, origin);
  const thumbMcpDistWrist = euclideanDistance(thumbMcp, origin);
  const thumbTipDistPinky = euclideanDistance(thumbTip, pinkyMcp);
  const thumbTipDistIndex = euclideanDistance(thumbTip, indexMcp);

  const thumbDeltaY = thumbTip.y - thumbMcp.y; // In screen coordinates, negative = pointing UP
  const thumbDeltaX = thumbTip.x - thumbMcp.x;
  const thumbLen = euclideanDistance(thumbTip, thumbMcp) || 1;

  // Thumb extended if away from palm
  const thumbExtended = thumbTipDistPinky > 0.75 || thumbTipDistWrist > thumbMcpDistWrist * 1.1;
  const thumbCurled = !thumbExtended || (thumbTipDistIndex < 0.45 && Math.abs(thumbDeltaY) < 0.3);

  fingers.thumb = {
    isExtended: thumbExtended,
    isCurled: thumbCurled,
    curlRatio: thumbTipDistWrist / (thumbMcpDistWrist + 0.0001),
    tipDistanceToWrist: thumbTipDistWrist,
    tipToMcpDistance: thumbLen,
    direction: {
      x: thumbDeltaX / thumbLen,
      y: thumbDeltaY / thumbLen,
      z: (thumbTip.z - thumbMcp.z) / thumbLen,
    },
  };

  // 3. Palm orientation (via cross product of wrist->indexMcp and wrist->pinkyMcp)
  const v1 = { x: nLm[5].x, y: nLm[5].y, z: nLm[5].z };
  const v2 = { x: nLm[17].x, y: nLm[17].y, z: nLm[17].z };
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
  const normalLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z) || 1;
  const normZ = normal.z / normalLen;
  const normY = normal.y / normalLen;

  let palmFacing: HandPoseFeatures['palmFacing'] = 'camera';
  if (normY < -0.55) {
    palmFacing = 'up';
  } else if (normY > 0.55) {
    palmFacing = 'down';
  } else if (normZ > 0.35) {
    palmFacing = 'inward';
  } else if (Math.abs(normZ) < 0.25) {
    palmFacing = 'side';
  } else {
    palmFacing = 'camera';
  }

  // 4. Specific Pose Classifications
  const otherFingersCurled =
    fingers.index.isCurled &&
    fingers.middle.isCurled &&
    fingers.ring.isCurled &&
    fingers.pinky.isCurled;

  // Thumbs up: thumb pointing UP (thumbDeltaY < -0.32), thumb extended and distinct, other fingers curled
  const isThumbsUp =
    otherFingersCurled &&
    thumbDeltaY < -0.32 &&
    thumbLen > 0.4 &&
    thumbTipDistPinky > 0.7 &&
    Math.abs(thumbDeltaX) < Math.abs(thumbDeltaY) * 1.5;

  // Thumbs down: thumb pointing DOWN (thumbDeltaY > 0.32), thumb extended and distinct, other fingers curled
  const isThumbsDown =
    otherFingersCurled &&
    thumbDeltaY > 0.32 &&
    thumbLen > 0.4 &&
    thumbTipDistPinky > 0.7 &&
    Math.abs(thumbDeltaX) < Math.abs(thumbDeltaY) * 1.5;

  // Fist: all 4 main fingers curled
  const isFist = otherFingersCurled && !isThumbsUp && !isThumbsDown;

  // Open hand: index, middle, ring, pinky all extended
  const isOpenHand =
    fingers.index.isExtended &&
    fingers.middle.isExtended &&
    fingers.ring.isExtended &&
    fingers.pinky.isExtended;

  // Index pointing (Letter D shape): index extended, middle/ring/pinky curled
  const isIndexPointing =
    fingers.index.isExtended &&
    fingers.middle.isCurled &&
    fingers.ring.isCurled &&
    fingers.pinky.isCurled;

  // V letter: index and middle extended and separated, ring/pinky curled
  const indexMiddleDist = euclideanDistance(nLm[8], nLm[12]);
  const isVLetter =
    fingers.index.isExtended &&
    fingers.middle.isExtended &&
    fingers.ring.isCurled &&
    fingers.pinky.isCurled &&
    indexMiddleDist > 0.25;

  // I letter (Pinky only): pinky extended, index/middle/ring curled
  const isIPinky =
    fingers.pinky.isExtended &&
    fingers.index.isCurled &&
    fingers.middle.isCurled &&
    fingers.ring.isCurled;

  return {
    fingers,
    palmFacing,
    isThumbsUp,
    isThumbsDown,
    isFist,
    isOpenHand,
    isIndexPointing,
    isVLetter,
    isIPinky,
  };
}

/**
 * Extracts temporal motion features from a sequence of recorded HandFrames
 */
export function extractMotionFeatures(frames: HandFrame[]): MotionFeatures {
  const validFrames: Array<{ t: number; hand: HandDetection }> = [];

  for (const f of frames) {
    if (f.hands && f.hands.length > 0 && f.hands[0].landmarks.length >= 21) {
      validFrames.push({ t: f.timestamp, hand: f.hands[0] });
    }
  }

  const defaultMotion: MotionFeatures = {
    displacement: { x: 0, y: 0, z: 0 },
    totalDistance: 0,
    avgSpeed: 0,
    horizontalOscillations: 0,
    verticalOscillations: 0,
    isWavingHorizontal: false,
    isNoddingVertical: false,
    isForwardStroke: false,
    isStatic: true,
  };

  if (validFrames.length < 3) {
    return defaultMotion;
  }

  // Track wrist positions (raw normalized coordinates [0, 1])
  const firstWrist = validFrames[0].hand.landmarks[0];
  const lastWrist = validFrames[validFrames.length - 1].hand.landmarks[0];

  const displacement = {
    x: lastWrist.x - firstWrist.x,
    y: lastWrist.y - firstWrist.y,
    z: (lastWrist.z ?? 0) - (firstWrist.z ?? 0),
  };

  let totalDistance = 0;
  const vxSeries: number[] = [];
  const vySeries: number[] = [];

  let minX = firstWrist.x;
  let maxX = firstWrist.x;
  let minY = firstWrist.y;
  let maxY = firstWrist.y;

  for (let i = 1; i < validFrames.length; i++) {
    const prev = validFrames[i - 1].hand.landmarks[0];
    const curr = validFrames[i].hand.landmarks[0];
    const dt = Math.max(1, validFrames[i].t - validFrames[i - 1].t) / 1000;

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dz = (curr.z ?? 0) - (prev.z ?? 0);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    totalDistance += dist;
    vxSeries.push(dx / dt);
    vySeries.push(dy / dt);

    if (curr.x < minX) minX = curr.x;
    if (curr.x > maxX) maxX = curr.x;
    if (curr.y < minY) minY = curr.y;
    if (curr.y > maxY) maxY = curr.y;
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const totalDuration =
    Math.max(1, validFrames[validFrames.length - 1].t - validFrames[0].t) / 1000;
  const avgSpeed = totalDistance / totalDuration;

  // Count direction sign flips (zero-crossings of velocity with noise threshold)
  const countOscillations = (velocities: number[], minAmp: number): number => {
    let count = 0;
    let prevSign = 0;
    for (const v of velocities) {
      if (Math.abs(v) > minAmp) {
        const sign = v > 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) {
          count++;
        }
        prevSign = sign;
      }
    }
    return count;
  };

  const horizontalOscillations = countOscillations(vxSeries, 0.08);
  const verticalOscillations = countOscillations(vySeries, 0.08);

  // Waving: horizontal oscillations >= 2 with significant horizontal span
  const isWavingHorizontal = horizontalOscillations >= 2 && spanX > 0.07;

  // Nodding: vertical oscillations >= 2 with significant vertical span
  const isNoddingVertical = verticalOscillations >= 2 && spanY > 0.05;

  // Forward stroke: smooth downward/forward projection from top towards camera (no oscillation)
  const isForwardStroke =
    spanY > 0.08 &&
    displacement.y > 0.04 &&
    verticalOscillations <= 1 &&
    horizontalOscillations <= 1;

  // Static: minimal total motion
  const isStatic = totalDistance < 0.25 && !isWavingHorizontal && !isNoddingVertical;

  return {
    displacement,
    totalDistance,
    avgSpeed,
    horizontalOscillations,
    verticalOscillations,
    isWavingHorizontal,
    isNoddingVertical,
    isForwardStroke,
    isStatic,
  };
}
