'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '../../utils/supabase/client';

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function GuardianBanner({ userId, onComplete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
      })
      .eq('id', userId);

    if (updateError) {
      setError('Erro ao salvar: ' + updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onComplete();
    }, 1200);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1200px] mx-auto mb-8"
    >
      <div className="relative rounded-[20px] border border-yellow-400/20 bg-yellow-400/5 backdrop-blur-sm overflow-hidden">
        {/* Accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400/50 rounded-l-xl" />

        <div className="px-6 py-4 flex items-center justify-between gap-4 pl-8">
          <div className="flex items-center gap-3 flex-1">
            <span className="material-symbols-outlined text-yellow-400 text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
              contact_phone
            </span>
            <div>
              <p className="text-sm font-semibold text-yellow-300">
                Contato do Responsável não cadastrado
              </p>
              <p className="text-xs text-on-surface-variant opacity-70 mt-0.5">
                Informe o número de contato do seu responsável para que orientadores e gestores possam acompanhá-lo adequadamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setExpanded(v => !v)}
              className="px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-semibold uppercase tracking-wider hover:bg-yellow-400/20 transition-colors"
            >
              {expanded ? 'Fechar' : 'Informar Agora'}
            </button>
            <button
              onClick={onComplete}
              className="text-on-surface-variant hover:text-on-surface opacity-40 hover:opacity-70 transition-opacity p-1"
              title="Lembrar depois"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-8 pb-6 pt-2 border-t border-yellow-400/10">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-secondary font-semibold text-sm">Contato salvo com sucesso!</span>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1.5">
                        Nome do Responsável
                      </label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={e => setGuardianName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-yellow-400/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1.5">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={guardianPhone}
                        onChange={e => setGuardianPhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-yellow-400/50 transition-colors"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        disabled={saving || !guardianName.trim() || !guardianPhone.trim()}
                        className="flex-1 py-2.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-semibold rounded-xl text-xs uppercase tracking-wider hover:bg-yellow-400/20 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                    {error && (
                      <div className="col-span-3">
                        <p className="text-xs text-red-400">{error}</p>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
