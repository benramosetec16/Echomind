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
 * Evaluates hand pose features and motion features against the 8 POC signs
 */
export function evaluateSignMatch(
  pose: HandPoseFeatures,
  motion: MotionFeatures,
  hasTwoHands: boolean,
  frames: HandFrame[]
): MatchScore[] {
  const scores: MatchScore[] = [];

  // ── 1. ESTOU BEM (Thumbs Up) ──────────────────────────────────────────────
  if (pose.isThumbsUp) {
    const poseScore = 1.0;
    // Motion score is high if hand is held steady or with small vertical affirming motion
    const motionScore =
      motion.isStatic || motion.isNoddingVertical
        ? 0.95
        : motion.isWavingHorizontal
        ? 0.4
        : 0.8;
    const conf = Number((0.85 * poseScore + 0.15 * motionScore).toFixed(2));
    scores.push({
      sign: 'ESTOU_BEM',
      confidence: conf,
      reason: 'Polegar para cima detectado com dedos recolhidos e pose estável',
    });
  }

  // ── 2. NÃO ESTOU BEM (Thumbs Down) ────────────────────────────────────────
  if (pose.isThumbsDown) {
    const poseScore = 1.0;
    const motionScore =
      motion.isStatic || motion.displacement.y > 0
        ? 0.95
        : motion.isWavingHorizontal
        ? 0.4
        : 0.8;
    const conf = Number((0.85 * poseScore + 0.15 * motionScore).toFixed(2));
    scores.push({
      sign: 'NAO_ESTOU_BEM',
      confidence: conf,
      reason: 'Polegar para baixo detectado com dedos recolhidos e pose estável',
    });
  }

  // ── 3. OLÁ (Aceno com Mão Aberta ou letra I) ──────────────────────────────
  if (pose.isOpenHand || pose.isIPinky) {
    const poseScore = pose.isOpenHand ? 1.0 : 0.85;
    const motionScore = motion.isWavingHorizontal
      ? 1.0
      : motion.horizontalOscillations >= 1
      ? 0.75
      : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isWavingHorizontal || motion.horizontalOscillations >= 1)) {
      scores.push({
        sign: 'OLA',
        confidence: conf,
        reason: 'Mão aberta com oscilação lateral de aceno',
      });
    }
  }

  // ── 4. SIM (Punho fechado com oscilação vertical / concordância) ─────────
  if (pose.isFist) {
    const poseScore = 1.0;
    const motionScore = motion.isNoddingVertical
      ? 1.0
      : motion.verticalOscillations >= 1
      ? 0.75
      : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isNoddingVertical || motion.verticalOscillations >= 1)) {
      scores.push({
        sign: 'SIM',
        confidence: conf,
        reason: 'Punho fechado (letra S) com movimento vertical repetido de concordância',
      });
    }
  }

  // ── 5. NÃO (Indicador apontando para cima com oscilação lateral) ──────────
  if (pose.isIndexPointing || (pose.isOpenHand && motion.isWavingHorizontal)) {
    const poseScore = pose.isIndexPointing ? 1.0 : 0.75;
    const motionScore = motion.isWavingHorizontal
      ? 1.0
      : motion.horizontalOscillations >= 1
      ? 0.75
      : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isWavingHorizontal || motion.horizontalOscillations >= 1)) {
      scores.push({
        sign: 'NAO',
        confidence: conf,
        reason: 'Dedo indicador estendido com oscilação horizontal de negação',
      });
    }
  }

  // ── 6. OBRIGADO (Mão aberta com movimento descendente/frontal suave) ─────
  if (pose.isOpenHand && !motion.isWavingHorizontal && !motion.isNoddingVertical) {
    const poseScore = 1.0;
    const motionScore = motion.isForwardStroke
      ? 1.0
      : motion.displacement.y > 0.03
      ? 0.75
      : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isForwardStroke || motion.displacement.y > 0.03)) {
      scores.push({
        sign: 'OBRIGADO',
        confidence: conf,
        reason: 'Mão aberta partindo de cima com projeção frontal descendente',
      });
    }
  }

  // ── 7. AJUDA (Duas mãos em apoio ou mão de suporte avançando) ────────────
  if (hasTwoHands) {
    // Both hands present
    const motionScore = motion.displacement.y > 0.02 || motion.isForwardStroke ? 0.9 : 0.75;
    const conf = Number((0.85 * 0.5 + motionScore * 0.5).toFixed(2));
    scores.push({
      sign: 'AJUDA',
      confidence: conf,
      reason: 'Duas mãos detectadas em posição de suporte frontal',
    });
  } else if ((pose.isThumbsUp || pose.isFist) && motion.isForwardStroke) {
    const conf = 0.75;
    scores.push({
      sign: 'AJUDA',
      confidence: conf,
      reason: 'Gesto de suporte unilateral com avanço frontal',
    });
  }

  // ── 8. PRECISO CONVERSAR (Dedos em V / diálogo) ──────────────────────────
  if (pose.isVLetter) {
    const poseScore = 1.0;
    const motionScore = !motion.isThumbsUp && !motion.isThumbsDown ? 0.85 : 0.2;
    const conf = Number((0.65 * poseScore + 0.35 * motionScore).toFixed(2));
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
