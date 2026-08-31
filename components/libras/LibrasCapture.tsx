'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LibrasHandTracker from './LibrasHandTracker';
import LibrasConfirmation from './LibrasConfirmation';
import LibrasError, { LibrasErrorType } from './LibrasError';

type CaptureState =
  | 'idle'
  | 'requesting_permission'
  | 'ready'
  | 'recording'
  | 'recognizing'
  | 'confirmed'
  | 'error';

interface LibrasCaptureProps {
  onConfirm: (text: string) => void;
  onClose: () => void;
}

export default function LibrasCapture({ onConfirm, onClose }: LibrasCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle');
  const [errorType, setErrorType] = useState<LibrasErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [recognizedConfidence, setRecognizedConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [hasHands, setHasHands] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarksRef = useRef<any[][] | null>(null);
  const isRecordingRef = useRef(false);
  const sequenceRef = useRef<any[]>([]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const requestCamera = useCallback(async () => {
    setState('requesting_permission');
    setErrorType(null);
    setErrorMessage(undefined);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupportedError');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      if (!stream.active || stream.getVideoTracks().length === 0) {
        throw new Error('NotReadableError');
      }

      streamRef.current = stream;
      setState('ready');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        setErrorType('permission_denied');
      } else {
        setErrorType('camera_unavailable');
      }
      setState('error');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Callback ref to attach stream as soon as the <video> element mounts
  const handleVideoMount = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node; // Keep ref updated for LibrasHandTracker
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
    }
  }, []);

  const handleLandmarksUpdate = useCallback((landmarks: any[][] | null) => {
    landmarksRef.current = landmarks;
    setHasHands(landmarks !== null && landmarks.length > 0);
    
    if (isRecordingRef.current && landmarks && landmarks.length > 0) {
      const rounded = landmarks.map(hand => 
        hand.map(point => ({
          x: Number(point.x.toFixed(3)),
          y: Number(point.y.toFixed(3)),
          z: Number(point.z.toFixed(3))
        }))
      );
      if (sequenceRef.current.length < 150) {
        sequenceRef.current.push(rounded);
      }
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth || 640;
    captureCanvas.height = video.videoHeight || 480;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return null;
    // Mirror the frame to match what user sees
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    return captureCanvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const handleStartRecording = useCallback(() => {
    // Start recording regardless of hand detection — user will position hands during recording
    sequenceRef.current = [];
    isRecordingRef.current = true;
    setState('recording');
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    const imageBase64 = captureFrame();
    const fullSequence = sequenceRef.current;
    
    // Downsample sequence to max 10 frames to avoid token limits in the backend LLM
    const landmarksSequence = [];
    if (fullSequence.length > 0) {
      const step = Math.max(1, Math.floor(fullSequence.length / 10));
      for (let i = 0; i < fullSequence.length; i += step) {
        if (landmarksSequence.length < 10) {
          landmarksSequence.push(fullSequence[i]);
        }
      }
    }

    setState('recognizing');
    stopCamera();

    try {
      const res = await fetch('/api/libras-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, landmarks: landmarksSequence }),
      });

      const data = await res.json();

      if (data.error && !data.recognized) {
        setErrorType('processing_error');
        setErrorMessage(data.error);
        setState('error');
        return;
      }

      if (!data.recognized || !data.text) {
        setErrorType(data.confidence === 'low' ? 'low_confidence' : 'not_recognized');
        setState('error');
        return;
      }

      setRecognizedText(data.text);
      setRecognizedConfidence(data.confidence);
      setState('confirmed');
    } catch {
      setErrorType('processing_error');
      setState('error');
    }
  }, [captureFrame, stopCamera]);

  const handleRetry = useCallback(() => {
    setRecognizedText(null);
    setRecognizedConfidence(null);
    setErrorType(null);
    setErrorMessage(undefined);
    landmarksRef.current = null;
    setHasHands(false);
    requestCamera();
  }, [requestCamera]);

  const handleConfirm = useCallback(
    (text: string) => {
      stopCamera();
      onConfirm(text);
    },
    [stopCamera, onConfirm]
  );

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const isVideoActive = state === 'ready' || state === 'recording';

  return (
    // Overlay backdrop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-lg"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-xl bg-surface-container-low/90 backdrop-blur-2xl border border-white/8 rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-lg">sign_language</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Libras</h2>
              <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant opacity-40">
                Reconhecimento experimental
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant opacity-40 hover:opacity-80 hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[360px] flex flex-col">
          <AnimatePresence mode="wait">

            {/* IDLE — prompt to start */}
            {state === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-8 p-8 flex-1"
              >
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-secondary/5 border border-secondary/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-4xl">videocam</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-on-surface">Responder com Libras</h3>
                    <p className="text-sm text-on-surface-variant opacity-60 leading-relaxed">
                      A camera sera ativada para capturar o seu sinal. O reconhecimento e experimental — voce sempre confirmara o resultado antes do envio.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-tertiary/5 border border-tertiary/15 rounded-xl px-4 py-3 text-left">
                    <span className="material-symbols-outlined text-tertiary text-sm mt-0.5 shrink-0">info</span>
                    <p className="text-[11px] text-on-surface-variant opacity-60 leading-relaxed">
                      Nenhuma imagem e armazenada. Os frames sao descartados apos o reconhecimento.
                    </p>
                  </div>
                </div>
                <button
                  onClick={requestCamera}
                  className="flex items-center gap-2 px-8 py-3.5 border border-secondary/30 rounded-full text-xs font-semibold uppercase tracking-[0.2em] text-secondary hover:border-secondary hover:shadow-[0_0_25px_rgba(159,207,213,0.2)] transition-all"
                >
                  <span className="material-symbols-outlined text-base">videocam</span>
                  Ativar camera
                </button>
              </motion.div>
            )}

            {/* REQUESTING PERMISSION */}
            {state === 'requesting_permission' && (
              <motion.div
                key="requesting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 p-8 flex-1"
              >
                <div className="w-12 h-12 rounded-full border border-secondary/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-2xl animate-pulse">videocam</span>
                </div>
                <p className="text-sm text-on-surface-variant opacity-60 text-center">
                  Solicitando acesso a camera...
                </p>
              </motion.div>
            )}

            {/* READY / RECORDING — camera feed */}
            {(state === 'ready' || state === 'recording') && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col flex-1"
              >
                {/* Camera area */}
                <div className="relative bg-black mx-6 mt-6 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={handleVideoMount}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  {/* Hand detection indicator */}
                  <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all ${hasHands ? 'border-secondary/40 bg-secondary/10' : 'border-white/10 bg-black/40'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hasHands ? 'bg-secondary animate-pulse' : 'bg-white/30'}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${hasHands ? 'text-secondary' : 'text-white/40'}`}>
                      {hasHands ? 'Maos detectadas' : 'Aguardando maos'}
                    </span>
                  </div>

                  {/* Recording indicator */}
                  {state === 'recording' && (
                    <div className="absolute inset-0 border-4 border-red-500/80 rounded-2xl pointer-events-none transition-all" />
                  )}
                </div>

                {/* Instruction */}
                <p className="text-xs text-on-surface-variant opacity-40 text-center mt-3 px-6">
                  {state === 'recording' 
                    ? 'Gravando... realize o sinal e clique em Parar' 
                    : 'Posicione as maos no centro e clique em Gravar'}
                </p>

                {/* Capture buttons */}
                <div className="flex items-center justify-center gap-4 px-6 py-6">
                  {state === 'ready' ? (
                    <button
                      onClick={handleStartRecording}
                      className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-all border ${
                        hasHands
                          ? 'border-secondary/40 text-secondary bg-secondary/10 hover:border-secondary hover:bg-secondary/20 hover:shadow-[0_0_25px_rgba(159,207,213,0.2)]'
                          : 'border-white/10 text-on-surface-variant opacity-40 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      <span className="material-symbols-outlined text-base">videocam</span>
                      Gravar sinal
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-all border border-red-500/50 text-red-500 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    >
                      <span className="material-symbols-outlined text-base">stop_circle</span>
                      Parar gravação
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant opacity-30 hover:opacity-60 transition-opacity"
                  >
                    Cancelar
                  </button>
                </div>

                {/* MediaPipe tracker — mounted alongside video so refs are ready */}
                <LibrasHandTracker
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  onLandmarksUpdate={handleLandmarksUpdate}
                  isActive={isVideoActive}
                />
              </motion.div>
            )}

            {/* RECOGNIZING */}
            {state === 'recognizing' && (
              <motion.div
                key="recognizing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 p-8 flex-1"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-3xl animate-spin">refresh</span>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-on-surface">Interpretando sinal...</p>
                  <p className="text-xs text-on-surface-variant opacity-40">Analisando o movimento capturado</p>
                </div>
              </motion.div>
            )}

            {/* CONFIRMED — show result for user confirmation */}
            {state === 'confirmed' && recognizedText && (
              <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                <LibrasConfirmation
                  text={recognizedText}
                  confidence={recognizedConfidence}
                  onConfirm={handleConfirm}
                  onRetry={handleRetry}
                />
              </motion.div>
            )}

            {/* ERROR */}
            {state === 'error' && errorType && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                <LibrasError
                  type={errorType}
                  message={errorMessage}
                  onRetry={errorType !== 'permission_denied' ? handleRetry : undefined}
                  onDismiss={handleClose}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
