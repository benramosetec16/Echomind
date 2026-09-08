/**
 * EchoMind Libras — Classifier Type Definitions
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandDetection {
  landmarks: HandLandmark[];
  handedness?: 'Left' | 'Right';
  score?: number;
  /** Gesture category name from MediaPipe GestureRecognizer ML model, e.g. 'Thumb_Up', 'Open_Palm', 'Victory' */
  gestureLabel?: string;
  /** Confidence score (0–1) for the gesture from the ML model */
  gestureScore?: number;
}

export interface HandFrame {
  timestamp: number;
  hands: HandDetection[];
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface NormalizedHand {
  landmarks: NormalizedLandmark[];
  handedness?: 'Left' | 'Right';
  palmScale: number;
  wrist: HandLandmark;
}

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface FingerState {
  isExtended: boolean;
  isCurled: boolean;
  curlRatio: number;
  tipDistanceToWrist: number;
  tipToMcpDistance: number;
  direction: { x: number; y: number; z: number };
}

export interface HandPoseFeatures {
  fingers: Record<FingerName, FingerState>;
  palmFacing: 'camera' | 'inward' | 'side' | 'up' | 'down';
  isThumbsUp: boolean;
  isThumbsDown: boolean;
  isFist: boolean;
  isOpenHand: boolean;
  isIndexPointing: boolean;
  isVLetter: boolean;
  isIPinky: boolean;
}

export interface MotionFeatures {
  displacement: { x: number; y: number; z: number };
  totalDistance: number;
  avgSpeed: number;
  horizontalOscillations: number;
  verticalOscillations: number;
  isWavingHorizontal: boolean;
  isNoddingVertical: boolean;
  isForwardStroke: boolean;
  isStatic: boolean;
}

export type SignId =
  | 'OLA'
  | 'SIM'
  | 'NAO'
  | 'OBRIGADO'
  | 'AJUDA'
  | 'ESTOU_BEM'
  | 'NAO_ESTOU_BEM'
  | 'PRECISO_CONVERSAR';

export interface SignDefinition {
  id: SignId;
  label: string;
  text: string;
  description: string;
  icon: string;
}

export interface SignPrediction {
  sign: SignId;
  label: string;
  text: string;
  confidence: number;
  matchReason: string;
}

export type RecognitionErrorType =
  | 'NO_HANDS'
  | 'LOW_CONFIDENCE'
  | 'NOT_RECOGNIZED'
  | 'INSUFFICIENT_FRAMES';

export interface RecognitionResult {
  success: boolean;
  prediction?: SignPrediction;
  error?: RecognitionErrorType;
  confidence: number;
}
