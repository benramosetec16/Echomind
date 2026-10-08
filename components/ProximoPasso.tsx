'use client';

/**
 * ProximoPasso — Camada de UX "Próximo Passo"
 *
 * Exibido após qualquer análise do EchoMind.
 * Oferece opções reais ao usuário — nenhum botão é decorativo.
 *
 * Princípios:
 *  - IA recomenda, usuário escolhe, profissional acompanha quando necessário.
 *  - Nunca pressionar. Nunca diagnosticar. Nunca transformar recomendação em obrigação.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RecommendationType =
  | 'general_support'
  | 'self_care'
  | 'talk_to_someone'
  | 'request_session'
  | 'urgent_human_support'
  | null;

export interface ProximoPassoProps {
  /** Texto de abertura contextualizado pela IA (ex: "Com base nos seus registros...") */
  contextMessage?: string;
  /** Tipo recomendado pela IA — apenas sugere pré-destaque, usuário decide */
  recommendationType?: RecommendationType;
  /** Se a IA já solicitou sessão via action='request_session', controlar estado externo */
  sessionAlreadyRequested?: boolean;
  /** Callback quando o usuário solicitar sessão com orientador */
  onRequestSession?: () => Promise<{ ok: boolean; message: string }>;
  /** Callback ao fechar sem ação */
  onDismiss?: () => void;
}

// ─── Opções disponíveis ───────────────────────────────────────────────────────

interface Option {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  recommended?: boolean;
  variant?: 'default' | 'accent' | 'muted';
}

function buildOptions(recommendationType: RecommendationType): Option[] {
  const base: Option[] = [
    {
      id: 'reflect',
      icon: 'psychology',
      label: 'Entender melhor',
      sublabel: 'Reflexão contextual sobre o que foi registrado.',
    },
    {
      id: 'session',
      icon: 'forum',
      label: 'Conversar com alguém',
      sublabel: 'Solicitar acompanhamento de um orientador.',
    },
    {
      id: 'study',
      icon: 'school',
      label: 'Apoio com estudos',
      sublabel: 'Ir para a área de Apoio Cognitivo.',
    },
    {
      id: 'checkin',
      icon: 'auto_awesome',
      label: 'Continuar acompanhando',
      sublabel: 'Fazer um novo check-in.',
    },
    {
      id: 'history',
      icon: 'favorite',
      label: 'Registrar algo importante',
      sublabel: 'Ver e registrar no histórico emocional.',
    },
    {
      id: 'dismiss',
      icon: 'close',
      label: 'Prefiro não fazer nada agora',
      sublabel: 'Tudo bem. Você pode voltar quando quiser.',
      variant: 'muted',
    },
  ];

  // Aplicar destaque recomendado pela IA (sem obrigar)
  if (recommendationType === 'request_session' || recommendationType === 'urgent_human_support') {
    return base.map((o) =>
      o.id === 'session' ? { ...o, recommended: true, variant: 'accent' } : o
    );
  }
  if (recommendationType === 'self_care') {
    return base.map((o) =>
      o.id === 'reflect' ? { ...o, recommended: true, variant: 'accent' } : o
    );
  }
  if (recommendationType === 'talk_to_someone') {
    return base.map((o) =>
      o.id === 'session' ? { ...o, recommended: true, variant: 'accent' } : o
    );
  }

  return base;
}

// ─── Card de opção ─────────────────────────────────────────────────────────────

function OptionCard({
  option,
  onClick,
  loading,
  disabled,
  delay,
}: {
  option: Option;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  delay?: number;
}) {
  const accentClass =
    option.variant === 'accent'
      ? 'border-secondary/40 bg-secondary/8 hover:bg-secondary/12'
      : option.variant === 'muted'
      ? 'border-white/5 bg-transparent hover:bg-white/3 opacity-50 hover:opacity-70'
      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]';

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.4 }}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={option.label}
      className={`
        w-full text-left flex items-center gap-4 p-4 rounded-2xl border
        transition-all duration-200 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-40
        ${accentClass}
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${option.variant === 'accent' ? 'bg-secondary/15 border border-secondary/30' : 'bg-white/5 border border-white/10'}
        `}
      >
        {loading ? (
          <span className="material-symbols-outlined text-secondary text-lg animate-spin">sync</span>
        ) : (
          <span
            className={`material-symbols-outlined text-lg ${option.variant === 'accent' ? 'text-secondary' : 'text-on-surface-variant'}`}
          >
            {option.icon}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium leading-snug ${option.variant === 'muted' ? 'text-on-surface-variant' : 'text-on-surface'}`}
          >
            {option.label}
          </span>
          {option.recommended && (
            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-semibold bg-secondary/20 text-secondary border border-secondary/30">
              Sugerido
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant opacity-60 mt-0.5 leading-relaxed truncate">
          {option.sublabel}
        </p>
      </div>

      {/* Arrow — apenas para ações de navegação */}
      {option.id !== 'dismiss' && (
        <span className="material-symbols-outlined text-on-surface-variant opacity-30 text-base flex-shrink-0">
          chevron_right
        </span>
      )}
    </motion.button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProximoPasso({
  contextMessage,
  recommendationType,
  sessionAlreadyRequested = false,
  onRequestSession,
  onDismiss,
}: ProximoPassoProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sessionRequested, setSessionRequested] = useState(sessionAlreadyRequested);

  const options = buildOptions(recommendationType ?? null);

  const handleOption = async (id: string) => {
    if (loadingId) return;

    setFeedbackMsg(null);

    switch (id) {
      // ── Reflexão contextual ───────────────────────────────────────────────
      case 'reflect':
        // Redireciona para nova análise — o usuário pode escrever mais
        setLoadingId('reflect');
        await new Promise((r) => setTimeout(r, 300));
        router.push('/dashboard/analyze');
        break;

      // ── Solicitar sessão com orientador ───────────────────────────────────
      case 'session':
        if (sessionRequested) {
          setFeedbackMsg({ text: 'Solicitação já enviada ao orientador.', ok: true });
          return;
        }
        setLoadingId('session');
        try {
          if (onRequestSession) {
            // Usar callback externo (ex: EmotionAnalyzer já tem a lógica)
            const result = await onRequestSession();
            if (result.ok) {
              setSessionRequested(true);
              setFeedbackMsg({ text: result.message, ok: true });
              setTimeout(() => router.push('/dashboard/messages'), 1800);
            } else {
              setFeedbackMsg({ text: result.message, ok: false });
            }
          } else {
            // Fallback: solicitar sessão internamente via Supabase
            const supabase = createClient();
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
              setFeedbackMsg({ text: 'Você precisa estar autenticado para solicitar uma sessão.', ok: false });
              break;
            }

            const { data: profile } = await supabase
              .from('profiles')
              .select('institution_id, classroom_id, orientador_id')
              .eq('id', user.id)
              .single();

            let targetOrientador = profile?.orientador_id ?? null;

            if (!targetOrientador && profile?.classroom_id) {
              const { data: classroom } = await supabase
                .from('classrooms')
                .select('orientador_id')
                .eq('id', profile.classroom_id)
                .maybeSingle();
              if (classroom?.orientador_id) targetOrientador = classroom.orientador_id;
            }

            if (!profile?.institution_id) {
              setFeedbackMsg({ text: 'Você não possui uma instituição vinculada.', ok: false });
              break;
            }
            if (!targetOrientador) {
              setFeedbackMsg({ text: 'Não foi possível localizar um orientador responsável.', ok: false });
              break;
            }

            const { error: insertError } = await supabase.from('messages').insert({
              sender_id: user.id,
              receiver_id: targetOrientador,
              content:
                'Solicitação de acompanhamento: O aluno solicitou uma sessão através do EchoMind.',
              type: 'session_request',
              session_status: 'pendente',
            });

            if (insertError) {
              setFeedbackMsg({ text: 'Não foi possível enviar a solicitação. Tente novamente.', ok: false });
            } else {
              setSessionRequested(true);
              setFeedbackMsg({ text: 'Solicitação encaminhada ao orientador responsável.', ok: true });
              setTimeout(() => router.push('/dashboard/messages'), 1800);
            }
          }
        } catch {
          setFeedbackMsg({ text: 'Ocorreu um erro inesperado. Tente novamente.', ok: false });
        } finally {
          setLoadingId(null);
        }
        return;

      // ── Apoio com estudos ─────────────────────────────────────────────────
      case 'study':
        setLoadingId('study');
        await new Promise((r) => setTimeout(r, 300));
        router.push('/study');
        break;

      // ── Novo check-in ─────────────────────────────────────────────────────
      case 'checkin':
        setLoadingId('checkin');
        await new Promise((r) => setTimeout(r, 300));
        router.push('/dashboard/checkin');
        break;

      // ── Histórico / registrar ──────────────────────────────────────────────
      case 'history':
        setLoadingId('history');
        await new Promise((r) => setTimeout(r, 300));
        router.push('/dashboard/history');
        break;

      // ── Dispensar ────────────────────────────────────────────────────────
      case 'dismiss':
        setDismissed(true);
        onDismiss?.();
        break;
    }

    setLoadingId(null);
  };

  // ── Renderização ────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.section
          key="proximo-passo"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          aria-label="Próximo passo"
          className="mt-8 w-full"
        >
          {/* ── Cabeçalho ── */}
          <div className="mb-5 px-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary text-base">explore</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Próximo passo
              </span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-lg">
              {contextMessage ||
                'Com base no que foi registrado, há alguns caminhos disponíveis. O que você gostaria de fazer?'}
            </p>
          </div>

          {/* ── Feedback de ação ── */}
          <AnimatePresence>
            {feedbackMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-4 flex items-start gap-2 px-4 py-3 rounded-xl border text-xs leading-relaxed ${
                  feedbackMsg.ok
                    ? 'bg-secondary/10 border-secondary/30 text-secondary'
                    : 'bg-error/10 border-error/30 text-error'
                }`}
              >
                <span className="material-symbols-outlined text-sm mt-0.5 flex-shrink-0">
                  {feedbackMsg.ok ? 'check_circle' : 'error'}
                </span>
                <span>{feedbackMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Cards de opções ── */}
          <div className="flex flex-col gap-2">
            {options.map((option, i) => (
              <OptionCard
                key={option.id}
                option={
                  // Se sessão já foi solicitada, desativar visualmente o card de session
                  option.id === 'session' && sessionRequested
                    ? { ...option, label: 'Conversar com alguém', sublabel: 'Solicitação já enviada ao orientador.' }
                    : option
                }
                onClick={() => handleOption(option.id)}
                loading={loadingId === option.id}
                disabled={
                  (!!loadingId && loadingId !== option.id) ||
                  (option.id === 'session' && sessionRequested)
                }
                delay={0.05 * i}
              />
            ))}
          </div>

          {/* ── Nota de autonomia ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-center text-[10px] text-on-surface-variant opacity-30 uppercase tracking-[0.15em]"
          >
            Você decide. Sem pressão.
          </motion.p>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
