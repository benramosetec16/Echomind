/**
 * EchoMind Libras — Comprehensive Standalone Automated Verification Test
 * Tests normalization, feature extraction, kinematics, and recognition rules.
 */

// ── 1. Normalization ──────────────────────────────────────────────────────────

function euclideanDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalizeLandmarks(rawLandmarks, handedness) {
  const wrist = rawLandmarks[0];
  const middleMcp = rawLandmarks[9];

  let palmScale = euclideanDistance(wrist, middleMcp);
  if (palmScale < 0.001) palmScale = euclideanDistance(wrist, rawLandmarks[5]);
  if (palmScale < 0.001) palmScale = 1.0;

  const normalizedLandmarks = rawLandmarks.map((lm) => ({
    x: (lm.x - wrist.x) / palmScale,
    y: (lm.y - wrist.y) / palmScale,
    z: (lm.z - wrist.z) / palmScale,
  }));

  return { landmarks: normalizedLandmarks, handedness, palmScale, wrist: { ...wrist } };
}

// ── 2. Feature Extraction ─────────────────────────────────────────────────────

const FINGER_INDICES = {
  thumb: { mcp: 2, pip: 3, dip: 3, tip: 4 },
  index: { mcp: 5, pip: 6, dip: 7, tip: 8 },
  middle: { mcp: 9, pip: 10, dip: 11, tip: 12 },
  ring: { mcp: 13, pip: 14, dip: 15, tip: 16 },
  pinky: { mcp: 17, pip: 18, dip: 19, tip: 20 },
};

function extractHandPoseFeatures(normalized, rawLandmarks) {
  const nLm = normalized.landmarks;
  const origin = { x: 0, y: 0, z: 0 };
  const fingers = {};

  const mainFingers = ['index', 'middle', 'ring', 'pinky'];
  for (const finger of mainFingers) {
    const idx = FINGER_INDICES[finger];
    const mcp = nLm[idx.mcp];
    const pip = nLm[idx.pip];
    const tip = nLm[idx.tip];

    const tipDistanceToWrist = euclideanDistance(tip, origin);
    const pipDistanceToWrist = euclideanDistance(pip, origin);
    const tipToMcpDistance = euclideanDistance(tip, mcp);
    const pipToMcpDistance = euclideanDistance(pip, mcp);

    const isExtended =
      tipDistanceToWrist > pipDistanceToWrist * 1.12 &&
      tipToMcpDistance > pipToMcpDistance * 1.05;

    const isCurled =
      tipDistanceToWrist < pipDistanceToWrist * 0.96 ||
      tipToMcpDistance < pipToMcpDistance * 0.85;

    const dirLen = tipToMcpDistance || 1;
    fingers[finger] = {
      isExtended,
      isCurled,
      curlRatio: tipDistanceToWrist / (pipDistanceToWrist + 0.0001),
      tipDistanceToWrist,
      tipToMcpDistance,
      direction: {
        x: (tip.x - mcp.x) / dirLen,
        y: (tip.y - mcp.y) / dirLen,
        z: (tip.z - mcp.z) / dirLen,
      },
    };
  }

  const thumbMcp = nLm[2];
  const thumbTip = nLm[4];
  const pinkyMcp = nLm[17];
  const indexMcp = nLm[5];

  const thumbTipDistWrist = euclideanDistance(thumbTip, origin);
  const thumbMcpDistWrist = euclideanDistance(thumbMcp, origin);
  const thumbTipDistPinky = euclideanDistance(thumbTip, pinkyMcp);
  const thumbTipDistIndex = euclideanDistance(thumbTip, indexMcp);

  const thumbDeltaY = thumbTip.y - thumbMcp.y;
  const thumbDeltaX = thumbTip.x - thumbMcp.x;
  const thumbLen = euclideanDistance(thumbTip, thumbMcp) || 1;

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

  const otherFingersCurled =
    fingers.index.isCurled &&
    fingers.middle.isCurled &&
    fingers.ring.isCurled &&
    fingers.pinky.isCurled;

  const isThumbsUp =
    otherFingersCurled &&
    thumbDeltaY < -0.32 &&
    thumbLen > 0.4 &&
    thumbTipDistPinky > 0.7 &&
    Math.abs(thumbDeltaX) < Math.abs(thumbDeltaY) * 1.5;

  const isThumbsDown =
    otherFingersCurled &&
    thumbDeltaY > 0.32 &&
    thumbLen > 0.4 &&
    thumbTipDistPinky > 0.7 &&
    Math.abs(thumbDeltaX) < Math.abs(thumbDeltaY) * 1.5;

  const isFist = otherFingersCurled && !isThumbsUp && !isThumbsDown;

  const isOpenHand =
    fingers.index.isExtended &&
    fingers.middle.isExtended &&
    fingers.ring.isExtended &&
    fingers.pinky.isExtended;

  const isIndexPointing =
    fingers.index.isExtended &&
    fingers.middle.isCurled &&
    fingers.ring.isCurled &&
    fingers.pinky.isCurled;

  const indexMiddleDist = euclideanDistance(nLm[8], nLm[12]);
  const isVLetter =
    fingers.index.isExtended &&
    fingers.middle.isExtended &&
    fingers.ring.isCurled &&
    fingers.pinky.isCurled &&
    indexMiddleDist > 0.25;

  const isIPinky =
    fingers.pinky.isExtended &&
    fingers.index.isCurled &&
    fingers.middle.isCurled &&
    fingers.ring.isCurled;

  return {
    fingers,
    isThumbsUp,
    isThumbsDown,
    isFist,
    isOpenHand,
    isIndexPointing,
    isVLetter,
    isIPinky,
  };
}

function extractMotionFeatures(frames) {
  const validFrames = [];
  for (const f of frames) {
    if (f.hands && f.hands.length > 0 && f.hands[0].landmarks.length >= 21) {
      validFrames.push({ t: f.timestamp, hand: f.hands[0] });
    }
  }

  if (validFrames.length < 3) {
    return {
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
  }

  const firstWrist = validFrames[0].hand.landmarks[0];
  const lastWrist = validFrames[validFrames.length - 1].hand.landmarks[0];

  const displacement = {
    x: lastWrist.x - firstWrist.x,
    y: lastWrist.y - firstWrist.y,
    z: (lastWrist.z ?? 0) - (firstWrist.z ?? 0),
  };

  let totalDistance = 0;
  const vxSeries = [];
  const vySeries = [];

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

  const countOscillations = (velocities, minAmp) => {
    let count = 0;
    let prevSign = 0;
    for (const v of velocities) {
      if (Math.abs(v) > minAmp) {
        const sign = v > 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) count++;
        prevSign = sign;
      }
    }
    return count;
  };

  const horizontalOscillations = countOscillations(vxSeries, 0.08);
  const verticalOscillations = countOscillations(vySeries, 0.08);

  const isWavingHorizontal = horizontalOscillations >= 2 && spanX > 0.07;
  const isNoddingVertical = verticalOscillations >= 2 && spanY > 0.05;
  const isForwardStroke =
    spanY > 0.08 &&
    displacement.y > 0.04 &&
    verticalOscillations <= 1 &&
    horizontalOscillations <= 1;
  const isStatic = totalDistance < 0.25 && !isWavingHorizontal && !isNoddingVertical;

  return {
    displacement,
    totalDistance,
    horizontalOscillations,
    verticalOscillations,
    isWavingHorizontal,
    isNoddingVertical,
    isForwardStroke,
    isStatic,
  };
}

// ── 3. Classifier ─────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.70;

const LIBRAS_POC_SIGNS = {
  OLA: { label: 'Olá', text: 'Olá! Tudo bem?' },
  SIM: { label: 'Sim', text: 'Sim, concordo.' },
  NAO: { label: 'Não', text: 'Não.' },
  OBRIGADO: { label: 'Obrigado', text: 'Obrigado.' },
  AJUDA: { label: 'Ajuda', text: 'Preciso de ajuda.' },
  ESTOU_BEM: { label: 'Estou bem', text: 'Estou me sentindo bem.' },
  NAO_ESTOU_BEM: { label: 'Não estou bem', text: 'Não estou me sentindo bem.' },
  PRECISO_CONVERSAR: { label: 'Preciso conversar', text: 'Preciso conversar com alguém.' },
};

function evaluateSignMatch(pose, motion, hasTwoHands) {
  const scores = [];

  if (pose.isThumbsUp) {
    const motionScore = motion.isStatic || motion.isNoddingVertical ? 0.95 : motion.isWavingHorizontal ? 0.4 : 0.8;
    const conf = Number((0.85 * 1.0 + 0.15 * motionScore).toFixed(2));
    scores.push({ sign: 'ESTOU_BEM', confidence: conf, reason: 'Polegar para cima' });
  }

  if (pose.isThumbsDown) {
    const motionScore = motion.isStatic || motion.displacement.y > 0 ? 0.95 : motion.isWavingHorizontal ? 0.4 : 0.8;
    const conf = Number((0.85 * 1.0 + 0.15 * motionScore).toFixed(2));
    scores.push({ sign: 'NAO_ESTOU_BEM', confidence: conf, reason: 'Polegar para baixo' });
  }

  if (pose.isOpenHand || pose.isIPinky) {
    const poseScore = pose.isOpenHand ? 1.0 : 0.85;
    const motionScore = motion.isWavingHorizontal ? 1.0 : motion.horizontalOscillations >= 1 ? 0.75 : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isWavingHorizontal || motion.horizontalOscillations >= 1)) {
      scores.push({ sign: 'OLA', confidence: conf, reason: 'Mão aberta com aceno' });
    }
  }

  if (pose.isFist) {
    const poseScore = 1.0;
    const motionScore = motion.isNoddingVertical ? 1.0 : motion.verticalOscillations >= 1 ? 0.75 : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isNoddingVertical || motion.verticalOscillations >= 1)) {
      scores.push({ sign: 'SIM', confidence: conf, reason: 'Punho com concordância vertical' });
    }
  }

  if (pose.isIndexPointing || (pose.isOpenHand && motion.isWavingHorizontal)) {
    const poseScore = pose.isIndexPointing ? 1.0 : 0.75;
    const motionScore = motion.isWavingHorizontal ? 1.0 : motion.horizontalOscillations >= 1 ? 0.75 : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isWavingHorizontal || motion.horizontalOscillations >= 1)) {
      scores.push({ sign: 'NAO', confidence: conf, reason: 'Indicador com negação lateral' });
    }
  }

  if (pose.isOpenHand && !motion.isWavingHorizontal && !motion.isNoddingVertical) {
    const poseScore = 1.0;
    const motionScore = motion.isForwardStroke ? 1.0 : motion.displacement.y > 0.03 ? 0.75 : 0.1;
    const conf = Number((0.45 * poseScore + 0.55 * motionScore).toFixed(2));
    if (conf >= 0.5 && (motion.isForwardStroke || motion.displacement.y > 0.03)) {
      scores.push({ sign: 'OBRIGADO', confidence: conf, reason: 'Mão aberta com avanço frontal' });
    }
  }

  if (hasTwoHands) {
    const motionScore = motion.displacement.y > 0.02 || motion.isForwardStroke ? 0.9 : 0.75;
    const conf = Number((0.85 * 0.5 + motionScore * 0.5).toFixed(2));
    scores.push({ sign: 'AJUDA', confidence: conf, reason: 'Duas mãos de apoio' });
  }

  if (pose.isVLetter) {
    const poseScore = 1.0;
    const motionScore =
      motion.isStatic || motion.displacement.y > 0 || motion.horizontalOscillations >= 1
        ? 0.85
        : 0.6;
    const conf = Number((0.65 * poseScore + 0.35 * motionScore).toFixed(2));
    if (conf >= 0.5) scores.push({ sign: 'PRECISO_CONVERSAR', confidence: conf, reason: 'Dedos em V' });
  }

  scores.sort((a, b) => b.confidence - a.confidence);
  return scores;
}

class TestRecognizer {
  constructor() {
    this.buffer = [];
  }
  reset() {
    this.buffer = [];
  }
  addFrame(f) {
    this.buffer.push(f);
  }
  classify() {
    const framesWithHands = this.buffer.filter((f) => f.hands && f.hands.length > 0);
    if (framesWithHands.length < 3) return { success: false, error: 'NO_HANDS', confidence: 0 };

    const motion = extractMotionFeatures(framesWithHands);
    const rep = framesWithHands[Math.floor(framesWithHands.length / 2)].hands[0];
    const norm = normalizeLandmarks(rep.landmarks, rep.handedness);
    const pose = extractHandPoseFeatures(norm, rep.landmarks);
    const hasTwoHands = framesWithHands.filter((f) => f.hands.length >= 2).length / framesWithHands.length > 0.3;

    const matches = evaluateSignMatch(pose, motion, hasTwoHands);
    if (matches.length === 0) return { success: false, error: 'NOT_RECOGNIZED', confidence: 0 };

    const best = matches[0];
    if (best.confidence >= CONFIDENCE_THRESHOLD) {
      return {
        success: true,
        prediction: {
          sign: best.sign,
          label: LIBRAS_POC_SIGNS[best.sign].label,
          text: LIBRAS_POC_SIGNS[best.sign].text,
          confidence: best.confidence,
        },
        confidence: best.confidence,
      };
    }
    return { success: false, error: 'LOW_CONFIDENCE', confidence: best.confidence };
  }
}

// ── 4. Test Suite Execution ───────────────────────────────────────────────────

function createSyntheticHand(options) {
  const wrist = options.wristPos || { x: 0.5, y: 0.5, z: 0 };
  const wz = wrist.z || 0;
  const s = options.scale || 0.15;
  const lms = new Array(21).fill(null).map(() => ({ ...wrist }));
  lms[0] = { ...wrist };

  lms[1] = { x: wrist.x - 0.2 * s, y: wrist.y - 0.3 * s, z: wz };
  lms[2] = { x: wrist.x - 0.4 * s, y: wrist.y - 0.5 * s, z: wz };
  lms[5] = { x: wrist.x - 0.3 * s, y: wrist.y - 1.0 * s, z: wz };
  lms[9] = { x: wrist.x, y: wrist.y - 1.0 * s, z: wz };
  lms[13] = { x: wrist.x + 0.3 * s, y: wrist.y - 0.95 * s, z: wz };
  lms[17] = { x: wrist.x + 0.5 * s, y: wrist.y - 0.85 * s, z: wz };

  const buildFinger = (mcpIdx, isExtended, xOffset) => {
    const mcp = lms[mcpIdx];
    if (isExtended) {
      lms[mcpIdx + 1] = { x: mcp.x + xOffset * 0.2, y: mcp.y - 0.35 * s, z: wz };
      lms[mcpIdx + 2] = { x: mcp.x + xOffset * 0.4, y: mcp.y - 0.65 * s, z: wz };
      lms[mcpIdx + 3] = { x: mcp.x + xOffset * 0.5, y: mcp.y - 0.95 * s, z: wz };
    } else {
      lms[mcpIdx + 1] = { x: mcp.x, y: mcp.y - 0.25 * s, z: wz + 0.1 * s };
      lms[mcpIdx + 2] = { x: mcp.x, y: mcp.y + 0.05 * s, z: wz + 0.15 * s };
      lms[mcpIdx + 3] = { x: mcp.x, y: mcp.y + 0.25 * s, z: wz + 0.1 * s };
    }
  };

  buildFinger(5, options.indexState === 'extended', 0);
  buildFinger(9, options.middleState === 'extended', 0);
  buildFinger(13, options.ringState === 'extended', 0);
  buildFinger(17, options.pinkyState === 'extended', 0.1);

  const thumbMcp = lms[2];
  if (options.thumbDirection === 'up') {
    lms[3] = { x: thumbMcp.x - 0.1 * s, y: thumbMcp.y - 0.35 * s, z: wz };
    lms[4] = { x: thumbMcp.x - 0.15 * s, y: thumbMcp.y - 0.7 * s, z: wz };
  } else if (options.thumbDirection === 'down') {
    lms[3] = { x: thumbMcp.x - 0.1 * s, y: thumbMcp.y + 0.35 * s, z: wz };
    lms[4] = { x: thumbMcp.x - 0.15 * s, y: thumbMcp.y + 0.7 * s, z: wz };
  } else if (options.thumbDirection === 'extended') {
    lms[3] = { x: thumbMcp.x - 0.4 * s, y: thumbMcp.y - 0.2 * s, z: wz };
    lms[4] = { x: thumbMcp.x - 0.8 * s, y: thumbMcp.y - 0.3 * s, z: wz };
  } else {
    lms[3] = { x: thumbMcp.x + 0.2 * s, y: thumbMcp.y - 0.1 * s, z: wz + 0.1 * s };
    lms[4] = { x: thumbMcp.x + 0.4 * s, y: thumbMcp.y, z: wz + 0.15 * s };
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
console.log('  EchoMind Libras — Test Suite Automatizado Completo');
console.log('======================================================\n');

// 1. Normalization
console.log('1. Normalização Geométrica:');
const handA = createSyntheticHand({ scale: 0.15, wristPos: { x: 0.3, y: 0.4, z: 0.1 } });
const normA = normalizeLandmarks(handA);
assert(normA.landmarks[0].x === 0 && normA.landmarks[0].y === 0, 'Pulso na origem (0,0)');
assert(Math.abs(euclideanDistance(normA.landmarks[0], normA.landmarks[9]) - 1.0) < 0.001, 'Distância da palma normalizada = 1.0');

const handB = createSyntheticHand({ scale: 0.45, wristPos: { x: 0.8, y: 0.2, z: -0.5 } });
const normB = normalizeLandmarks(handB);
assert(euclideanDistance(normA.landmarks[8], normB.landmarks[8]) < 0.001, 'Invariância de escala e translação 3D comprovada');

// 2. Anatomical Poses
console.log('\n2. Poses Anatômicas:');
const thumbsUpHand = createSyntheticHand({ thumbDirection: 'up', indexState: 'curled', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const pThumbsUp = extractHandPoseFeatures(normalizeLandmarks(thumbsUpHand), thumbsUpHand);
assert(pThumbsUp.isThumbsUp === true, 'Polegar para cima (Thumbs Up)');

const thumbsDownHand = createSyntheticHand({ thumbDirection: 'down', indexState: 'curled', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const pThumbsDown = extractHandPoseFeatures(normalizeLandmarks(thumbsDownHand), thumbsDownHand);
assert(pThumbsDown.isThumbsDown === true, 'Polegar para baixo (Thumbs Down)');

const openHand = createSyntheticHand({ thumbDirection: 'extended', indexState: 'extended', middleState: 'extended', ringState: 'extended', pinkyState: 'extended' });
const pOpen = extractHandPoseFeatures(normalizeLandmarks(openHand), openHand);
assert(pOpen.isOpenHand === true, 'Mão aberta');

const fistHand = createSyntheticHand({ thumbDirection: 'curled', indexState: 'curled', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const pFist = extractHandPoseFeatures(normalizeLandmarks(fistHand), fistHand);
assert(pFist.isFist === true, 'Punho fechado (Letra S)');

const indexHand = createSyntheticHand({ thumbDirection: 'curled', indexState: 'extended', middleState: 'curled', ringState: 'curled', pinkyState: 'curled' });
const pIndex = extractHandPoseFeatures(normalizeLandmarks(indexHand), indexHand);
assert(pIndex.isIndexPointing === true, 'Indicador estendido (Letra D)');

const vHand = createSyntheticHand({ thumbDirection: 'curled', indexState: 'extended', middleState: 'extended', ringState: 'curled', pinkyState: 'curled' });
const pV = extractHandPoseFeatures(normalizeLandmarks(vHand), vHand);
assert(pV.isVLetter === true, 'Dedos em V (Conversar)');

// 3. Motion
console.log('\n3. Movimento Temporal:');
const wavingFrames = [];
const xOffsets = [0, 0.05, 0.1, 0.04, -0.05, -0.1, -0.04, 0.06, 0.1, 0.03, -0.06, -0.1];
for (let i = 0; i < xOffsets.length; i++) {
  const moved = openHand.map((lm) => ({ ...lm, x: lm.x + xOffsets[i] }));
  wavingFrames.push({ timestamp: 1000 + i * 40, hands: [{ landmarks: moved }] });
}
const mWave = extractMotionFeatures(wavingFrames);
assert(mWave.isWavingHorizontal === true, 'Oscilação horizontal (aceno)');

const noddingFrames = [];
const yOffsets = [0, 0.05, 0.09, 0.03, -0.04, 0.05, 0.09, 0.02, -0.03];
for (let i = 0; i < yOffsets.length; i++) {
  const moved = fistHand.map((lm) => ({ ...lm, y: lm.y + yOffsets[i] }));
  noddingFrames.push({ timestamp: 1000 + i * 40, hands: [{ landmarks: moved }] });
}
const mNod = extractMotionFeatures(noddingFrames);
assert(mNod.isNoddingVertical === true, 'Oscilação vertical (concordância)');

// 4. Integrated Classifier
console.log('\n4. Reconhecimento Integrado:');
const rec = new TestRecognizer();

// 4.1 Estou bem
for (let i = 0; i < 15; i++) rec.addFrame({ timestamp: 1000 + i * 40, hands: [{ landmarks: thumbsUpHand }] });
const rEstouBem = rec.classify();
assert(rEstouBem.success === true && rEstouBem.prediction.sign === 'ESTOU_BEM', 'Reconhecimento: "Estou bem"');
assert(rEstouBem.confidence >= 0.70, `Confiança (${rEstouBem.confidence}) >= 0.70`);

// 4.2 Não estou bem
rec.reset();
for (let i = 0; i < 15; i++) rec.addFrame({ timestamp: 1000 + i * 40, hands: [{ landmarks: thumbsDownHand }] });
const rNaoEstouBem = rec.classify();
assert(rNaoEstouBem.success === true && rNaoEstouBem.prediction.sign === 'NAO_ESTOU_BEM', 'Reconhecimento: "Não estou bem"');

// 4.3 Olá
rec.reset();
for (const f of wavingFrames) rec.addFrame(f);
const rOla = rec.classify();
assert(rOla.success === true && rOla.prediction.sign === 'OLA', 'Reconhecimento: "Olá"');

// 4.4 Sim
rec.reset();
for (const f of noddingFrames) rec.addFrame(f);
const rSim = rec.classify();
assert(rSim.success === true && rSim.prediction.sign === 'SIM', 'Reconhecimento: "Sim"');

// 4.5 Rejeição de Gesto Neutro / Estático sem Sinal
rec.reset();
// Mão neutra estática (nem punho, nem polegar, nem aceno)
const neutralHand = createSyntheticHand({ thumbDirection: 'extended', indexState: 'extended', middleState: 'curled', ringState: 'curled', pinkyState: 'extended' });
for (let i = 0; i < 15; i++) rec.addFrame({ timestamp: 1000 + i * 40, hands: [{ landmarks: neutralHand }] });
const rNeutral = rec.classify();
assert(rNeutral.success === false, 'Gesto sem correspondência rejeitado (success = false)');
assert(rNeutral.error === 'NOT_RECOGNIZED' || rNeutral.error === 'LOW_CONFIDENCE', 'Erro estruturado retornado sem inventar sinal');

console.log(`\n======================================================`);
console.log(`  Resultado: ${passed} PASSOU, ${failed} FALHOU`);
console.log(`======================================================\n`);

if (failed > 0) process.exit(1);
