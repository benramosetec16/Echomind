/**
 * EchoMind Libras — Independent Classifier Engine (LibrasRecognizer)
 * 
 * Responsibilities:
 * - Collects hand frames into an invariant temporal buffer
 * - Normalizes landmarks with normalizeLandmarks()
 * - Extracts anatomical pose features and kinematic motion trajectories
 * - Classifies using structural rules against the controlled POC vocabulary
 * - Applies strict confidence threshold (>= 0.70)
 * - Emits structured debug logs via librasLogger
 */

import { extractHandPoseFeatures, extractMotionFeatures } from './featureExtraction';
import { normalizeLandmarks } from './normalization';
import { CONFIDENCE_THRESHOLD, evaluateSignMatch, LIBRAS_POC_SIGNS } from './signs';
import {
  HandFrame,
  RecognitionResult,
  SignPrediction,
} from './types';
import { librasLogger } from '../logger';

export class LibrasRecognizer {
  private frameBuffer: HandFrame[] = [];
  private readonly maxFrames: number;

  constructor(maxFrames = 75) {
    this.maxFrames = maxFrames;
    librasLogger.info('Classifier', 'READY');
  }

  /**
   * Resets the temporal buffer
   */
  public reset(): void {
    this.frameBuffer = [];
  }

  /**
   * Adds a new hand frame to the sequence buffer
   */
  public addFrame(frame: HandFrame): void {
    if (this.frameBuffer.length >= this.maxFrames) {
      this.frameBuffer.shift();
    }
    this.frameBuffer.push(frame);
  }

  /**
   * Returns current sequence frame count
   */
  public getFrameCount(): number {
    return this.frameBuffer.length;
  }

  /**
   * Classifies the captured temporal sequence
   */
  public classify(): RecognitionResult {
    const frames = this.frameBuffer;
    librasLogger.info('Sequence length', frames.length);

    // 1. Validate frames presence
    if (frames.length === 0) {
      librasLogger.warn('Classifier', 'Nenhum frame gravado');
      return {
        success: false,
        error: 'NO_HANDS',
        confidence: 0,
      };
    }

    // 2. Filter frames containing hands
    const framesWithHands = frames.filter(
      (f) => f.hands && f.hands.length > 0 && f.hands[0].landmarks.length >= 21
    );

    librasLogger.info('Hands detected', framesWithHands.length);

    if (framesWithHands.length < 3) {
      librasLogger.warn('Classifier', 'Poucos frames com mãos detectadas');
      return {
        success: false,
        error: 'NO_HANDS',
        confidence: 0,
      };
    }

    // 3. Extract motion features across entire temporal sequence
    const motion = extractMotionFeatures(framesWithHands);

    // 4. Sample pose from 3 points in the sequence and majority-vote boolean features
    // This makes detection robust to brief position variations mid-gesture
    const sampleIndices = [
      Math.floor(framesWithHands.length * 0.33),
      Math.floor(framesWithHands.length * 0.50),
      Math.floor(framesWithHands.length * 0.67),
    ];

    const sampledPoses = sampleIndices.map((idx) => {
      const det = framesWithHands[idx].hands[0];
      const normalized = normalizeLandmarks(det.landmarks, det.handedness);
      return extractHandPoseFeatures(normalized, det.landmarks);
    });

    // Majority vote: a boolean feature is true if >= 2 of 3 frames agree
    const majority = (key: keyof typeof sampledPoses[0]): boolean => {
      const trueCount = sampledPoses.filter((p) => p[key] === true).length;
      return trueCount >= 2;
    };

    // Aggregate palmFacing by plurality (most common value)
    const facingCounts: Record<string, number> = {};
    for (const p of sampledPoses) {
      facingCounts[p.palmFacing] = (facingCounts[p.palmFacing] ?? 0) + 1;
    }
    const majorityFacing = (Object.entries(facingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'camera') as typeof sampledPoses[0]['palmFacing'];

    // Build a voted pose using the middle frame's fingers (fingers are complex sub-objects)
    // and overriding all boolean flags with majority votes
    const midFrameIdx = Math.floor(framesWithHands.length * 0.50);
    const midDet = framesWithHands[midFrameIdx].hands[0];
    const midNormalized = normalizeLandmarks(midDet.landmarks, midDet.handedness);
    const midPose = extractHandPoseFeatures(midNormalized, midDet.landmarks);

    const pose = {
      ...midPose,
      palmFacing: majorityFacing,
      isThumbsUp:       majority('isThumbsUp'),
      isThumbsDown:     majority('isThumbsDown'),
      isFist:           majority('isFist'),
      isOpenHand:       majority('isOpenHand'),
      isIndexPointing:  majority('isIndexPointing'),
      isVLetter:        majority('isVLetter'),
      isIPinky:         majority('isIPinky'),
    };

    // Check if 2 hands were detected in at least 30% of frames
    const twoHandsCount = framesWithHands.filter((f) => f.hands.length >= 2).length;
    const hasTwoHands = twoHandsCount / framesWithHands.length > 0.3;

    // 5. Evaluate matches
    const matches = evaluateSignMatch(pose, motion, hasTwoHands, framesWithHands);

    if (matches.length === 0) {
      librasLogger.info('Prediction', 'NONE');
      librasLogger.info('Confidence', 0);
      return {
        success: false,
        error: 'NOT_RECOGNIZED',
        confidence: 0,
      };
    }

    const bestMatch = matches[0];
    const signDef = LIBRAS_POC_SIGNS[bestMatch.sign];

    librasLogger.info('Prediction', bestMatch.sign);
    librasLogger.info('Confidence', bestMatch.confidence);
    librasLogger.info('Match reason', bestMatch.reason);

    // 6. Apply strict confidence threshold
    if (bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
      const prediction: SignPrediction = {
        sign: bestMatch.sign,
        label: signDef.label,
        text: signDef.text,
        confidence: bestMatch.confidence,
        matchReason: bestMatch.reason,
      };
      return {
        success: true,
        prediction,
        confidence: bestMatch.confidence,
      };
    }

    // Confidence below threshold: never guess or invent an interpretation
    librasLogger.warn('Low confidence prediction rejected', {
      candidate: bestMatch.sign,
      confidence: bestMatch.confidence,
      threshold: CONFIDENCE_THRESHOLD,
    });

    return {
      success: false,
      error: 'LOW_CONFIDENCE',
      confidence: bestMatch.confidence,
    };
  }
}
