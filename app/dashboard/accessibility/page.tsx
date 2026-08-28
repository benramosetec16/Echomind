'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { useAccessibility } from '@/components/AccessibilityProvider';

// Toggle switch with visual on/off state
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? 'bg-secondary' : 'bg-white/10'
      }`}
    >
      <motion.div
        className={`w-5 h-5 rounded-full absolute top-0.5 shadow transition-colors duration-300 ${
          checked ? 'bg-on-secondary' : 'bg-white/60'
        }`}
        animate={{ left: checked ? '26px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function AccessibilityPage() {
  const { preferences, updatePreferences, isLoading } = useAccessibility();
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: keyof typeof preferences) => {
    setSaving(true);
    await updatePreferences({ [key]: !preferences[key] });
    setSaving(false);
  };

  const handleChange = async (key: keyof typeof preferences, value: string) => {
    setSaving(true);
    await updatePreferences({ [key]: value });
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary">refresh</span>
      </div>
    );
  }

  const fontSizes = [
    { val: 'small', label: 'Pequena', size: 'text-xs' },
    { val: 'medium', label: 'Média', size: 'text-sm' },
    { val: 'large', label: 'Grande', size: 'text-base' },
    { val: 'x-large', label: 'Muito Grande', size: 'text-lg' },
  ];

  const studyStyles = [
    {
      val: 'standard',
      label: 'Padrão',
      icon: 'auto_awesome',
      desc: 'Explicação equilibrada com conceitos e exemplos.',
    },
    {
      val: 'detailed',
      label: 'Detalhada',
      icon: 'library_books',
      desc: 'Rica em contexto, explora pormenores e aprofunda cada conceito.',
    },
    {
      val: 'step_by_step',
      label: 'Passo a Passo',
      icon: 'format_list_numbered',
      desc: 'Conteúdo dividido em passos numerados, um conceito por vez.',
    },
    {
      val: 'simplified',
      label: 'Simplificada',
      icon: 'compress',
      desc: 'Direto ao ponto, sem jargões. Foco na essência para compreensão rápida.',
    },
  ];

  const responseStyles = [
    {
      val: 'standard',
      label: 'Padrão',
      icon: 'chat',
      desc: 'Respostas equilibradas da IA.',
    },
    {
      val: 'objective',
      label: 'Objetiva e Direta',
      icon: 'flash_on',
      desc: 'Sem rodeios. A IA vai direto ao ponto.',
    },
    {
      val: 'detailed',
      label: 'Explicativa',
      icon: 'psychology',
      desc: 'Mais empatia e contexto em cada resposta.',
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <TopBar title="Acessibilidade" />
        <main className="pt-24 px-6 max-w-4xl mx-auto space-y-6">

          {/* Visual Settings */}
          <section className="bg-surface/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-secondary text-xl">visibility</span>
              Configurações Visuais
            </h2>
            <p className="text-xs text-on-surface-variant opacity-50 mb-6">
              Essas configurações são aplicadas em toda a plataforma e salvas automaticamente.
            </p>

            <div className="space-y-5">
              {/* High Contrast */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-on-surface">Alto Contraste</h3>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">
                    Aumenta o contraste das cores para facilitar a leitura
                  </p>
                </div>
                <Toggle checked={preferences.high_contrast} onChange={() => handleToggle('high_contrast')} />
              </div>

              <div className="h-px bg-white/5" />

              {/* Reduced Motion */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-on-surface">Redução de Movimento</h3>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">
                    Desativa animações não essenciais na interface
                  </p>
                </div>
                <Toggle checked={preferences.reduced_motion} onChange={() => handleToggle('reduced_motion')} />
              </div>

              <div className="h-px bg-white/5" />

              {/* Simplified Interface */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-on-surface">Interface Simplificada</h3>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">
                    Remove efeitos de vidro, brilhos e elementos decorativos
                  </p>
                </div>
                <Toggle
                  checked={preferences.simplified_interface}
                  onChange={() => handleToggle('simplified_interface')}
                />
              </div>

              <div className="h-px bg-white/5" />

              {/* Font Size */}
              <div>
                <h3 className="text-sm font-medium text-on-surface mb-3">Tamanho da Fonte</h3>
                <div className="flex flex-wrap gap-2">
                  {fontSizes.map((fs) => {
                    const isActive = preferences.font_size === fs.val;
                    return (
                      <button
                        key={fs.val}
                        onClick={() => handleChange('font_size', fs.val)}
                        className={`px-4 py-2 rounded-xl border text-sm transition-all duration-200 ${
                          isActive
                            ? 'border-secondary/60 bg-secondary/10 text-secondary font-semibold'
                            : 'border-white/10 text-on-surface-variant opacity-50 hover:opacity-80 hover:border-white/20'
                        }`}
                      >
                        <span className={fs.size}>{fs.label}</span>
                        {isActive && (
                          <span className="ml-2 text-[10px] uppercase tracking-widest opacity-60">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Study AI Settings */}
          <section className="bg-surface/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-secondary text-xl">school</span>
              Apoio aos Estudos
            </h2>
            <p className="text-xs text-on-surface-variant opacity-50 mb-6">
              Como a IA deve organizar e apresentar o conteúdo quando você estudar.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {studyStyles.map((style) => {
                const isActive = preferences.study_explanation_style === style.val;
                return (
                  <button
                    key={style.val}
                    onClick={() => handleChange('study_explanation_style', style.val)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 group ${
                      isActive
                        ? 'border-secondary/50 bg-secondary/8 shadow-[0_0_20px_rgba(159,207,213,0.06)]'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-base transition-colors ${
                            isActive ? 'text-secondary' : 'text-on-surface-variant opacity-40'
                          }`}
                        >
                          {style.icon}
                        </span>
                        <span
                          className={`text-sm font-medium transition-colors ${
                            isActive ? 'text-secondary' : 'text-on-surface opacity-60'
                          }`}
                        >
                          {style.label}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary opacity-70">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs leading-relaxed transition-colors ${
                        isActive ? 'text-on-surface opacity-60' : 'text-on-surface-variant opacity-35'
                      }`}
                    >
                      {style.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Response Style */}
          <section className="bg-surface/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-secondary text-xl">psychology</span>
              Estilo de Resposta da IA
            </h2>
            <p className="text-xs text-on-surface-variant opacity-50 mb-6">
              Como a IA deve se comunicar com você na análise emocional e interações gerais.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {responseStyles.map((style) => {
                const isActive = preferences.response_style === style.val;
                return (
                  <button
                    key={style.val}
                    onClick={() => handleChange('response_style', style.val)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                      isActive
                        ? 'border-secondary/50 bg-secondary/8'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            isActive ? 'text-secondary' : 'text-on-surface-variant opacity-40'
                          }`}
                        >
                          {style.icon}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isActive ? 'text-secondary' : 'text-on-surface opacity-60'
                          }`}
                        >
                          {style.label}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary opacity-70">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        isActive ? 'text-on-surface opacity-60' : 'text-on-surface-variant opacity-35'
                      }`}
                    >
                      {style.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Check-in Settings */}
          <section className="bg-surface/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-secondary text-xl">mood</span>
              Estilo do Check-in
            </h2>
            <p className="text-xs text-on-surface-variant opacity-50 mb-6">
              Como você prefere responder como está se sentindo?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  val: 'standard',
                  label: 'Deslizante (Padrão)',
                  icon: 'linear_scale',
                  desc: 'Utiliza uma barra deslizante para selecionar o nível da emoção.',
                },
                {
                  val: 'visual',
                  label: 'Seleção Visual',
                  icon: 'sentiment_satisfied',
                  desc: 'Apresenta botões com rostos e palavras diretas (ex: Infeliz, Neutro, Sereno).',
                },
              ].map((style) => {
                const isActive = preferences.checkin_style === style.val;
                return (
                  <button
                    key={style.val}
                    onClick={() => handleChange('checkin_style', style.val)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                      isActive
                        ? 'border-secondary/50 bg-secondary/8'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            isActive ? 'text-secondary' : 'text-on-surface-variant opacity-40'
                          }`}
                        >
                          {style.icon}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isActive ? 'text-secondary' : 'text-on-surface opacity-60'
                          }`}
                        >
                          {style.label}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary opacity-70">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        isActive ? 'text-on-surface opacity-60' : 'text-on-surface-variant opacity-35'
                      }`}
                    >
                      {style.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Libras Section */}
          <section className="bg-surface/50 border border-secondary/10 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-xl">sign_language</span>
              Libras — Recurso Experimental
            </h2>
            <p className="text-xs text-on-surface-variant opacity-50 mb-6">
              Reconhecimento de sinais por câmera para interagir com o EchoMind em Libras.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/5 border border-secondary/15">
                <span className="material-symbols-outlined text-secondary text-lg mt-0.5 shrink-0">videocam</span>
                <div>
                  <h3 className="text-sm font-medium text-on-surface mb-1">Como usar</h3>
                  <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">
                    No check-in, abaixo do campo de texto, clique em{' '}
                    <strong className="text-secondary/80">Usar Libras</strong>. A câmera será ativada para
                    capturar seu sinal. O resultado sempre será apresentado para sua confirmação antes de ser
                    registrado.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/3 border border-white/8">
                <span className="material-symbols-outlined text-on-surface-variant text-lg mt-0.5 shrink-0">
                  lock
                </span>
                <div>
                  <h3 className="text-sm font-medium text-on-surface mb-1">Privacidade</h3>
                  <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">
                    A câmera é ativada somente quando você escolher usar o recurso. Os frames capturados são
                    descartados após o reconhecimento e nunca são armazenados permanentemente.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Save indicator */}
          {saving && (
            <p className="text-center text-xs text-secondary opacity-60 animate-pulse pb-4">
              Salvando preferências...
            </p>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
// cache bust  
// cache bust 2  
