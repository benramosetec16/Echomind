'use client';

import { motion } from 'framer-motion';
import { PROTECT_STATUS_LABELS, PROTECT_STATUS_ICONS, type ProtectStatus } from '@/lib/protect/types';

interface TimelineEntry {
  id: string;
  new_status: ProtectStatus;
  previous_status: ProtectStatus | null;
  changed_at: string;
  note?: string | null;
}

interface ProtectTimelineProps {
  entries: TimelineEntry[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProtectTimeline({ entries }: ProtectTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-on-surface-variant opacity-60">
        Nenhum registro ainda.
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Linha vertical */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-white/10" />

      <div className="space-y-6">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const isConcluded = entry.new_status === 'concluded';

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="relative"
            >
              {/* Ponto na linha */}
              <div
                className={`absolute -left-5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isConcluded
                    ? 'bg-green-500/20 border-green-500/60'
                    : isLast
                    ? 'bg-secondary/20 border-secondary/60'
                    : 'bg-surface-container border-white/20'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[10px] ${
                    isConcluded
                      ? 'text-green-400'
                      : isLast
                      ? 'text-secondary'
                      : 'text-on-surface-variant'
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {PROTECT_STATUS_ICONS[entry.new_status]}
                </span>
              </div>

              <div className="aetheric-glass rounded-[32px] p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-medium ${
                      isConcluded ? 'text-green-400' : 'text-on-surface'
                    }`}
                  >
                    {PROTECT_STATUS_LABELS[entry.new_status]}
                  </p>
                  <span className="text-xs text-on-surface-variant opacity-50">
                    {formatDate(entry.changed_at)}
                  </span>
                </div>
                {/* Notas do profissional: mostrar apenas mensagem genérica ao aluno */}
                {entry.note && entry.new_status === 'concluded' && (
                  <p className="text-xs text-on-surface-variant">
                    Esta etapa foi concluída por um profissional responsável.
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
