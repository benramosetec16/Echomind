'use client';

import React, { useState } from 'react';
import { Activity, Battery, Flame, AlertCircle, BrainCircuit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnaliseEmocional {
  emocao_principal: string;
  emocoes_secundarias: string[];
  nivel_estresse: number;
  nivel_energia: number;
  nivel_motivacao: number;
  resumo: string;
  recomendacao: string;
}

export default function EmotionAnalyzer() {
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

  const getLevelColor = (level: number, reverse: boolean = false) => {
    // Para energia/motivação, maior é melhor (verde). Para estresse, menor é melhor.
    const normalized = reverse ? 10 - level : level;
    if (normalized <= 3) return 'bg-red-500';
    if (normalized <= 7) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  const ProgressCircle = ({ value, icon: Icon, title, reverse = false }: any) => {
    const color = getLevelColor(value, reverse);
    return (
      <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <div className="relative flex items-center justify-center w-20 h-20">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/10"
              strokeDasharray="100, 100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <motion.path
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${value * 10}, 100` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={color.replace('bg-', 'text-')}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-xl font-bold text-white">{value}<span className="text-xs text-gray-500">/10</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-4">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">EchoMind Analysis</h2>
          <p className="text-gray-400">Desabafe conosco e descubra insights sobre o seu estado emocional e mental.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <textarea
              className="w-full h-40 px-6 py-5 bg-black/40 text-gray-100 border border-white/10 rounded-2xl outline-none transition-all duration-300 focus:border-indigo-500/50 focus:bg-black/60 focus:ring-4 focus:ring-indigo-500/10 placeholder-gray-500 resize-none text-lg"
              placeholder="Como você está se sentindo hoje? Escreva livremente..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !texto.trim()}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analisando...
              </>
            ) : (
              'Analisar Relato'
            )}
          </button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {analise && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 space-y-6"
            >
              <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/20 blur-3xl rounded-full"></div>
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Emoção Principal</h3>
                <p className="text-3xl md:text-4xl font-extrabold text-white capitalize">{analise.emocao_principal}</p>
                
                {analise.emocoes_secundarias.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {analise.emocoes_secundarias.map((emocao, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 text-gray-300 text-sm rounded-full capitalize">
                        {emocao}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProgressCircle value={analise.nivel_estresse} icon={Activity} title="Estresse" reverse={false} />
                <ProgressCircle value={analise.nivel_energia} icon={Battery} title="Energia" reverse={true} />
                <ProgressCircle value={analise.nivel_motivacao} icon={Flame} title="Motivação" reverse={true} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-black/40 border border-white/10 rounded-3xl">
                  <h3 className="text-gray-400 font-medium mb-2 uppercase tracking-wide text-xs">Resumo</h3>
                  <p className="text-gray-200 leading-relaxed">{analise.resumo}</p>
                </div>
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl">
                  <h3 className="text-indigo-400 font-medium mb-2 uppercase tracking-wide text-xs">Recomendação</h3>
                  <p className="text-indigo-100 leading-relaxed">{analise.recomendacao}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
