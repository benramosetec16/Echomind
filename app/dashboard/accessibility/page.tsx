
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { useAccessibility } from '@/components/AccessibilityProvider';

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
        <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <TopBar title="Preferências de Acessibilidade" />
        <main className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
          
          <div className="bg-surface/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">visibility</span>
              Configurações Visuais
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Alto Contraste</h3>
                  <p className="text-sm text-on-surface/60">Aumenta o contraste das cores para facilitar a leitura</p>
                </div>
                <button 
                  onClick={() => handleToggle('high_contrast')}
                  className={"w-12 h-6 rounded-full transition-colors relative "}
                >
                  <motion.div 
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                    animate={{ left: preferences.high_contrast ? '26px' : '2px' }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Redução de Movimento</h3>
                  <p className="text-sm text-on-surface/60">Desativa animações não essenciais na interface</p>
                </div>
                <button 
                  onClick={() => handleToggle('reduced_motion')}
                  className={"w-12 h-6 rounded-full transition-colors relative "}
                >
                  <motion.div 
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                    animate={{ left: preferences.reduced_motion ? '26px' : '2px' }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Interface Simplificada</h3>
                  <p className="text-sm text-on-surface/60">Remove elementos decorativos para menor estímulo visual</p>
                </div>
                <button 
                  onClick={() => handleToggle('simplified_interface')}
                  className={"w-12 h-6 rounded-full transition-colors relative "}
                >
                  <motion.div 
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                    animate={{ left: preferences.simplified_interface ? '26px' : '2px' }}
                  />
                </button>
              </div>

              <div>
                <h3 className="font-medium mb-2">Tamanho da Fonte</h3>
                <div className="flex gap-4">
                  {['small', 'medium', 'large', 'x-large'].map(size => (
                    <button 
                      key={size}
                      onClick={() => handleChange('font_size', size)}
                      className={"px-4 py-2 rounded-xl border "}
                    >
                      {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : size === 'large' ? 'Grande' : 'Muito Grande'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">psychology</span>
              Apoio aos Estudos & IA
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Estilo de Explicação (Apoio aos Estudos)</h3>
                <p className="text-sm text-on-surface/60 mb-4">Como a inteligência deve organizar os conteúdos para você.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { val: 'standard', label: 'Padrão' },
                    { val: 'detailed', label: 'Detalhada' },
                    { val: 'step_by_step', label: 'Passo a Passo' },
                    { val: 'simplified', label: 'Simplificada (Resumo)' }
                  ].map(style => (
                    <button 
                      key={style.val}
                      onClick={() => handleChange('study_explanation_style', style.val)}
                      className={"px-4 py-3 rounded-xl border text-left "}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Estilo de Resposta (Mensagens)</h3>
                <p className="text-sm text-on-surface/60 mb-4">Como a IA deve conversar com você em interações gerais.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { val: 'standard', label: 'Padrão' },
                    { val: 'objective', label: 'Objetiva e Direta' },
                    { val: 'detailed', label: 'Explicativa e Detalhada' }
                  ].map(style => (
                    <button 
                      key={style.val}
                      onClick={() => handleChange('response_style', style.val)}
                      className={"px-4 py-3 rounded-xl border text-center "}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {saving && (
            <p className="text-center text-sm text-on-surface/50 animate-pulse">Salvando preferências...</p>
          )}

        </main>
      </div>
    </PageTransition>
  );
}
