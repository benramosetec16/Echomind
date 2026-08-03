'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch('/api/onboarding/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() })
    });

    const json = await res.json();
    if (json.error) {
      setError(json.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onComplete();
      window.location.reload();
    }, 1500);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-lg px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md aetheric-glass rounded-[28px] p-10"
      >
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-secondary text-4xl block mb-3">domain</span>
          <h2 className="text-2xl font-extralight tracking-tight text-on-surface mb-1">Vincular Instituição</h2>
          <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
            Sua conta ainda não está vinculada a uma instituição. Informe o código fornecido pela sua escola ou responsável para ativar seu perfil completo.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-red-400 text-sm">error</span>
              <span className="text-xs text-red-400">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
              <span className="text-xs text-secondary">Vinculado com sucesso! Recarregando...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2">
              Código Institucional
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: TURMA-A ou PROF001"
              className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary transition-colors font-mono uppercase tracking-[0.2em]"
              maxLength={20}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim() || success}
            className="w-full py-3.5 bg-secondary text-background font-semibold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Validando...' : success ? 'Concluído!' : 'Vincular Conta'}
          </button>

          <button
            type="button"
            onClick={onComplete}
            className="text-center text-[10px] text-on-surface-variant opacity-40 hover:opacity-70 transition-opacity uppercase tracking-wider"
          >
            Pular por enquanto (acesso limitado)
          </button>
        </form>

        <div className="mt-6 bg-surface-container/30 rounded-xl p-4 flex gap-2 items-start">
          <span className="material-symbols-outlined text-secondary text-sm mt-0.5">info</span>
          <p className="text-[10px] text-on-surface-variant opacity-60 leading-relaxed">
            O código é fornecido pelo Administrador ou Gestor Institucional da sua escola. Após vinculação, ele não será solicitado novamente no login.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
