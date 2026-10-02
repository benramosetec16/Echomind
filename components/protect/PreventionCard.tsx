'use client';

import { motion } from 'framer-motion';

const CATEGORY_ICONS: Record<string, string> = {
  bullying: 'groups',
  cyberbullying: 'devices',
  violence: 'warning',
  harassment: 'person_off',
  digital_safety: 'security',
  respect: 'handshake',
  limits: 'boundary',
  how_to_ask_help: 'support_agent',
  how_to_help_friend: 'group',
  warning_signs: 'crisis_alert',
  protection_channels: 'shield',
};

const CATEGORY_LABELS: Record<string, string> = {
  bullying: 'Bullying',
  cyberbullying: 'Cyberbullying',
  violence: 'Violência',
  harassment: 'Assédio',
  digital_safety: 'Segurança Digital',
  respect: 'Respeito',
  limits: 'Limites',
  how_to_ask_help: 'Como Pedir Ajuda',
  how_to_help_friend: 'Ajudar um Colega',
  warning_signs: 'Sinais de Atenção',
  protection_channels: 'Canais de Proteção',
};

interface PreventionCardProps {
  title: string;
  summary: string;
  category: string;
  source_name?: string | null;
  index?: number;
  onClick?: () => void;
}

export default function PreventionCard({
  title,
  summary,
  category,
  source_name,
  index = 0,
  onClick,
}: PreventionCardProps) {
  const icon = CATEGORY_ICONS[category] ?? 'article';
  const label = CATEGORY_LABELS[category] ?? category;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={onClick}
      className="aetheric-glass rounded-[32px] p-5 text-left hover:border-secondary/30 transition-all border border-white/5 w-full"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-secondary text-lg">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-secondary/70 font-semibold">
              {label}
            </span>
          </div>
          <h4 className="text-sm font-medium text-on-surface mb-1 line-clamp-2">{title}</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{summary}</p>
          {source_name && (
            <p className="text-[10px] text-on-surface-variant/50 mt-2">
              Fonte: {source_name}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
