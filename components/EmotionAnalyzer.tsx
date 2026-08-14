'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface AnaliseEmocional {
  emocao_principal: string;
  emocoes_secundarias: string[];
  nivel_estresse: number;
  nivel_energia: number;
  nivel_motivacao: number;
  response?: string;
  summary?: string;
  resumo?: string;
  indicators?: string[];
  recommendation?: string;
  recomendacao?: string;
  recommendation_type?: string;
  action?: string;
  action_label?: string;
  severity?: string;
  needs_attention?: boolean;
}

const getLevelColor = (level: number, reverse: boolean = false): string => {
  const normalized = reverse ? 10 - level : level;
  if (normalized <= 3) return 'text-error';
  if (normalized <= 6) return 'text-tertiary';
  return 'text-secondary';
};

const getLevelBg = (level: number, reverse: boolean = false): string => {
  const normalized = reverse ? 10 - level : level;
  if (normalized <= 3) return 'bg-error/20 border-error/30';
  if (normalized <= 6) return 'bg-tertiary/20 border-tertiary/30';
  return 'bg-secondary/20 border-secondary/30';
};

function MetricBar({
  label,
  value,
  icon,
  reverse = false,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: string;
  reverse?: boolean;
  delay?: number;
}) {
  const color = getLevelColor(value, reverse);
  const bg = getLevelBg(value, reverse);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`flex flex-col gap-3 p-5 rounded-2xl border ${bg} backdrop-blur-md`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-lg ${color}`}>{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
            {label}
          </span>
        </div>
        <span className={`text-xl font-extralight ${color}`}>{value}<span className="text-xs text-on-surface-variant opacity-60">/10</span></span>
      </div>
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

export default function EmotionAnalyzer() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [analise, setAnalise] = useState<AnaliseEmocional | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setLoading(true);
    setError(null);
    setAnalise(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao processar sua solicitação.');
      }

      setAnalise(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAnalise(null);
    setTexto('');
    setError(null);
  };

  const handleActionClick = () => {
    if (analise?.action === 'request_session') {
      router.push('/dashboard/messages');
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto">
      <AnimatePresence mode="wait">
        {!analise ? (
          /* --- Input Form --- */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-secondary text-xl">psychology</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                    Análise Neural
                  </h2>
                  <p className="text-xs text-on-surface-variant opacity-60">
                    Descreva como você está se sentindo para receber uma análise emocional.
                  </p>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Hoje eu me sinto... (descreva seus pensamentos, emoções, situações do dia)"
                  rows={6}
                  className="w-full bg-surface-container-lowest/60 border border-white/10 rounded-2xl px-6 py-5 text-sm text-on-surface placeholder-on-surface-variant/30 focus:outline-none focus:border-secondary/50 transition-colors resize-none leading-relaxed"
                />
                <div className="absolute bottom-4 right-4 text-[10px] text-on-surface-variant opacity-30 font-mono">
                  {texto.length} chars
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-xl"
                  >
                    <span className="material-symbols-outlined text-error text-base">error</span>
                    <p className="text-xs text-error">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !texto.trim()}
                className="w-full py-4 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary text-xs font-semibold uppercase tracking-[0.2em] hover:bg-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    Processando Ressonância Neural...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Analisar Estado Emocional
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* --- Results --- */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6"
          >
            {/* Primary Emotion */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="aetheric-glass rounded-3xl p-10 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary block mb-4">
                  Estado Emocional Primário
                </span>
                <h3 className="text-5xl font-extralight text-on-surface tracking-tighter mb-6">
                  {analise.emocao_principal}
                </h3>
                {analise.emocoes_secundarias?.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {analise.emocoes_secundarias.map((em, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-surface-container border border-white/10 rounded-full text-xs text-on-surface-variant font-medium"
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* AI Response Acolhedora */}
            {analise.response && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6"
              >
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-secondary text-2xl flex-shrink-0">volunteer_activism</span>
                  <p className="text-sm text-on-surface leading-relaxed">{analise.response}</p>
                </div>
              </motion.div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricBar label="Estresse" value={analise.nivel_estresse} icon="bolt" reverse delay={0.2} />
              <MetricBar label="Energia" value={analise.nivel_energia} icon="battery_charging_full" delay={0.3} />
              <MetricBar label="Motivação" value={analise.nivel_motivacao} icon="local_fire_department" delay={0.4} />
            </div>

            {/* Summary & Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="glass-panel rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">summarize</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    Resumo
                  </span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed mb-4">{analise.summary || analise.resumo}</p>
                
                {analise.indicators && analise.indicators.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant mb-2 block">Indicadores</span>
                    <ul className="flex flex-col gap-2">
                      {analise.indicators.map((ind, i) => (
                        <li key={i} className="text-xs text-on-surface-variant/80 flex items-start gap-2">
                          <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className={`glass-panel rounded-2xl p-6 border-l ${analise.needs_attention ? 'border-l-error/50' : 'border-l-secondary/30'}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`material-symbols-outlined text-base ${analise.needs_attention ? 'text-error' : 'text-secondary'}`}>
                    {analise.needs_attention ? 'warning' : 'lightbulb'}
                  </span>
                  <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${analise.needs_attention ? 'text-error' : 'text-secondary'}`}>
                    Recomendação
                  </span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed mb-6">{analise.recommendation || analise.recomendacao}</p>
                
                {analise.action && analise.action === 'request_session' && (
                  <button
                    onClick={handleActionClick}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-on-surface text-xs font-semibold uppercase tracking-[0.15em] hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                    {analise.action_label || 'Solicitar uma sessão'}
                  </button>
                )}
              </motion.div>
            </div>

            {/* Reset */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center mt-4"
            >
              <button
                onClick={reset}
                className="text-xs text-on-surface-variant hover:text-secondary transition-colors uppercase tracking-[0.15em] font-semibold underline underline-offset-4"
              >
                Nova Análise
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
