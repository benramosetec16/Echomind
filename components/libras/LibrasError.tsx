'use client';

import { motion } from 'framer-motion';

export type LibrasErrorType =
  | 'permission_denied'
  | 'camera_unavailable'
  | 'low_confidence'
  | 'not_recognized'
  | 'processing_error'
  | 'no_hands'
  | 'poor_lighting'
  | 'technical_error'
  | 'ai_failed';

interface LibrasErrorProps {
  type: LibrasErrorType;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  onContinueText?: () => void;
}

const errorConfig: Record<
  LibrasErrorType,
  { icon: string; title: string; message: string; retryLabel?: string }
> = {
  permission_denied: {
    icon: 'videocam_off',
    title: 'Acesso à câmera não autorizado',
    message:
      'A permissão de acesso à câmera foi negada. Permita o acesso nas configurações do seu navegador para usar os sinais ou continue digitando por texto.',
  },
  camera_unavailable: {
    icon: 'no_photography',
    title: 'Câmera indisponível',
    message:
      'Não foi possível inicializar o dispositivo de vídeo. Verifique se a câmera está sendo utilizada por outro aplicativo.',
    retryLabel: 'Tentar novamente',
  },
  low_confidence: {
    icon: 'help_outline',
    title: 'Sinal não reconhecido com certeza',
    message:
      'Não conseguimos reconhecer esse sinal com confiança suficiente. Posicione suas mãos no centro da câmera, mantenha boa iluminação e repita o movimento com calma.',
    retryLabel: 'Tentar novamente',
  },
  not_recognized: {
    icon: 'sign_language',
    title: 'Sinal não identificado',
    message:
      'Não identificamos um sinal correspondente no vocabulário experimental desta etapa. Tente novamente ou prossiga por texto.',
    retryLabel: 'Tentar novamente',
  },
  processing_error: {
    icon: 'error_outline',
    title: 'Erro de processamento',
    message:
      'Houve uma instabilidade momentânea no processamento dos dados. Tente novamente.',
    retryLabel: 'Tentar novamente',
  },
  no_hands: {
    icon: 'pan_tool',
    title: 'Mãos não detectadas',
    message:
      'Nenhuma mão foi detectada durante a gravação. Posicione as mãos no enquadramento da câmera antes de iniciar o sinal.',
    retryLabel: 'Tentar novamente',
  },
  poor_lighting: {
    icon: 'light_mode',
    title: 'Iluminação insuficiente',
    message:
      'A iluminação está baixa para detectar os movimentos com precisão. Aproxime-se de uma fonte de luz.',
    retryLabel: 'Tentar novamente',
  },
  technical_error: {
    icon: 'warning_amber',
    title: 'Não foi possível processar o reconhecimento',
    message:
      'Ocorreu uma falha técnica durante o processamento do sinal. Tente novamente ou use a digitação.',
    retryLabel: 'Tentar novamente',
  },
  ai_failed: {
    icon: 'warning_amber',
    title: 'Não foi possível processar o reconhecimento',
    message:
      'Houve uma falha ao processar o reconhecimento. Você pode tentar novamente ou continuar diretamente por texto.',
    retryLabel: 'Tentar novamente',
  },
};

export default function LibrasError({
  type,
  message,
  onRetry,
  onDismiss,
  onContinueText,
}: LibrasErrorProps) {
  const config = errorConfig[type] || errorConfig.technical_error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col items-center text-center gap-6 py-8 px-6"
    >
      <div className="w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-tertiary text-3xl">
          {config.icon}
        </span>
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-medium text-on-surface">{config.title}</h3>
        <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
          {message ?? config.message}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-2">
        {config.retryLabel && onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-secondary/30 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-secondary hover:border-secondary hover:shadow-[0_0_20px_rgba(159,207,213,0.15)] transition-all"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            {config.retryLabel}
          </button>
        )}

        {onContinueText && (
          <button
            onClick={onContinueText}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-on-surface hover:border-white/25 hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-base">edit_note</span>
            Continuar por texto
          </button>
        )}

        {onDismiss && !onContinueText && (
          <button
            onClick={onDismiss}
            className="flex-1 px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant opacity-50 hover:opacity-80 transition-opacity"
          >
            Cancelar
          </button>
        )}
      </div>
    </motion.div>
  );
}
