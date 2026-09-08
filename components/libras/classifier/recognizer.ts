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

    // 4. Sample and aggregate hand pose features
    // Sample across the second half of the sequence where the gesture is typically established
    const sampleStart = Math.floor(framesWithHands.length * 0.3);
    const sampleEnd = framesWithHands.length;
    const sampleFrames = framesWithHands.slice(sampleStart, sampleEnd);

    // Take the most representative/stable hand detection
    const representativeDetection = sampleFrames[Math.floor(sampleFrames.length / 2)].hands[0];
    const rawLandmarks = representativeDetection.landmarks;

    let normalizedHand;
    try {
      normalizedHand = normalizeLandmarks(rawLandmarks, representativeDetection.handedness);
      librasLogger.info('Landmarks', 'OK (normalized)');
    } catch (e: any) {
      librasLogger.error('Normalization error', e.message);
      return {
        success: false,
        error: 'NOT_RECOGNIZED',
        confidence: 0,
      };
    }

    const pose = extractHandPoseFeatures(normalizedHand, rawLandmarks);

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
