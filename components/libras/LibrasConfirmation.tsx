'use client';

import { motion } from 'framer-motion';

interface LibrasConfirmationProps {
  text: string;
  signLabel?: string;
  confidence: 'high' | 'medium' | 'low' | null;
  confidenceScore?: number;
  onConfirm: (text: string) => void;
  onRetry: () => void;
  onContinueText?: () => void;
}

export default function LibrasConfirmation({
  text,
  signLabel,
  confidence,
  confidenceScore,
  onConfirm,
  onRetry,
  onContinueText,
}: LibrasConfirmationProps) {
  const confidenceLabel: Record<string, string> = {
    high: 'Alta confiança',
    medium: 'Confiança moderada',
    low: 'Baixa confiança',
  };

  const confidenceColor: Record<string, string> = {
    high: 'text-secondary',
    medium: 'text-tertiary',
    low: 'text-error',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col items-center gap-6 py-6 px-6 w-full"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary text-2xl">
            check_circle
          </span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant opacity-60">
          Sinal Reconhecido{signLabel ? `: ${signLabel}` : ''}
        </p>
      </div>

      {/* Recognized text bubble */}
      <div className="w-full max-w-md bg-surface-container/60 rounded-2xl p-6 text-center border border-secondary/20 backdrop-blur-md">
        <p className="text-xl font-light text-on-surface leading-relaxed">
          &ldquo;{text}&rdquo;
        </p>
        {confidence && (
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.15em] mt-3 ${
              confidenceColor[confidence] ?? 'text-on-surface-variant'
            }`}
          >
            {confidenceLabel[confidence]}
            {confidenceScore !== undefined ? ` (${Math.round(confidenceScore * 100)}%)` : ''}
          </p>
        )}
      </div>

      {/* Confirmation prompt */}
      <p className="text-sm text-on-surface-variant opacity-70 text-center">
        Deseja confirmar e utilizar esta mensagem na sua reflexão?
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          onClick={() => onConfirm(text)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-secondary/10 border border-secondary/40 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-secondary hover:bg-secondary/20 hover:border-secondary hover:shadow-[0_0_25px_rgba(159,207,213,0.2)] transition-all"
        >
          <span className="material-symbols-outlined text-base">check</span>
          Confirmar
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant hover:border-white/20 hover:text-on-surface transition-all"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Fazer novamente
        </button>
      </div>

      {onContinueText && (
        <button
          onClick={onContinueText}
          className="text-xs text-on-surface-variant opacity-40 hover:opacity-80 transition-opacity underline-offset-4 hover:underline"
        >
          Prefiro digitar minha mensagem
        </button>
      )}

      {/* Privacy Guarantee */}
      <p className="text-[10px] text-on-surface-variant opacity-40 text-center leading-relaxed max-w-xs mt-2">
        Processamento 100% local no seu navegador. Nenhuma imagem da câmera é transmitida ou gravada.
      </p>
    </motion.div>
  );
}
