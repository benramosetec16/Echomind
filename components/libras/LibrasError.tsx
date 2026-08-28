'use client';

import { motion } from 'framer-motion';

export type LibrasErrorType =
  | 'permission_denied'
  | 'camera_unavailable'
  | 'low_confidence'
  | 'not_recognized'
  | 'processing_error'
  | 'no_hands'
  | 'poor_lighting';

interface LibrasErrorProps {
  type: LibrasErrorType;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const errorConfig: Record<LibrasErrorType, { icon: string; title: string; message: string; retryLabel?: string }> = {
  permission_denied: {
    icon: 'videocam_off',
    title: 'Camera bloqueada',
    message: 'O acesso a camera foi negado. Para usar o reconhecimento de Libras, permita o acesso a camera nas configuracoes do seu navegador.',
  },
  camera_unavailable: {
    icon: 'no_photography',
    title: 'Camera indisponivel',
    message: 'Nao foi possivel acessar a camera. Verifique se ha outro aplicativo utilizando a camera.',
    retryLabel: 'Tentar novamente',
  },
  low_confidence: {
    icon: 'help_outline',
    title: 'Sinal nao reconhecido com seguranca',
    message: 'Nao conseguimos interpretar esse sinal com confianca suficiente. Certifique-se de que suas maos estejam bem iluminadas e centralizadas no quadro.',
    retryLabel: 'Fazer novamente',
  },
  not_recognized: {
    icon: 'sign_language',
    title: 'Sinal nao identificado',
    message: 'Nao foi possivel identificar um sinal nesta captura. Posicione as maos no centro da camera com boa iluminacao e realize o sinal de forma clara.',
    retryLabel: 'Tentar novamente',
  },
  processing_error: {
    icon: 'error_outline',
    title: 'Erro no processamento',
    message: 'Ocorreu uma falha ao processar o sinal. Verifique sua conexao e tente novamente.',
    retryLabel: 'Tentar novamente',
  },
  no_hands: {
    icon: 'pan_tool',
    title: 'Maos fora do enquadramento',
    message: 'Nenhuma mao foi detectada na captura. Posicione as maos dentro da area da camera e tente novamente.',
    retryLabel: 'Tentar novamente',
  },
  poor_lighting: {
    icon: 'light_mode',
    title: 'Iluminacao insuficiente',
    message: 'A iluminacao esta baixa para um reconhecimento preciso. Aproxime-se de uma fonte de luz e tente novamente.',
    retryLabel: 'Tentar novamente',
  },
};

export default function LibrasError({ type, message, onRetry, onDismiss }: LibrasErrorProps) {
  const config = errorConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col items-center text-center gap-6 py-8 px-4"
    >
      <div className="w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-tertiary text-3xl">{config.icon}</span>
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-medium text-on-surface">{config.title}</h3>
        <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
          {message ?? config.message}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {config.retryLabel && onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-secondary/30 rounded-full text-xs font-semibold uppercase tracking-[0.15em] text-secondary hover:border-secondary hover:shadow-[0_0_20px_rgba(159,207,213,0.15)] transition-all"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            {config.retryLabel}
          </button>
        )}
        {onDismiss && (
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
