/**
 * EchoMind Libras — Classifier Automated Unit & Integration Tests
 * 
 * Verifies:
 * 1. Landmark normalization (translation to wrist, scale invariance)
 * 2. Hand pose feature extraction (fingers extension/curl, special shapes)
 * 3. Temporal motion feature extraction (waving, nodding, forward stroke, static)
 * 4. Sign recognition with calibrated confidence and threshold enforcement
 * 5. Rejection of unclassified / low confidence gestures
 */

import {
  euclideanDistance,
  normalizeLandmarks,
} from '../normalization';
import {
  extractHandPoseFeatures,
  extractMotionFeatures,
} from '../featureExtraction';
import { LibrasRecognizer } from '../recognizer';
import { HandFrame, HandLandmark } from '../types';

/**
 * Helper to build synthetic 21-landmark hand models
 */
function createSyntheticHand(options: {
  wristPos?: { x: number; y: number; z: number };
  thumbDirection?: 'up' | 'down' | 'curled' | 'extended';
  indexState?: 'extended' | 'curled';
  middleState?: 'extended' | 'curled';
  ringState?: 'extended' | 'curled';
  pinkyState?: 'extended' | 'curled';
  scale?: number;
}): HandLandmark[] {
  const wrist = options.wristPos || { x: 0.5, y: 0.5, z: 0 };
  const s = options.scale || 0.15; // default palm scale

  const lms: HandLandmark[] = new Array(21).fill(null).map(() => ({ ...wrist }));

  // 0: Wrist
  lms[0] = { ...wrist };

  // MCP base positions relative to wrist
  lms[1] = { x: wrist.x - 0.2 * s, y: wrist.y - 0.3 * s, z: 0 }; // Thumb CMC
  lms[2] = { x: wrist.x - 0.4 * s, y: wrist.y - 0.5 * s, z: 0 }; // Thumb MCP
  lms[5] = { x: wrist.x - 0.3 * s, y: wrist.y - 1.0 * s, z: 0 }; // Index MCP
  lms[9] = { x: wrist.x, y: wrist.y - 1.0 * s, z: 0 };          // Middle MCP (reference scale)
  lms[13] = { x: wrist.x + 0.3 * s, y: wrist.y - 0.95 * s, z: 0 }; // Ring MCP
  lms[17] = { x: wrist.x + 0.5 * s, y: wrist.y - 0.85 * s, z: 0 }; // Pinky MCP

  // Helper for 4 fingers
  const buildFinger = (
    mcpIdx: number,
    isExtended: boolean,
    xOffset: number
  ) => {
    const mcp = lms[mcpIdx];
    if (isExtended) {
      // Extended straight upward (negative y in screen coords)
      lms[mcpIdx + 1] = { x: mcp.x + xOffset * 0.2, y: mcp.y - 0.35 * s, z: 0 }; // PIP
      lms[mcpIdx + 2] = { x: mcp.x + xOffset * 0.4, y: mcp.y - 0.65 * s, z: 0 }; // DIP
      lms[mcpIdx + 3] = { x: mcp.x + xOffset * 0.5, y: mcp.y - 0.95 * s, z: 0 }; // TIP
    } else {
      // Curled into palm towards wrist
      lms[mcpIdx + 1] = { x: mcp.x, y: mcp.y - 0.25 * s, z: 0.1 * s }; // PIP
      lms[mcpIdx + 2] = { x: mcp.x, y: mcp.y + 0.05 * s, z: 0.15 * s }; // DIP (curled down)
      lms[mcpIdx + 3] = { x: mcp.x, y: mcp.y + 0.25 * s, z: 0.1 * s }; // TIP (near palm/wrist)
    }
  };

  buildFinger(5, options.indexState === 'extended', 0);
  buildFinger(9, options.middleState === 'extended', 0);
  buildFinger(13, options.ringState === 'extended', 0);
  buildFinger(17, options.pinkyState === 'extended', 0.1);

  // Thumb
  const thumbMcp = lms[2];
  if (options.thumbDirection === 'up') {
    // Points straight up (negative y)
    lms[3] = { x: thumbMcp.x - 0.1 * s, y: thumbMcp.y - 0.35 * s, z: 0 };
    lms[4] = { x: thumbMcp.x - 0.15 * s, y: thumbMcp.y - 0.7 * s, z: 0 };
  } else if (options.thumbDirection === 'down') {
    // Points straight down (positive y)
    lms[3] = { x: thumbMcp.x - 0.1 * s, y: thumbMcp.y + 0.35 * s, z: 0 };
    lms[4] = { x: thumbMcp.x - 0.15 * s, y: thumbMcp.y + 0.7 * s, z: 0 };
  } else if (options.thumbDirection === 'extended') {
    // Out to the side
    lms[3] = { x: thumbMcp.x - 0.4 * s, y: thumbMcp.y - 0.2 * s, z: 0 };
    lms[4] = { x: thumbMcp.x - 0.8 * s, y: thumbMcp.y - 0.3 * s, z: 0 };
  } else {
    // Curled over fist
    lms[3] = { x: thumbMcp.x + 0.2 * s, y: thumbMcp.y - 0.1 * s, z: 0.1 * s };
    lms[4] = { x: thumbMcp.x + 0.4 * s, y: thumbMcp.y, z: 0.15 * s };
  }

  return lms;
}

/**
 * Runner functions
 */
function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('\n--- Início da Bateria de Testes do Classificador de Libras ---\n');

  // ── TESTE 1: Normalização de Landmarks ────────────────────────────────────
  console.log('1. Testando normalização de landmarks:');
  const handA = createSyntheticHand({ scale: 0.15, wristPos: { x: 0.3, y: 0.4, z: 0.1 } });
  const normA = normalizeLandmarks(handA);
  assert(normA.landmarks[0].x === 0 && normA.landmarks[0].y === 0, 'Origem transladada para o pulso (0,0)');
  assert(Math.abs(euclideanDistance(normA.landmarks[0], normA.landmarks[9]) - 1.0) < 0.001, 'Escala da palma normalizada para 1.0');

  // Scale invariance
  const handB = createSyntheticHand({ scale: 0.30, wristPos: { x: 0.7, y: 0.2, z: -0.2 } });
  const normB = normalizeLandmarks(handB);
  const diffIndex = euclideanDistance(normA.landmarks[8], normB.landmarks[8]);
  assert(diffIndex < 0.05, 'Invariância de escala: coordenadas normalizadas coincidem independente do tamanho');

  // ── TESTE 2: Extração de Poses Anatômicas ─────────────────────────────────
  console.log('\n2. Testando extração de poses anatômicas:');

  // Thumbs Up
  const thumbsUpHand = createSyntheticHand({
    thumbDirection: 'up',
    indexState: 'curled',
    middleState: 'curled',
    ringState: 'curled',
    pinkyState: 'curled',
  });
  const poseThumbsUp = extractHandPoseFeatures(normalizeLandmarks(thumbsUpHand), thumbsUpHand);
  assert(poseThumbsUp.isThumbsUp === true, 'Detecção precisa de Thumbs Up (Polegar para cima)');
  assert(poseThumbsUp.isThumbsDown === false, 'Thumbs Up não é falso positivo para Thumbs Down');

  // Thumbs Down
  const thumbsDownHand = createSyntheticHand({
    thumbDirection: 'down',
    indexState: 'curled',
    middleState: 'curled',
    ringState: 'curled',
    pinkyState: 'curled',
  });
  const poseThumbsDown = extractHandPoseFeatures(normalizeLandmarks(thumbsDownHand), thumbsDownHand);
  assert(poseThumbsDown.isThumbsDown === true, 'Detecção precisa de Thumbs Down (Polegar para baixo)');

  // Open Hand
  const openHand = createSyntheticHand({
    thumbDirection: 'extended',
    indexState: 'extended',
    middleState: 'extended',
    ringState: 'extended',
    pinkyState: 'extended',
  });
  const poseOpen = extractHandPoseFeatures(normalizeLandmarks(openHand), openHand);
  assert(poseOpen.isOpenHand === true, 'Detecção de Mão Aberta (todos os dedos estendidos)');

  // Fist (Letra S)
  const fistHand = createSyntheticHand({
    thumbDirection: 'curled',
    indexState: 'curled',
    middleState: 'curled',
    ringState: 'curled',
    pinkyState: 'curled',
  });
  const poseFist = extractHandPoseFeatures(normalizeLandmarks(fistHand), fistHand);
  assert(poseFist.isFist === true, 'Detecção de Punho Fechado (Fist)');

  // Index Pointing (Letra D)
  const indexHand = createSyntheticHand({
    thumbDirection: 'curled',
    indexState: 'extended',
    middleState: 'curled',
    ringState: 'curled',
    pinkyState: 'curled',
  });
  const poseIndex = extractHandPoseFeatures(normalizeLandmarks(indexHand), indexHand);
  assert(poseIndex.isIndexPointing === true, 'Detecção de Indicador Estendido (Letra D)');

  // V Letter (Conversar)
  const vHand = createSyntheticHand({
    thumbDirection: 'curled',
    indexState: 'extended',
    middleState: 'extended',
    ringState: 'curled',
    pinkyState: 'curled',
  });
  const poseV = extractHandPoseFeatures(normalizeLandmarks(vHand), vHand);
  assert(poseV.isVLetter === true, 'Detecção de Dedos em V (Indicador e Médio estendidos)');

  // ── TESTE 3: Extração de Características Cinemáticas Temporais ────────────
  console.log('\n3. Testando extração de características cinemáticas temporais:');

  // Waving sequence (Horizontal oscillations)
  const wavingFrames: HandFrame[] = [];
  const baseHand = createSyntheticHand({ indexState: 'extended', middleState: 'extended', ringState: 'extended', pinkyState: 'extended' });
  const xOffsets = [0, 0.05, 0.1, 0.04, -0.05, -0.1, -0.04, 0.06, 0.1, 0.03, -0.06, -0.1];
  for (let i = 0; i < xOffsets.length; i++) {
    const moved = baseHand.map((lm) => ({ ...lm, x: lm.x + xOffsets[i] }));
    wavingFrames.push({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: moved, handedness: 'Right', score: 0.95 }],
    });
  }
  const motionWave = extractMotionFeatures(wavingFrames);
  assert(motionWave.isWavingHorizontal === true, 'Detecção de oscilação horizontal (aceno)');
  assert(motionWave.horizontalOscillations >= 2, 'Contagem correta de oscilações horizontais');

  // Nodding sequence (Vertical oscillations)
  const noddingFrames: HandFrame[] = [];
  const yOffsets = [0, 0.05, 0.09, 0.03, -0.04, 0.05, 0.09, 0.02, -0.03];
  for (let i = 0; i < yOffsets.length; i++) {
    const moved = baseHand.map((lm) => ({ ...lm, y: lm.y + yOffsets[i] }));
    noddingFrames.push({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: moved, handedness: 'Right', score: 0.95 }],
    });
  }
  const motionNod = extractMotionFeatures(noddingFrames);
  assert(motionNod.isNoddingVertical === true, 'Detecção de oscilação vertical (concordância / "Sim")');

  // Static sequence
  const staticFrames: HandFrame[] = [];
  for (let i = 0; i < 15; i++) {
    staticFrames.push({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: baseHand, handedness: 'Right', score: 0.95 }],
    });
  }
  const motionStatic = extractMotionFeatures(staticFrames);
  assert(motionStatic.isStatic === true, 'Detecção de sequência estática');

  // ── TESTE 4: Reconhecimento Integrado (LibrasRecognizer) ──────────────────
  console.log('\n4. Testando reconhecimento integrado pelo LibrasRecognizer:');

  const recognizer = new LibrasRecognizer();

  // Teste 4.1: "Estou bem"
  recognizer.reset();
  for (let i = 0; i < 15; i++) {
    recognizer.addFrame({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: thumbsUpHand, handedness: 'Right', score: 0.98 }],
    });
  }
  const resEstouBem = recognizer.classify();
  assert(resEstouBem.success === true, 'Reconhecimento bem-sucedido de "Estou bem"');
  assert(resEstouBem.prediction?.sign === 'ESTOU_BEM', 'Sinal identificado como ESTOU_BEM');
  assert(resEstouBem.confidence >= 0.70, `Confiança (${resEstouBem.confidence}) acima do threshold (>= 0.70)`);

  // Teste 4.2: "Não estou bem"
  recognizer.reset();
  for (let i = 0; i < 15; i++) {
    recognizer.addFrame({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: thumbsDownHand, handedness: 'Right', score: 0.98 }],
    });
  }
  const resNaoEstouBem = recognizer.classify();
  assert(resNaoEstouBem.success === true, 'Reconhecimento bem-sucedido de "Não estou bem"');
  assert(resNaoEstouBem.prediction?.sign === 'NAO_ESTOU_BEM', 'Sinal identificado como NAO_ESTOU_BEM');

  // Teste 4.3: "Olá" (Mão aberta acenando)
  recognizer.reset();
  for (let i = 0; i < wavingFrames.length; i++) {
    recognizer.addFrame(wavingFrames[i]);
  }
  const resOla = recognizer.classify();
  assert(resOla.success === true, 'Reconhecimento bem-sucedido de "Olá"');
  assert(resOla.prediction?.sign === 'OLA', 'Sinal identificado como OLA');

  // Teste 4.4: "Sim" (Punho fechado com movimento vertical)
  recognizer.reset();
  for (let i = 0; i < yOffsets.length; i++) {
    const moved = fistHand.map((lm) => ({ ...lm, y: lm.y + yOffsets[i] }));
    recognizer.addFrame({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: moved, handedness: 'Right', score: 0.95 }],
    });
  }
  const resSim = recognizer.classify();
  assert(resSim.success === true, 'Reconhecimento bem-sucedido de "Sim"');
  assert(resSim.prediction?.sign === 'SIM', 'Sinal identificado como SIM');

  // Teste 4.5: Rejeição de Gestos Ambíguos / Não Reconhecidos
  recognizer.reset();
  // Frame com landmarks dispersos / sem padrão de Libras
  const randomHand = createSyntheticHand({ scale: 0.15 });
  // Make random coordinates
  for (let i = 0; i < 21; i++) {
    randomHand[i] = { x: 0.5 + (i % 3) * 0.05, y: 0.5 + (i % 4) * 0.05, z: 0 };
  }
  for (let i = 0; i < 15; i++) {
    recognizer.addFrame({
      timestamp: 1000 + i * 40,
      hands: [{ landmarks: randomHand, handedness: 'Right', score: 0.8 }],
    });
  }
  const resRandom = recognizer.classify();
  assert(resRandom.success === false, 'Gesto sem padrão rejeitado com success = false');
  assert(resRandom.error === 'NOT_RECOGNIZED' || resRandom.error === 'LOW_CONFIDENCE', 'Erro estruturado reportado (NOT_RECOGNIZED/LOW_CONFIDENCE)');

  console.log(`\n--- Resultado Final: ${passed} passaram, ${failed} falharam ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
