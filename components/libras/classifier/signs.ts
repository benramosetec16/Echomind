/**
 * EchoMind Libras — Controlled Sign Definitions & Matching
 * 
 * Defines the POC vocabulary of 8 structured signs:
 * 1. OLA ("Olá! Tudo bem?")
 * 2. SIM ("Sim, concordo.")
 * 3. NAO ("Não.")
 * 4. OBRIGADO ("Obrigado.")
 * 5. AJUDA ("Preciso de ajuda.")
 * 6. ESTOU_BEM ("Estou me sentindo bem.")
 * 7. NAO_ESTOU_BEM ("Não estou me sentindo bem.")
 * 8. PRECISO_CONVERSAR ("Preciso conversar com alguém.")
 */

import {
  HandFrame,
  HandPoseFeatures,
  MotionFeatures,
  SignDefinition,
  SignId,
  SignPrediction,
} from './types';

export const LIBRAS_POC_SIGNS: Record<SignId, SignDefinition> = {
  OLA: {
    id: 'OLA',
    label: 'Olá',
    text: 'Olá! Tudo bem?',
    description: 'Mão aberta acenando lateralmente',
    icon: 'waving_hand',
  },
  SIM: {
    id: 'SIM',
    label: 'Sim',
    text: 'Sim, concordo.',
    description: 'Punho fechado movimentando-se para cima e para baixo (concordância)',
    icon: 'check_circle',
  },
  NAO: {
    id: 'NAO',
    label: 'Não',
    text: 'Não.',
    description: 'Dedo indicador estendido ou mão aberta balançando lateralmente (negação)',
    icon: 'cancel',
  },
  OBRIGADO: {
    id: 'OBRIGADO',
    label: 'Obrigado',
    text: 'Obrigado.',
    description: 'Mão aberta partindo da altura do peito/face e projetando-se para frente',
    icon: 'sentiment_satisfied',
  },
  AJUDA: {
    id: 'AJUDA',
    label: 'Ajuda',
    text: 'Preciso de ajuda.',
    description: 'Gesto de apoio projetando-se para frente',
    icon: 'front_hand',
  },
  ESTOU_BEM: {
    id: 'ESTOU_BEM',
    label: 'Estou bem',
    text: 'Estou me sentindo bem.',
    description: 'Polegar para cima com mão estável',
    icon: 'thumb_up',
  },
  NAO_ESTOU_BEM: {
    id: 'NAO_ESTOU_BEM',
    label: 'Não estou bem',
    text: 'Não estou me sentindo bem.',
    description: 'Polegar para baixo com mão estável',
    icon: 'thumb_down',
  },
  PRECISO_CONVERSAR: {
    id: 'PRECISO_CONVERSAR',
    label: 'Preciso conversar',
    text: 'Preciso conversar com alguém.',
    description: 'Dedos indicador e médio em "V" com movimento comunicativo',
    icon: 'forum',
  },
};

/**
 * Minimum confidence required to accept a sign as recognized
 */
export const CONFIDENCE_THRESHOLD = 0.70;

interface MatchScore {
  sign: SignId;
  confidence: number;
  reason: string;
}

/**
 * Evaluates hand pose features and motion features against the 8 POC signs.
 *
 * Design rules to avoid sign collision:
 *  - OLÁ  : open hand (all 4 fingers + thumb) + horizontal wave
 *  - NÃO  : ONLY index extended (no other fingers) + horizontal wave
 *  - SIM  : fist + any vertical oscillation
 *  - OBRIGADO : open hand + downward/forward stroke + palm facing camera (no horizontal wave)
 *  - ESTOU_BEM : thumbs up (static or small motion)
 *  - NAO_ESTOU_BEM : thumbs down (static or small motion)
 *  - AJUDA : two hands OR fist+forward stroke
 *  - PRECISO_CONVERSAR : V-letter (index+middle extended, ring+pinky curled)
 */
export function evaluateSignMatch(
  pose: HandPoseFeatures,
  motion: MotionFeatures,
  hasTwoHands: boolean,
  frames: HandFrame[]
): MatchScore[] {
  const scores: MatchScore[] = [];

  // ── 1. ESTOU BEM (Polegar para cima) ─────────────────────────────────────
  if (pose.isThumbsUp) {
    const motionScore =
      motion.isStatic || motion.isNoddingVertical
        ? 0.95
        : motion.isWavingHorizontal
        ? 0.4
        : 0.8;
    const conf = Number((0.85 * 1.0 + 0.15 * motionScore).toFixed(2));
    scores.push({
      sign: 'ESTOU_BEM',
      confidence: conf,
      reason: 'Polegar para cima com dedos recolhidos',
    });
  }

  // ── 2. NÃO ESTOU BEM (Polegar para baixo) ────────────────────────────────
  if (pose.isThumbsDown) {
    const motionScore =
      motion.isStatic || motion.displacement.y > 0
        ? 0.95
        : motion.isWavingHorizontal
        ? 0.4
        : 0.8;
    const conf = Number((0.85 * 1.0 + 0.15 * motionScore).toFixed(2));
    scores.push({
      sign: 'NAO_ESTOU_BEM',
      confidence: conf,
      reason: 'Polegar para baixo com dedos recolhidos',
    });
  }

  // ── 3. OLÁ (Mão COMPLETAMENTE aberta + aceno lateral) ────────────────────
  // DISCRIMINADOR: isOpenHand exige todos os 4 dedos estendidos.
  // NÃO pode ser misturado com NÃO (que usa apenas indicador).
  if (pose.isOpenHand && !pose.isThumbsUp && !pose.isThumbsDown) {
    const motionScore = motion.isWavingHorizontal
      ? 1.0
      : motion.horizontalOscillations >= 1
      ? 0.7
      : 0.05;
    const conf = Number((0.40 * 1.0 + 0.60 * motionScore).toFixed(2));
    // Only push if there is clear horizontal movement
    if (motion.isWavingHorizontal || motion.horizontalOscillations >= 1) {
      scores.push({
        sign: 'OLA',
        confidence: conf,
        reason: 'Mão completamente aberta com oscilação horizontal de aceno',
      });
    }
  }

  // ── 4. SIM (Punho fechado + movimento vertical) ───────────────────────────
  // DISCRIMINADOR: isFist exige todos 4 dedos curvados, sem polegares.
  if (pose.isFist) {
    const motionScore = motion.isNoddingVertical
      ? 1.0
      : motion.verticalOscillations >= 1
      ? 0.80
      : motion.displacement.y > 0.04   // ao menos movimento descendente
      ? 0.60
      : 0.1;
    const conf = Number((0.40 * 1.0 + 0.60 * motionScore).toFixed(2));
    if (motionScore >= 0.6) {
      scores.push({
        sign: 'SIM',
        confidence: conf,
        reason: 'Punho fechado com movimento vertical de concordância',
      });
    }
  }

  // ── 5. NÃO (Somente indicador estendido + oscilação lateral) ─────────────
  // DISCRIMINADOR: isIndexPointing exige que APENAS o indicador esteja estendido.
  // Mão aberta NUNCA ativa este sinal (evita colisão com OLÁ).
  if (pose.isIndexPointing && !pose.isOpenHand) {
    const motionScore = motion.isWavingHorizontal
      ? 1.0
      : motion.horizontalOscillations >= 1
      ? 0.75
      : 0.1;
    const conf = Number((0.45 * 1.0 + 0.55 * motionScore).toFixed(2));
    if (motion.isWavingHorizontal || motion.horizontalOscillations >= 1) {
      scores.push({
        sign: 'NAO',
        confidence: conf,
        reason: 'Dedo indicador isolado com oscilação lateral de negação',
      });
    }
  }

  // ── 6. OBRIGADO (Mão aberta + movimento frontal/descendente suave) ────────
  // DISCRIMINADOR: isOpenHand + palmFacing camera + movimento descendente/frontal.
  // Explicitamente PROIBIDO se houver oscilação lateral (seria OLÁ).
  if (
    pose.isOpenHand &&
    !motion.isWavingHorizontal &&
    !motion.isNoddingVertical &&
    pose.palmFacing === 'camera'
  ) {
    const motionScore = motion.isForwardStroke
      ? 1.0
      : motion.displacement.y > 0.03
      ? 0.80
      : 0.1;
    const conf = Number((0.45 * 1.0 + 0.55 * motionScore).toFixed(2));
    if (motion.isForwardStroke || motion.displacement.y > 0.03) {
      scores.push({
        sign: 'OBRIGADO',
        confidence: conf,
        reason: 'Mão aberta (palma para câmera) com projeção descendente/frontal',
      });
    }
  }

  // ── 7. AJUDA (Duas mãos ou gesto de suporte frontal) ─────────────────────
  if (hasTwoHands) {
    const motionScore =
      motion.displacement.y > 0.02 || motion.isForwardStroke ? 0.90 : 0.75;
    const conf = Number((0.85 * 0.5 + motionScore * 0.5).toFixed(2));
    scores.push({
      sign: 'AJUDA',
      confidence: conf,
      reason: 'Duas mãos detectadas em posição de suporte frontal',
    });
  } else if ((pose.isThumbsUp || pose.isFist) && motion.isForwardStroke) {
    scores.push({
      sign: 'AJUDA',
      confidence: 0.72,
      reason: 'Gesto de suporte unilateral com avanço frontal',
    });
  }

  // ── 8. PRECISO CONVERSAR (Dedos V — indicador + médio estendidos) ─────────
  // DISCRIMINADOR: isVLetter é único — index+middle estendidos, ring+pinky curvados.
  if (pose.isVLetter) {
    const motionScore =
      motion.isStatic || motion.displacement.y > 0 || motion.horizontalOscillations >= 1
        ? 0.85
        : 0.6;
    const conf = Number((0.65 * 1.0 + 0.35 * motionScore).toFixed(2));
    if (conf >= 0.5) {
      scores.push({
        sign: 'PRECISO_CONVERSAR',
        confidence: conf,
        reason: 'Dedos indicador e médio estendidos em "V" comunicativo',
      });
    }
  }

  // Sort scores descending
  scores.sort((a, b) => b.confidence - a.confidence);
  return scores;
}
