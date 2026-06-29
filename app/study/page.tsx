'use client';

import { useState } from 'react';
import TopBar from '../components/TopBar';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';

type StudyMode = 'explain' | 'summarize' | 'review' | 'schedule' | 'qa';

const STUDY_MODES = [
  { id: 'explain', label: 'Explicação Profunda', icon: 'school' },
  { id: 'summarize', label: 'Sintetizar Resumo', icon: 'compress' },
  { id: 'review', label: 'Revisão e Questões', icon: 'quiz' },
  { id: 'schedule', label: 'Cronograma', icon: 'calendar_month' },
  { id: 'qa', label: 'Q&A Direto', icon: 'forum' },
];

export default function StudyPage() {
  const [activeMode, setActiveMode] = useState<StudyMode>('explain');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleStudyRequest = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activeMode, content }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na requisição');
      
      setResult(data.result);
    } catch (err) {
      console.error(err);
      setResult('Ocorreu uma falha na sintonia neural. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="Apoio Aos Estudos" />
      <main className="pt-32 px-4 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <div className="max-w-[1000px] mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-3xl font-extralight text-on-surface tracking-tighter mb-4">Apoio Cognitivo</h2>
              <p className="text-sm text-on-surface-variant opacity-80 max-w-2xl">
                Selecione um protocolo educacional e forneça a matéria base. A IA processará o conteúdo para otimizar a sua retenção neural.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="flex flex-wrap gap-4 mb-8">
              {STUDY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id as StudyMode)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs uppercase tracking-widest font-semibold transition-all duration-300 ${
                    activeMode === mode.id
                      ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[0_0_15px_rgba(var(--color-secondary),0.1)]'
                      : 'bg-surface-container text-on-surface-variant opacity-60 hover:opacity-100 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="aetheric-glass rounded-[32px] p-6 md:p-8 mb-8">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole seu texto, anotações ou digite o tema que deseja estudar..."
                className="w-full h-40 bg-transparent text-on-surface resize-none focus:outline-none placeholder-on-surface-variant/30 text-sm font-light mb-6"
              />
              <div className="flex justify-end border-t border-white/5 pt-6">
                <button
                  onClick={handleStudyRequest}
                  disabled={loading || !content.trim()}
                  className="flex items-center gap-2 px-8 py-3 bg-secondary text-background text-xs uppercase tracking-widest font-bold rounded-full hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></span>
                      PROCESSANDO
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      INICIAR PROTOCOLO
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result Area */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="aetheric-glass rounded-[32px] p-8 mt-12"
              >
                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                  <span className="material-symbols-outlined text-secondary">school</span>
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">Retorno Cognitivo</h3>
                </div>
                <div className="text-on-surface-variant text-sm font-light leading-relaxed whitespace-pre-wrap">
                  {result}
                </div>
              </motion.div>
            )}
          </div>
        </PageTransition>
      </main>
    </>
  );
}
