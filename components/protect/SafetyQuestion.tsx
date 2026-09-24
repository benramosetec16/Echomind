'use client';

import { motion } from 'framer-motion';

interface SafetyQuestionProps {
  onAnswer: (answer: boolean | null) => void;
}

export default function SafetyQuestion({ onAnswer }: SafetyQuestionProps) {
  const options = [
    {
      label: 'Sim',
      value: true as boolean | null,
      icon: 'check',
      description: 'A pessoa é familiar, responsável ou cuidador',
    },
    {
      label: 'Não',
      value: false as boolean | null,
      icon: 'close',
      description: 'A pessoa não é familiar ou responsável',
    },
    {
      label: 'Não sei',
      value: null as boolean | null,
      icon: 'help_outline',
      description: 'Não tenho certeza',
    },
    {
      label: 'Prefiro não responder',
      value: null as boolean | null,
      icon: 'lock',
      description: 'Quero manter em sigilo por enquanto',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-secondary text-xl">shield_person</span>
          </div>
          <h3 className="text-lg font-medium text-on-surface">Uma pergunta importante</h3>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          A pessoa envolvida nessa situação é alguém da sua família,
          responsável por você, cuidador ou alguém de quem você depende?
        </p>
        <p className="text-xs text-on-surface-variant/60 leading-relaxed">
          Sua resposta ajuda a garantir que seu pedido chegue à pessoa certa
          para te ajudar. Não é obrigatório responder.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((option, index) => (
          <motion.button
            key={`${option.label}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => onAnswer(option.value)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container/50 border border-white/5 hover:border-secondary/30 hover:bg-secondary/5 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-full border border-white/10 group-hover:border-secondary/30 flex items-center justify-center flex-shrink-0 transition-colors">
              <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-secondary transition-colors">
                {option.icon}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">{option.label}</p>
              <p className="text-xs text-on-surface-variant opacity-60">{option.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
