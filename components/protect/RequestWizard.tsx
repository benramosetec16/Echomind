'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafetyQuestion from './SafetyQuestion';
import ReportInput from './ReportInput';
import UrgentBanner from './UrgentBanner';
import { createProtectRequest } from '@/app/dashboard/protect/request/actions';
import {
  PROTECT_KIND_LABELS,
  PROTECT_KIND_ICONS,
  type ProtectRequestKind,
  type ProtectEntryType,
} from '@/lib/protect/types';

interface RequestWizardProps {
  onComplete: (requestId: string, routingType: string) => void;
  onCancel: () => void;
}

type WizardStep = 'kind' | 'report' | 'safety' | 'submitting' | 'done' | 'error';

const kinds: { kind: ProtectRequestKind; urgent?: boolean }[] = [
  { kind: 'want_to_talk' },
  { kind: 'report_situation' },
  { kind: 'worried_about_someone' },
  { kind: 'dont_know' },
];

export default function RequestWizard({ onComplete, onCancel }: RequestWizardProps) {
  const [step, setStep] = useState<WizardStep>('kind');
  const [selectedKind, setSelectedKind] = useState<ProtectRequestKind | null>(null);
  const [reportText, setReportText] = useState('');
  const [entryType, setEntryType] = useState<ProtectEntryType>('text');
  const [involvesGuardian, setInvolvesGuardian] = useState<boolean | null | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleKindSelect = (kind: ProtectRequestKind) => {
    setSelectedKind(kind);
    setStep('report');
  };

  const handleReportNext = () => setStep('safety');
  const handleReportSkip = () => setStep('safety');

  const handleSafetyAnswer = (answer: boolean | null) => {
    setInvolvesGuardian(answer);
    handleSubmit(answer);
  };

  const handleSubmit = async (guardianAnswer: boolean | null | undefined) => {
    if (!selectedKind) return;
    setStep('submitting');
    setErrorMsg(null);

    const result = await createProtectRequest({
      requestKind: selectedKind,
      reportText,
      entryType,
      involvesGuardian: guardianAnswer === undefined ? null : guardianAnswer,
    });

    if (result.error) {
      setErrorMsg(result.error);
      setStep('error');
    } else if (result.success && result.requestId) {
      onComplete(result.requestId, result.routingType ?? 'normal');
      setStep('done');
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {['kind', 'report', 'safety'].map((s, i) => {
          const steps = ['kind', 'report', 'safety'];
          const currentIdx = steps.indexOf(step);
          const isDone = i < currentIdx;
          const isCurrent = s === step && !['submitting', 'done', 'error'].includes(step);
          return (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                isDone
                  ? 'bg-secondary'
                  : isCurrent
                  ? 'bg-secondary/50'
                  : 'bg-white/10'
              }`}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* PASSO 1: Tipo de ajuda */}
        {step === 'kind' && (
          <motion.div
            key="kind"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-on-surface">Como posso ajudar?</h3>
              <p className="text-sm text-on-surface-variant">
                Escolha a opção que faz mais sentido para você agora.
              </p>
            </div>

            <div className="grid gap-3">
              {kinds.map(({ kind }, index) => (
                <motion.button
                  key={kind}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  onClick={() => handleKindSelect(kind)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container/50 border border-white/5 hover:border-secondary/30 hover:bg-secondary/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 group-hover:border-secondary/40 flex items-center justify-center flex-shrink-0 transition-colors">
                    <span className="material-symbols-outlined text-secondary text-lg">
                      {PROTECT_KIND_ICONS[kind]}
                    </span>
                  </div>
                  <span className="text-sm text-on-surface font-medium">
                    {PROTECT_KIND_LABELS[kind]}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-40 ml-auto group-hover:opacity-80 transition-opacity">
                    chevron_right
                  </span>
                </motion.button>
              ))}
            </div>

            <button
              onClick={onCancel}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Voltar
            </button>
          </motion.div>
        )}

        {/* PASSO 2: Relato */}
        {step === 'report' && (
          <motion.div
            key="report"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <ReportInput
              value={reportText}
              onChange={setReportText}
              onEntryTypeChange={setEntryType}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleReportSkip}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10 transition-colors"
              >
                Prefiro não escrever
              </button>
              <button
                onClick={handleReportNext}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-secondary/20 border border-secondary/30 text-secondary hover:bg-secondary/30 transition-colors"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        )}

        {/* PASSO 3: Pergunta de segurança */}
        {step === 'safety' && (
          <motion.div
            key="safety"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SafetyQuestion onAnswer={handleSafetyAnswer} />
          </motion.div>
        )}

        {/* Enviando */}
        {step === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6 py-12"
          >
            <div className="w-16 h-16 rounded-full border border-secondary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-3xl animate-pulse">
                shield_person
              </span>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-on-surface">Registrando seu pedido...</p>
              <p className="text-xs text-on-surface-variant opacity-60">
                Garantindo que chegue à pessoa certa.
              </p>
            </div>
          </motion.div>
        )}

        {/* Erro */}
        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="rounded-2xl p-4 bg-error/5 border border-error/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <div>
                <p className="text-sm font-medium text-error">Não foi possível registrar</p>
                <p className="text-xs text-error/70 mt-1">{errorMsg}</p>
              </div>
            </div>
            <UrgentBanner />
            <button
              onClick={() => setStep('kind')}
              className="text-xs text-secondary hover:text-secondary/80 transition-colors"
            >
              Tentar novamente
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
