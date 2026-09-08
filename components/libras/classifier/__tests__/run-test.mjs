/**
 * EchoMind Libras — Pure ESM Test Suite
 */

import { euclideanDistance, normalizeLandmarks } from '../normalization.ts';
import { extractHandPoseFeatures, extractMotionFeatures } from '../featureExtraction.ts';
import { LibrasRecognizer } from '../recognizer.ts';

function createSyntheticHand(options) {
  const wrist = options.wristPos || { x: 0.5, y: 0.5, z: 0 };
  const s = options.scale || 0.15;

  const lms = new Array(21).fill(null).map(() => ({ ...wrist }));
  lms[0] = { ...wrist };

  lms[1] = { x: wrist.x - 0.2 * s, y: wrist.y - 0.3 * s, z: 0 };
  lms[2] = { x: wrist.x - 0.4 * s, y: wrist.y - 0.5 * s, z: 0 };
  lms[5] = { x: wrist.x - 0.3 * s, y: wrist.y - 1.0 * s, z: 0 };
  lms[9] = { x: wrist.x, y: wrist.y - 1.0 * s, z: 0 };
  lms[13] = { x: wrist.x + 0.3 * s, y: wrist.y - 0.95 * s, z: 0 };
  lms[17] = { x: wrist.x + 0.5 * s, y: wrist.y - 0.85 * s, z: 0 };

  const buildFinger = (mcpIdx, isExtended, xOffset) => {
    const mcp = lms[mcpIdx];
    if (isExtended) {
      lms[mcpIdx + 1] = { x: mcp.x + xOffset * 0.2, y: mcp.y - 0.35 * s, z: 0 };
      lms[mcpIdx + 2] = { x: mcp.x + xOffset * 0.4, y: mcp.y - 0.65 * s, z: 0 };
      lms[mcpIdx + 3] = { x: mcp.x + xOffset * 0.5, y: mcp.y - 0.95 * s, z: 0 };
    } else {
      lms[mcpIdx + 1] = { x: mcp.x, y: mcp.y - 0.25 * s, z: 0.1 * s };
      lms[mcpIdx + 2] = { x: mcp.x, y: mcp.y + 0.05 * s, z: 0.15 * s };
      lms[mcpIdx + 3] = { x: mcp.x, y: mcp.y + 0.25 * s, z: 0.1 * s };
    }
  };

  buildFinger(5, options.indexState === 'extended', 0);
  buildFinger(9, options.middleState === 'extended', 0);
  buildFinger(13, options.ringState === 'extended', 0);
  buildFinger(17, options.pinkyState === 'extended', 0.1);

  const thumbMcp = lms[2];
  if (options.thumbDirection === 'up') {
    lms[3] = { x: thumbMcp.x - 0.1 * s, y: thumbMcp.y - 0.35 * s, z: 0 };
    lms[4] = { x: thumbMcp.x - 0.15 * s, y: thumbMcp.y - 0.7 * s, z: 0 };
  } else if (options.thumbDirection === 'down') {
    lms[3] = { x: thumbMcp.x - 0.1 * s, y: thumbMcp.y + 0.35 * s, z: 0 };
    lms[4] = { x: thumbMcp.x - 0.15 * s, y: thumbMcp.y + 0.7 * s, z: 0 };
  } else if (options.thumbDirection === 'extended') {
    lms[3] = { x: thumbMcp.x - 0.4 * s, y: thumbMcp.y - 0.2 * s, z: 0 };
    lms[4] = { x: thumbMcp.x - 0.8 * s, y: thumbMcp.y - 0.3 * s, z: 0 };
  } else {
    lms[3] = { x: thumbMcp.x + 0.2 * s, y: thumbMcp.y - 0.1 * s, z: 0.1 * s };
    lms[4] = { x: thumbMcp.x + 0.4 * s, y: thumbMcp.y, z: 0.15 * s };
  }

  return lms;
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('  EchoMind Libras — Test Suite de Reconhecimento');
console.log('======================================================\n');

// 1. Normalization
console.log('1. Testes de Normalização Espacial:');
const handA = createSyntheticHand({ scale: 0.15, wristPos: { x: 0.3, y: 0.4, z: 0.1 } });
const normA = normalizeLandmarks(handA);
assert(normA.landmarks[0].x === 0 && normA.landmarks[0].y === 0, 'Translação do pulso para origem (0,0,0)');
assert(Math.abs(euclideanDistance(normA.landmarks[0], normA.landmarks[9]) - 1.0) < 0.001, 'Escala da palma normalizada para 1.0');

const handB = createSyntheticHand({ scale: 0.35, wristPos: { x: 0.8, y: 0.1, z: -0.3 } });
const normB = normalizeLandmarks(handB);
const diffIndex = euclideanDistance(normA.landmarks[8], normB.landmarks[8]);
assert(diffIndex < 0.05, 'Invariância de escala e translação comprovada');

// 2. Anatomical Pose Features
console.log('\n2. Testes de Extração de Poses Anatômicas:');

const thumbsUpHand = createSyntheticHand({ thumbDirection: 'up', indexState: 'curled', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const poseThumbsUp = extractHandPoseFeatures(normalizeLandmarks(thumbsUpHand), thumbsUpHand);
assert(poseThumbsUp.isThumbsUp === true, 'Detecção precisa de Thumbs Up (Polegar para cima)');
assert(poseThumbsUp.isThumbsDown === false, 'Thumbs Up não gera falso positivo para Thumbs Down');

const thumbsDownHand = createSyntheticHand({ thumbDirection: 'down', indexState: 'curled', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const poseThumbsDown = extractHandPoseFeatures(normalizeLandmarks(thumbsDownHand), thumbsDownHand);
assert(poseThumbsDown.isThumbsDown === true, 'Detecção precisa de Thumbs Down (Polegar para baixo)');

const openHand = createSyntheticHand({ thumbDirection: 'extended', indexState: 'extended', middleState: 'extended', ringState: 'extended', pinkyState: 'extended' });
const poseOpen = extractHandPoseFeatures(normalizeLandmarks(openHand), openHand);
assert(poseOpen.isOpenHand === true, 'Detecção de Mão Aberta');

const fistHand = createSyntheticHand({ thumbDirection: 'curled', indexState: 'curled', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const poseFist = extractHandPoseFeatures(normalizeLandmarks(fistHand), fistHand);
assert(poseFist.isFist === true, 'Detecção de Punho Fechado (Letra S)');

const indexHand = createSyntheticHand({ thumbDirection: 'curled', indexState: 'extended', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const poseIndex = extractHandPoseFeatures(normalizeLandmarks(indexHand), indexHand);
assert(poseIndex.isIndexPointing === true, 'Detecção de Indicador Estendido (Letra D)');

const vHand = createSyntheticHand({ thumbDirection: 'curled', indexState: 'extended', middleState: 'extended', ringState: 'curled', pinkyState: 'curled' });
const poseV = extractHandPoseFeatures(normalizeLandmarks(vHand), vHand);
assert(poseV.isVLetter === true, 'Detecção de Dedos em V (Conversar)');

// 3. Motion Trajectories
console.log('\n3. Testes de Extração Cinemática Temporal:');

const wavingFrames = [];
const xOffsets = [0, 0.05, 0.1, 0.04, -0.05, -0.1, -0.04, 0.06, 0.1, 0.03, -0.06, -0.1];
for (let i = 0; i < xOffsets.length; i++) {
  const moved = openHand.map((lm) => ({ ...lm, x: lm.x + xOffsets[i] }));
  wavingFrames.push({
    timestamp: 1000 + i * 40,
    hands: [{ landmarks: moved, handedness: 'Right', score: 0.95 }],
  });
}
const motionWave = extractMotionFeatures(wavingFrames);
assert(motionWave.isWavingHorizontal === true, 'Detecção de oscilação lateral de aceno');
assert(motionWave.horizontalOscillations >= 2, 'Contagem de oscilações horizontais >= 2');

const noddingFrames = [];
const yOffsets = [0, 0.05, 0.09, 0.03, -0.04, 0.05, 0.09, 0.02, -0.03];
for (let i = 0; i < yOffsets.length; i++) {
  const moved = fistHand.map((lm) => ({ ...lm, y: lm.y + yOffsets[i] }));
  noddingFrames.push({
    timestamp: 1000 + i * 40,
    hands: [{ landmarks: moved, handedness: 'Right', score: 0.95 }],
  });
}
const motionNod = extractMotionFeatures(noddingFrames);
assert(motionNod.isNoddingVertical === true, 'Detecção de oscilação vertical de concordância');

const staticFrames = [];
for (let i = 0; i < 15; i++) {
  staticFrames.push({
    timestamp: 1000 + i * 40,
    hands: [{ landmarks: thumbsUpHand, handedness: 'Right', score: 0.95 }],
  });
}
const motionStatic = extractMotionFeatures(staticFrames);
assert(motionStatic.isStatic === true, 'Detecção de sequência estática');

// 4. Integrated Recognition
console.log('\n4. Testes de Classificação Integrada:');
const recognizer = new LibrasRecognizer();

// 4.1 "Estou bem"
recognizer.reset();
for (let i = 0; i < 15; i++) {
  recognizer.addFrame({
    timestamp: 1000 + i * 40,
    hands: [{ landmarks: thumbsUpHand, handedness: 'Right', score: 0.98 }],
  });
}
const resEstouBem = recognizer.classify();
assert(resEstouBem.success === true, 'Reconhecimento de "Estou bem" com sucesso');
assert(resEstouBem.prediction?.sign === 'ESTOU_BEM', 'Sinal classificado como ESTOU_BEM');
assert(resEstouBem.confidence >= 0.70, `Confiança (${resEstouBem.confidence}) >= 0.70`);

// 4.2 "Não estou bem"
recognizer.reset();
for (let i = 0; i < 15; i++) {
  recognizer.addFrame({
    timestamp: 1000 + i * 40,
    hands: [{ landmarks: thumbsDownHand, handedness: 'Right', score: 0.98 }],
  });
}
const resNaoEstouBem = recognizer.classify();
assert(resNaoEstouBem.success === true, 'Reconhecimento de "Não estou bem" com sucesso');
assert(resNaoEstouBem.prediction?.sign === 'NAO_ESTOU_BEM', 'Sinal classificado como NAO_ESTOU_BEM');

// 4.3 "Olá"
recognizer.reset();
for (let i = 0; i < wavingFrames.length; i++) {
  recognizer.addFrame(wavingFrames[i]);
}
const resOla = recognizer.classify();
assert(resOla.success === true, 'Reconhecimento de "Olá" com sucesso');
assert(resOla.prediction?.sign === 'OLA', 'Sinal classificado como OLA');

// 4.4 "Sim"
recognizer.reset();
for (let i = 0; i < noddingFrames.length; i++) {
  recognizer.addFrame(noddingFrames[i]);
}
const resSim = recognizer.classify();
assert(resSim.success === true, 'Reconhecimento de "Sim" com sucesso');
assert(resSim.prediction?.sign === 'SIM', 'Sinal classificado como SIM');

// 4.5 Rejeição de Gestos Ambíguos
recognizer.reset();
const randomHand = createSyntheticHand({ scale: 0.15 });
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
assert(resRandom.error === 'NOT_RECOGNIZED' || resRandom.error === 'LOW_CONFIDENCE', 'Erro reportado com precisão sem inventar sinal');

console.log(`\n======================================================`);
console.log(`  Resultado Final: ${passed} passaram, ${failed} falharam`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
