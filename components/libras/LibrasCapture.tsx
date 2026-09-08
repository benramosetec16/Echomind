'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LibrasHandTracker from './LibrasHandTracker';
import LibrasConfirmation from './LibrasConfirmation';
import LibrasError, { LibrasErrorType } from './LibrasError';
import { LibrasRecognizer } from './classifier/recognizer';
import { HandFrame, HandLandmark } from './classifier/types';
import { librasLogger } from './logger';

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
  onContinueText?: () => void;
}

export default function LibrasCapture({
  onConfirm,
  onClose,
  onContinueText,
}: LibrasCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle');
  const [errorType, setErrorType] = useState<LibrasErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [recognizedSignLabel, setRecognizedSignLabel] = useState<string | undefined>(undefined);
  const [recognizedConfidence, setRecognizedConfidence] = useState<
    'high' | 'medium' | 'low' | null
  >(null);
  const [confidenceScore, setConfidenceScore] = useState<number | undefined>(undefined);
  const [hasHands, setHasHands] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const recognizerRef = useRef<LibrasRecognizer>(new LibrasRecognizer());

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
      librasLogger.info('Camera', 'STOPPED');
    }
  }, []);

  const requestCamera = useCallback(async () => {
    setState('requesting_permission');
    setErrorType(null);
    setErrorMessage(undefined);
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setErrorType('camera_unavailable');
        setErrorMessage('Seu navegador não suporta acesso à câmera.');
        setState('error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!stream.active || stream.getVideoTracks().length === 0) {
        throw new Error('NotReadableError');
      }

      // Listen for stream track interruption
      stream.getVideoTracks()[0].onended = () => {
        librasLogger.warn('Camera', 'Stream de vídeo interrompido');
        stopCamera();
      };

      streamRef.current = stream;
      librasLogger.info('Camera', 'OK');

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          librasLogger.info('Video dimensions', `${video.videoWidth}x${video.videoHeight}`);
          video.play().catch(() => {});
        };
      }

      setState('ready');
    } catch (err: any) {
      librasLogger.error('Camera request error', err?.name || err?.message);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.name === 'SecurityError'
      ) {
        setErrorType('permission_denied');
      } else {
        setErrorType('camera_unavailable');
      }
      setState('error');
    }
  }, [stopCamera]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleVideoMount = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
        node.onloadedmetadata = () => {
          librasLogger.info('Video dimensions', `${node.videoWidth}x${node.videoHeight}`);
          node.play().catch(() => {});
        };
      }
    }
  }, []);

  const handleLandmarksUpdate = useCallback((landmarks: HandLandmark[][] | null) => {
    const handsPresent = landmarks !== null && landmarks.length > 0;
    setHasHands(handsPresent);
  }, []);

  const handleFrameUpdate = useCallback((frame: HandFrame) => {
    if (isRecordingRef.current) {
      recognizerRef.current.addFrame(frame);
    }
  }, []);

  const handleStartRecording = useCallback(() => {
    recognizerRef.current.reset();
    isRecordingRef.current = true;
    setState('recording');
    librasLogger.info('Recording', 'STARTED');
  }, []);

  const handleStopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setState('recognizing');
    librasLogger.info('Recording', 'STOPPED');

    // Run structural classification locally
    setTimeout(() => {
      try {
        const result = recognizerRef.current.classify();

        if (result.success && result.prediction) {
          setRecognizedText(result.prediction.text);
          setRecognizedSignLabel(result.prediction.label);
          setConfidenceScore(result.confidence);
          setRecognizedConfidence(
            result.confidence >= 0.85 ? 'high' : 'medium'
          );
          stopCamera();
          setState('confirmed');
          return;
        }

        // Recognition was uncertain or no hands
        stopCamera();
        if (result.error === 'NO_HANDS') {
          setErrorType('no_hands');
        } else if (result.error === 'LOW_CONFIDENCE') {
          setErrorType('low_confidence');
        } else if (result.error === 'NOT_RECOGNIZED') {
          setErrorType('not_recognized');
        } else {
          setErrorType('technical_error');
        }
        setState('error');
      } catch (err: any) {
        librasLogger.error('Classification error', err?.message);
        stopCamera();
        setErrorType('technical_error');
        setState('error');
      }
    }, 400);
  }, [stopCamera]);

  const handleRetry = useCallback(() => {
    setRecognizedText(null);
    setRecognizedSignLabel(undefined);
    setRecognizedConfidence(null);
    setConfidenceScore(undefined);
    setErrorType(null);
    setErrorMessage(undefined);
    setHasHands(false);
    recognizerRef.current.reset();
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

  const handleContinueByText = useCallback(() => {
    stopCamera();
    if (onContinueText) {
      onContinueText();
    } else {
      onClose();
    }
  }, [stopCamera, onContinueText, onClose]);

  const isVideoActive = state === 'ready' || state === 'recording';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-lg"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-xl bg-surface-container-low/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-lg">
                sign_language
              </span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Libras</h2>
              <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                POC de reconhecimento de Libras
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant opacity-50 hover:opacity-100 hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[380px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* IDLE — prompt to activate camera or continue by text */}
            {state === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 p-8 flex-1"
              >
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-secondary/5 border border-secondary/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-4xl">
                      videocam
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-on-surface">
                      Reconhecimento experimental de sinais
                    </h3>
                    <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
                      Utilize a câmera para responder ao seu check-in com sinais básicos em Libras (Olá, Sim, Não, Obrigado, Ajuda, Estou bem, etc.).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 bg-tertiary/5 border border-tertiary/15 rounded-xl px-4 py-3 text-left">
                    <span className="material-symbols-outlined text-tertiary text-sm mt-0.5 shrink-0">
                      lock
                    </span>
                    <p className="text-[11px] text-on-surface-variant opacity-70 leading-relaxed">
                      Privacidade garantida: o processamento ocorre 100% localmente no seu aparelho. Nenhuma imagem é enviada a servidores ou gravada.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
                  <button
                    onClick={requestCamera}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 border border-secondary/30 rounded-full text-xs font-semibold uppercase tracking-[0.2em] text-secondary hover:border-secondary hover:bg-secondary/10 hover:shadow-[0_0_25px_rgba(159,207,213,0.2)] transition-all"
                  >
                    <span className="material-symbols-outlined text-base">videocam</span>
                    Ativar câmera
                  </button>

                  <button
                    onClick={handleContinueByText}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant opacity-60 hover:opacity-100 hover:border-white/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Digitar mensagem
                  </button>
                </div>
              </motion.div>
            )}

            {/* REQUESTING PERMISSION */}
            {state === 'requesting_permission' && (
              <motion.div
                key="requesting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 p-8 flex-1"
              >
                <div className="w-14 h-14 rounded-full border border-secondary/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-2xl animate-pulse">
                    videocam
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant opacity-70 text-center">
                  Solicitando acesso à câmera...
                </p>
              </motion.div>
            )}

            {/* READY / RECORDING — Live Camera Feed */}
            {(state === 'ready' || state === 'recording') && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col flex-1"
              >
                {/* Camera Container */}
                <div
                  className="relative bg-black mx-6 mt-6 rounded-2xl overflow-hidden shadow-inner"
                  style={{ aspectRatio: '4/3' }}
                >
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

                  {/* Hand Detection Indicator Badge */}
                  <div
                    className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all ${
                      hasHands
                        ? 'border-secondary/40 bg-secondary/15'
                        : 'border-white/10 bg-black/50'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        hasHands ? 'bg-secondary animate-pulse' : 'bg-white/30'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-widest ${
                        hasHands ? 'text-secondary' : 'text-white/50'
                      }`}
                    >
                      {hasHands ? 'Mãos detectadas' : 'Posicione suas mãos'}
                    </span>
                  </div>

                  {/* Recording Frame Border */}
                  {state === 'recording' && (
                    <div className="absolute inset-0 border-4 border-red-500/80 rounded-2xl pointer-events-none animate-pulse" />
                  )}
                </div>

                {/* State Diagnostic Instructions */}
                <p className="text-xs text-on-surface-variant opacity-70 text-center mt-3 px-6">
                  {state === 'recording'
                    ? 'Gravando movimento... realize o sinal e clique em Parar'
                    : hasHands
                    ? 'Mãos detectadas. Clique em Gravar sinal para iniciar'
                    : 'Posicione suas mãos no centro do enquadramento'}
                </p>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-4 px-6 py-5">
                  {state === 'ready' ? (
                    <button
                      onClick={handleStartRecording}
                      className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-all border ${
                        hasHands
                          ? 'border-secondary/40 text-secondary bg-secondary/10 hover:border-secondary hover:bg-secondary/20 hover:shadow-[0_0_25px_rgba(159,207,213,0.2)]'
                          : 'border-white/10 text-on-surface-variant opacity-50 cursor-pointer hover:border-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        radio_button_checked
                      </span>
                      Gravar sinal
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-all border border-red-500/60 text-red-500 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    >
                      <span className="material-symbols-outlined text-base">
                        stop_circle
                      </span>
                      Parar gravação
                    </button>
                  )}

                  <button
                    onClick={handleContinueByText}
                    className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant opacity-40 hover:opacity-80 transition-opacity"
                  >
                    Digitar por texto
                  </button>

                  <button
                    onClick={handleClose}
                    className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant opacity-30 hover:opacity-60 transition-opacity"
                  >
                    Cancelar
                  </button>
                </div>

                {/* MediaPipe tracker */}
                <LibrasHandTracker
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  onLandmarksUpdate={handleLandmarksUpdate}
                  onFrameUpdate={handleFrameUpdate}
                  isActive={isVideoActive}
                />
              </motion.div>
            )}

            {/* RECOGNIZING */}
            {state === 'recognizing' && (
              <motion.div
                key="recognizing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 p-8 flex-1"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-3xl animate-spin">
                    progress_activity
                  </span>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-on-surface">
                    Analisando movimento...
                  </p>
                  <p className="text-xs text-on-surface-variant opacity-60">
                    Processando características espaciais e temporais do sinal
                  </p>
                </div>
              </motion.div>
            )}

            {/* CONFIRMED */}
            {state === 'confirmed' && recognizedText && (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <LibrasConfirmation
                  text={recognizedText}
                  signLabel={recognizedSignLabel}
                  confidence={recognizedConfidence}
                  confidenceScore={confidenceScore}
                  onConfirm={handleConfirm}
                  onRetry={handleRetry}
                  onContinueText={handleContinueByText}
                />
              </motion.div>
            )}

            {/* ERROR */}
            {state === 'error' && errorType && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <LibrasError
                  type={errorType}
                  message={errorMessage}
                  onRetry={errorType !== 'permission_denied' ? handleRetry : undefined}
                  onDismiss={handleClose}
                  onContinueText={handleContinueByText}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
