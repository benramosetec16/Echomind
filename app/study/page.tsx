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
  const [result, setResult] = useState<any | null>(null);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  const handleStudyRequest = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    setResult(null);
    setActiveVideo(null);
    setQuizAnswers({});
    setQuizSubmitted({});

    try {
      const res = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activeMode, content }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na requisição');
      
      setResult(data);
      if (data.videos && data.videos.length > 0) {
        setActiveVideo(data.videos[0]);
      }
    } catch (err) {
      console.error(err);
      setResult({ error: 'Ocorreu uma falha na sintonia neural. Tente novamente.' });
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
                Selecione um protocolo educacional e forneça a matéria base. A IA processará o conteúdo para otimizar a sua retenção neural, e sugerirá vídeos curados se disponíveis.
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
            {result && !result.error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8 mt-12"
              >
                {/* Meta / Tags */}
                {result.tags && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-3 py-1 bg-secondary/20 text-secondary text-xs rounded-full border border-secondary/30">{result.tags.disciplina}</span>
                    <span className="px-3 py-1 bg-white/5 text-on-surface-variant text-xs rounded-full border border-white/10">{result.tags.assunto}</span>
                    <span className="px-3 py-1 bg-white/5 text-on-surface-variant text-xs rounded-full border border-white/10">{result.tags.nivel}</span>
                  </div>
                )}

                {/* Explicação */}
                {result.explicacao && (
                  <div className="aetheric-glass rounded-[32px] p-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                      <span className="material-symbols-outlined text-secondary">school</span>
                      <h3 className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">Explicação Profunda</h3>
                    </div>
                    <div className="text-on-surface-variant text-sm font-light leading-relaxed whitespace-pre-wrap">
                      {result.explicacao}
                    </div>
                  </div>
                )}

                {/* Resumo e Conceitos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {result.resumo && (
                    <div className="aetheric-glass rounded-[32px] p-8">
                      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                        <span className="material-symbols-outlined text-secondary">compress</span>
                        <h3 className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">Resumo</h3>
                      </div>
                      <div className="text-on-surface-variant text-sm font-light leading-relaxed whitespace-pre-wrap">
                        {result.resumo}
                      </div>
                    </div>
                  )}

                  {result.conceitos && result.conceitos.length > 0 && (
                    <div className="aetheric-glass rounded-[32px] p-8">
                      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                        <span className="material-symbols-outlined text-secondary">lightbulb</span>
                        <h3 className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">Conceitos Importantes</h3>
                      </div>
                      <ul className="space-y-4">
                        {result.conceitos.map((conceito: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm font-light text-on-surface-variant">
                            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">check_circle</span>
                            <span>{conceito}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quiz Interativo */}
                {result.quiz && result.quiz.length > 0 && (
                  <div className="aetheric-glass rounded-[32px] p-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                      <span className="material-symbols-outlined text-secondary">quiz</span>
                      <h3 className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">Quiz de Fixação</h3>
                    </div>
                    <div className="space-y-8">
                      {result.quiz.map((q: any, i: number) => {
                        const isSubmitted = quizSubmitted[i];
                        const isCorrect = quizAnswers[i] === q.resposta_correta;
                        
                        return (
                          <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 relative">
                            <div className="absolute top-4 right-4 px-2 py-1 bg-white/5 rounded-md text-[10px] text-on-surface-variant font-mono uppercase">
                              Nível {q.nivel}
                            </div>
                            <h4 className="text-sm text-on-surface font-medium mb-4 pr-16 leading-relaxed">
                              {i + 1}. {q.pergunta}
                            </h4>
                            
                            <div className="space-y-2 mb-4 flex flex-col">
                              {q.opcoes.map((opcao: string, j: number) => {
                                const isSelected = quizAnswers[i] === opcao;
                                let btnClass = "w-full text-left p-4 rounded-xl text-sm font-light transition-all border ";
                                
                                if (!isSubmitted) {
                                  btnClass += isSelected 
                                    ? "bg-secondary/20 border-secondary/50 text-secondary" 
                                    : "bg-surface-container-lowest border-white/5 text-on-surface-variant hover:border-white/20 hover:bg-white/5";
                                } else {
                                  if (opcao === q.resposta_correta) {
                                    btnClass += "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
                                  } else if (isSelected && opcao !== q.resposta_correta) {
                                    btnClass += "bg-red-500/10 border-red-500/30 text-red-400";
                                  } else {
                                    btnClass += "bg-surface-container-lowest border-white/5 text-on-surface-variant/50 opacity-50";
                                  }
                                }
                                
                                return (
                                  <button
                                    key={j}
                                    disabled={isSubmitted}
                                    onClick={() => setQuizAnswers({ ...quizAnswers, [i]: opcao })}
                                    className={btnClass}
                                  >
                                    {opcao}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {!isSubmitted ? (
                              <button
                                disabled={!quizAnswers[i]}
                                onClick={() => setQuizSubmitted({ ...quizSubmitted, [i]: true })}
                                className="px-6 py-2 bg-secondary text-background text-xs font-bold uppercase tracking-widest rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary/90 transition-all"
                              >
                                Responder
                              </button>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`mt-4 p-4 rounded-xl border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-tertiary/10 border-tertiary/20'}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`material-symbols-outlined text-[18px] ${isCorrect ? 'text-emerald-400' : 'text-tertiary'}`}>
                                    {isCorrect ? 'check_circle' : 'lightbulb'}
                                  </span>
                                  <span className={`text-xs font-semibold uppercase tracking-widest ${isCorrect ? 'text-emerald-400' : 'text-tertiary'}`}>
                                    {isCorrect ? 'Correto!' : 'Resposta Incorreta'}
                                  </span>
                                </div>
                                <p className="text-sm text-on-surface-variant leading-relaxed">
                                  {q.explicacao_resposta}
                                </p>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Vídeos Curados do EchoMind */}
                {result.videos && result.videos.length > 0 && (
                  <div className="aetheric-glass rounded-[32px] p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#FF0000]">play_circle</span>
                        <h3 className="text-xs font-semibold text-on-surface uppercase tracking-[0.2em]">Biblioteca Recomendada</h3>
                      </div>
                      {result.videos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {result.videos.map((vid: any) => (
                            <button
                              key={vid.id}
                              onClick={() => setActiveVideo(vid)}
                              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                activeVideo?.id === vid.id
                                  ? 'bg-secondary text-background'
                                  : 'bg-white/5 text-on-surface hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              {vid.titulo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {activeVideo && (
                      <div className="flex flex-col gap-4">
                        <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingTop: '56.25%' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full border-0"
                            src={`https://www.youtube.com/embed/${activeVideo.video_id}?autoplay=0&rel=0`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-on-surface mb-1">{activeVideo.titulo}</h4>
                          <p className="text-sm text-on-surface-variant/70">
                            {activeVideo.canal && <span className="mr-3">{activeVideo.canal}</span>}
                            {activeVideo.duracao > 0 && <span>{Math.floor(activeVideo.duracao / 60)} min</span>}
                          </p>
                          {activeVideo.descricao && (
                            <p className="mt-4 text-sm text-on-surface-variant font-light whitespace-pre-wrap line-clamp-3 hover:line-clamp-none transition-all">
                              {activeVideo.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {result && result.error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="aetheric-glass rounded-[32px] p-8 mt-12 bg-red-500/10 border-red-500/20"
              >
                <div className="text-red-400 text-sm font-light text-center">
                  {result.error}
                </div>
              </motion.div>
            )}

          </div>
        </PageTransition>
      </main>
    </>
  );
}
