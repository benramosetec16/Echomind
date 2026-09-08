/**
 * EchoMind Libras — Classifier Engine (LibrasRecognizer)
 *
 * Strategy:
 * 1. Collects HandFrames into a temporal buffer (each frame carries the
 *    gesture label from MediaPipe GestureRecognizer ML model)
 * 2. Votes on the dominant gesture label across the buffer
 * 3. Extracts motion features (waving, nodding, forward stroke)
 * 4. Maps (gesture label + motion) → one of the 8 Libras POC signs
 * 5. Applies strict confidence threshold (≥ 0.70)
 *
 * Why gesture label voting?
 * - MediaPipe GestureRecognizer is a real ML model trained on thousands of
 *   real hands. It correctly distinguishes Thumb_Up from Open_Palm from
 *   Victory, etc. Our old boolean geometry rules could not do this reliably.
 * - A single frame is noisy; voting across all recorded frames gives a stable
 *   and robust classification.
 */

import { extractMotionFeatures } from './featureExtraction';
import { CONFIDENCE_THRESHOLD, LIBRAS_POC_SIGNS } from './signs';
import { HandFrame, RecognitionResult, SignId, SignPrediction } from './types';
import { librasLogger } from '../logger';

// MediaPipe GestureRecognizer category names
type GestureLabel =
  | 'None'
  | 'Closed_Fist'
  | 'Open_Palm'
  | 'Pointing_Up'
  | 'Thumb_Down'
  | 'Thumb_Up'
  | 'Victory'
  | 'ILY'
  | string; // allow unknown labels gracefully

/**
 * Maps (dominant gesture label, motion features) → sign match result.
 *
 * Discriminator table:
 *  Thumb_Up       → ESTOU_BEM   (any motion)
 *  Thumb_Down     → NAO_ESTOU_BEM (any motion)
 *  Open_Palm      → OLÁ        if horizontal wave detected
 *  Open_Palm      → OBRIGADO   if downward/forward motion, no wave
 *  Closed_Fist    → SIM        if any vertical motion
 *  Pointing_Up    → NÃO        if any horizontal oscillation
 *  Victory        → PRECISO_CONVERSAR (any motion)
 *  ILY            → AJUDA      (any motion)
 *  (two hands)    → AJUDA      (overrides single-hand classification)
 */
interface MatchResult {
  sign: SignId;
  confidence: number;
  reason: string;
}

function mapGestureToSign(
  dominantLabel: GestureLabel,
  gestureVoteScore: number, // 0–1: fraction of frames with this label
  motion: ReturnType<typeof extractMotionFeatures>,
  hasTwoHands: boolean
): MatchResult | null {
  // Two-hands override: AJUDA takes priority regardless of gesture shape
  if (hasTwoHands) {
    return {
      sign: 'AJUDA',
      confidence: Number((0.85 * gestureVoteScore + 0.15 * 0.9).toFixed(2)),
      reason: 'Duas mãos detectadas — gesto de suporte/ajuda',
    };
  }

  const hasHorizontalMotion =
    motion.isWavingHorizontal || motion.horizontalOscillations >= 1;
  const hasVerticalMotion =
    motion.isNoddingVertical || motion.verticalOscillations >= 1 || motion.displacement.y > 0.04;
  const hasForwardMotion =
    motion.isForwardStroke || motion.displacement.y > 0.03;

  switch (dominantLabel) {
    case 'Thumb_Up':
      return {
        sign: 'ESTOU_BEM',
        confidence: Number((0.85 * gestureVoteScore + 0.15 * 0.95).toFixed(2)),
        reason: 'Polegar para cima reconhecido pelo modelo ML',
      };

    case 'Thumb_Down':
      return {
        sign: 'NAO_ESTOU_BEM',
        confidence: Number((0.85 * gestureVoteScore + 0.15 * 0.95).toFixed(2)),
        reason: 'Polegar para baixo reconhecido pelo modelo ML',
      };

    case 'Victory':
      return {
        sign: 'PRECISO_CONVERSAR',
        confidence: Number((0.80 * gestureVoteScore + 0.20 * 0.85).toFixed(2)),
        reason: 'Sinal V reconhecido pelo modelo ML — comunicação',
      };

    case 'ILY':
      return {
        sign: 'AJUDA',
        confidence: Number((0.80 * gestureVoteScore + 0.20 * 0.85).toFixed(2)),
        reason: 'Sinal ILY reconhecido pelo modelo ML — apoio/ajuda',
      };

    case 'Open_Palm': {
      if (hasHorizontalMotion) {
        // Waving open hand → OLÁ
        const motionScore = motion.isWavingHorizontal ? 1.0 : 0.75;
        return {
          sign: 'OLA',
          confidence: Number((0.50 * gestureVoteScore + 0.50 * motionScore).toFixed(2)),
          reason: 'Mão aberta com aceno lateral — Olá',
        };
      } else if (hasForwardMotion) {
        // Downward/forward open hand → OBRIGADO
        const motionScore = motion.isForwardStroke ? 1.0 : 0.80;
        return {
          sign: 'OBRIGADO',
          confidence: Number((0.50 * gestureVoteScore + 0.50 * motionScore).toFixed(2)),
          reason: 'Mão aberta com projeção frontal/descendente — Obrigado',
        };
      }
      // Open palm but no clear motion — too ambiguous, reject
      return null;
    }

    case 'Closed_Fist': {
      if (hasVerticalMotion) {
        const motionScore = motion.isNoddingVertical ? 1.0 : 0.75;
        return {
          sign: 'SIM',
          confidence: Number((0.50 * gestureVoteScore + 0.50 * motionScore).toFixed(2)),
          reason: 'Punho fechado com movimento vertical — Sim',
        };
      }
      if (motion.isForwardStroke) {
        return {
          sign: 'AJUDA',
          confidence: Number((0.50 * gestureVoteScore + 0.50 * 0.80).toFixed(2)),
          reason: 'Punho com avanço frontal — Ajuda',
        };
      }
      return null;
    }

    case 'Pointing_Up': {
      if (hasHorizontalMotion) {
        const motionScore = motion.isWavingHorizontal ? 1.0 : 0.75;
        return {
          sign: 'NAO',
          confidence: Number((0.50 * gestureVoteScore + 0.50 * motionScore).toFixed(2)),
          reason: 'Indicador para cima com oscilação lateral — Não',
        };
      }
      return null;
    }

    default:
      return null;
  }
}

export class LibrasRecognizer {
  private frameBuffer: HandFrame[] = [];
  private readonly maxFrames: number;

  constructor(maxFrames = 75) {
    this.maxFrames = maxFrames;
    librasLogger.info('Classifier', 'READY (ML-based GestureRecognizer)');
  }

  public reset(): void {
    this.frameBuffer = [];
  }

  public addFrame(frame: HandFrame): void {
    if (this.frameBuffer.length >= this.maxFrames) {
      this.frameBuffer.shift();
    }
    this.frameBuffer.push(frame);
  }

  public getFrameCount(): number {
    return this.frameBuffer.length;
  }

  public classify(): RecognitionResult {
    const frames = this.frameBuffer;
    librasLogger.info('Sequence length', frames.length);

    if (frames.length === 0) {
      return { success: false, error: 'NO_HANDS', confidence: 0 };
    }

    // Filter frames that have at least one hand with landmarks
    const framesWithHands = frames.filter(
      (f) => f.hands && f.hands.length > 0 && f.hands[0].landmarks.length >= 21
    );

    librasLogger.info('Frames with hands', framesWithHands.length);

    if (framesWithHands.length < 3) {
      return { success: false, error: 'NO_HANDS', confidence: 0 };
    }

    // ── 1. Vote on dominant gesture label ────────────────────────────────────
    const labelCounts: Record<string, number> = {};
    for (const f of framesWithHands) {
      const label = f.hands[0].gestureLabel ?? 'None';
      labelCounts[label] = (labelCounts[label] ?? 0) + 1;
    }

    // Sort by count descending
    const sorted = Object.entries(labelCounts).sort((a, b) => b[1] - a[1]);
    const dominantLabel = sorted[0][0];
    const dominantCount = sorted[0][1];
    const gestureVoteScore = dominantCount / framesWithHands.length;

    librasLogger.info('Dominant gesture', `${dominantLabel} (${(gestureVoteScore * 100).toFixed(0)}% of frames)`);
    librasLogger.info('All gesture counts', JSON.stringify(labelCounts));

    // Reject if dominant label is 'None' or has < 40% vote share
    if (dominantLabel === 'None' || gestureVoteScore < 0.4) {
      librasLogger.warn('Classifier', `Gesture vote too weak: ${dominantLabel} at ${(gestureVoteScore * 100).toFixed(0)}%`);
      return { success: false, error: 'NOT_RECOGNIZED', confidence: 0 };
    }

    // ── 2. Extract motion features ────────────────────────────────────────────
    const motion = extractMotionFeatures(framesWithHands);

    librasLogger.info('Motion', JSON.stringify({
      isWavingHorizontal: motion.isWavingHorizontal,
      isNoddingVertical: motion.isNoddingVertical,
      isForwardStroke: motion.isForwardStroke,
      isStatic: motion.isStatic,
      horizontalOscillations: motion.horizontalOscillations,
      verticalOscillations: motion.verticalOscillations,
    }));

    // ── 3. Check for two-hands condition ──────────────────────────────────────
    const twoHandsCount = framesWithHands.filter((f) => f.hands.length >= 2).length;
    const hasTwoHands = twoHandsCount / framesWithHands.length > 0.3;

    // ── 4. Map gesture → sign ─────────────────────────────────────────────────
    const match = mapGestureToSign(dominantLabel, gestureVoteScore, motion, hasTwoHands);

    if (!match) {
      librasLogger.info('Prediction', `Gesture '${dominantLabel}' did not match any sign (insufficient motion or ambiguous)`);
      return { success: false, error: 'NOT_RECOGNIZED', confidence: 0 };
    }

    librasLogger.info('Prediction', match.sign);
    librasLogger.info('Confidence', match.confidence);
    librasLogger.info('Reason', match.reason);

    // ── 5. Apply confidence threshold ─────────────────────────────────────────
    if (match.confidence >= CONFIDENCE_THRESHOLD) {
      const signDef = LIBRAS_POC_SIGNS[match.sign];
      const prediction: SignPrediction = {
        sign: match.sign,
        label: signDef.label,
        text: signDef.text,
        confidence: match.confidence,
        matchReason: match.reason,
      };
      return { success: true, prediction, confidence: match.confidence };
    }

    librasLogger.warn('Low confidence prediction rejected', {
      candidate: match.sign,
      confidence: match.confidence,
      threshold: CONFIDENCE_THRESHOLD,
    });

    return { success: false, error: 'LOW_CONFIDENCE', confidence: match.confidence };
  }
}
