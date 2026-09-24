'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LibrasCapture } from '@/components/libras';

interface ReportInputProps {
  value: string;
  onChange: (text: string) => void;
  onEntryTypeChange: (type: 'text' | 'libras' | 'text_and_libras') => void;
}

export default function ReportInput({
  value,
  onChange,
  onEntryTypeChange,
}: ReportInputProps) {
  const [showLibras, setShowLibras] = useState(false);
  const [usedLibras, setUsedLibras] = useState(false);

  const handleLibrasConfirm = (text: string) => {
    const newText = value ? `${value} ${text}` : text;
    onChange(newText);
    setUsedLibras(true);
    setShowLibras(false);
    onEntryTypeChange(value ? 'text_and_libras' : 'libras');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (usedLibras && e.target.value) {
      onEntryTypeChange('text_and_libras');
    } else if (!usedLibras) {
      onEntryTypeChange('text');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-on-surface">Você pode me contar mais?</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Não precisa ter as palavras certas. Pode escrever o que quiser,
          ou usar Libras. Isso é completamente opcional.
        </p>
      </div>

      <textarea
        value={value}
        onChange={handleTextChange}
        placeholder="Escreva o que quiser aqui..."
        rows={5}
        className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 px-5 text-sm text-on-surface outline-none focus:border-secondary/50 transition-colors placeholder-on-surface-variant/40 resize-none"
      />

      <button
        type="button"
        onClick={() => setShowLibras(true)}
        className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-all text-secondary text-sm font-medium"
      >
        <span className="material-symbols-outlined text-base">sign_language</span>
        Usar Libras
        {usedLibras && (
          <span className="text-xs bg-secondary/20 px-2 py-0.5 rounded-full">ativo</span>
        )}
      </button>

      {/* Libras modal reutilizando infraestrutura existente */}
      <AnimatePresence>
        {showLibras && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl p-4"
          >
            <LibrasCapture
              onConfirm={handleLibrasConfirm}
              onClose={() => setShowLibras(false)}
              onContinueText={() => setShowLibras(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
