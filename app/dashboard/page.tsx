'use client';

import { motion } from 'framer-motion';
import TopBar from '../components/TopBar';
import PageTransition from '../components/PageTransition';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Viajante');
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <>
      <TopBar title="Atmosfera" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          {/* Hero Section */}
          <section className="max-w-[1200px] mx-auto mb-16">
            <div className="flex flex-col gap-2">
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]"
              >
                Sistema Inicializado
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-6xl font-extralight leading-[1.1] text-on-surface tracking-tighter"
              >
                Bem-vindo, {userName || '...'}.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base text-on-surface-variant max-w-xl"
              >
                Seu ecossistema emocional está ressoando em frequências ideais. Prioridade de hoje: manter foco profundo durante janelas cognitivas de alta intensidade.
              </motion.p>
            </div>
          </section>

          {/* Metrics Bento Grid */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
            {/* Vibe Pulse */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="md:col-span-4 aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Pulso da Vibe</span>
                  <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">vital_signs</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight text-on-surface">92</span>
                  <span className="text-sm text-on-surface-variant opacity-40">/100</span>
                </div>
              </div>
              <div className="mt-8 h-20 flex items-end gap-1">
                <div className="flex-1 bg-secondary/10 h-1/2 rounded-t-sm group-hover:h-3/4 transition-all duration-1000 ease-in-out"></div>
                <div className="flex-1 bg-secondary/10 h-2/3 rounded-t-sm group-hover:h-1/2 transition-all duration-1000 ease-in-out delay-100"></div>
                <div className="flex-1 bg-secondary/20 h-3/4 rounded-t-sm group-hover:h-full transition-all duration-1000 ease-in-out delay-200"></div>
                <div className="flex-1 bg-secondary/10 h-1/3 rounded-t-sm group-hover:h-2/3 transition-all duration-1000 ease-in-out delay-300"></div>
                <div className="flex-1 bg-secondary/10 h-1/2 rounded-t-sm group-hover:h-1/3 transition-all duration-1000 ease-in-out delay-400"></div>
              </div>
            </motion.div>

            {/* Mind Minutes */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="md:col-span-4 aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Minutos Focados</span>
                  <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">timer</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight text-on-surface">42</span>
                  <span className="text-sm text-on-surface-variant opacity-40">Hoje</span>
                </div>
              </div>
              <div className="mt-8 relative h-20 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-dashed border-secondary/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                </div>
                <div className="w-12 h-12 rounded-full border border-secondary/40 flex items-center justify-center">
                  <div className="w-1 h-1 bg-secondary rounded-full aether-glow"></div>
                </div>
              </div>
            </motion.div>

            {/* Rest Quality */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="md:col-span-4 aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Qualidade do Descanso</span>
                  <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">bedtime</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight text-on-surface">Profundo</span>
                  <span className="text-sm text-on-surface-variant opacity-40">8.2h</span>
                </div>
              </div>
              <div className="mt-8">
                <div className="w-full h-[1px] bg-white/10 relative">
                  <div className="absolute top-0 left-0 h-full w-4/5 bg-secondary aether-glow"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-semibold uppercase tracking-widest opacity-30">
                  <span>Recuperação</span>
                  <span>80%</span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Active Protocols Section */}
          <section className="max-w-[1200px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex justify-between items-end mb-10"
            >
              <div>
                <span className="text-xs font-semibold text-secondary/60 uppercase tracking-[0.2em] mb-2 block">Inteligência em Andamento</span>
                <h3 className="text-3xl font-normal text-on-surface">Protocolos Ativos</h3>
              </div>
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors"
              >
                CONFIGURAR <span className="material-symbols-outlined text-[16px]">settings</span>
              </button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Protocol Card 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="group cursor-pointer"
              >
                <div className="aetheric-glass rounded-[40px] p-8 flex gap-8 items-center transition-all duration-500 group-hover:bg-white/[0.04]">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden bg-surface-container flex-shrink-0 border border-white/5 grayscale group-hover:grayscale-0 transition-all duration-1000 relative">
                    <img src="/protocol_synapse.png" alt="Clareza Sináptica" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent"></div>
                  </div>

                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-medium text-on-surface">Clareza Sináptica</h4>
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full border border-secondary/20">ATIVO</span>
                    </div>
                    <p className="text-sm text-on-surface-variant opacity-70 mb-6">Supressão de fundo neural engajada para maximizar o rendimento do trabalho profundo.</p>
                    <div className="mt-auto flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full border border-background bg-surface-bright"></div>
                        <div className="w-6 h-6 rounded-full border border-background bg-surface-container-high"></div>
                      </div>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-40">2 Sub-Processos</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Protocol Card 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="group cursor-pointer"
              >
                <div className="aetheric-glass rounded-[40px] p-8 flex gap-8 items-center transition-all duration-500 group-hover:bg-white/[0.04]">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden bg-surface-container flex-shrink-0 border border-white/5 grayscale group-hover:grayscale-0 transition-all duration-1000 relative">
                    <img src="/protocol_resonance.png" alt="Mudança de Ressonância" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-br from-tertiary/20 to-transparent"></div>
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-medium text-on-surface">Mudança de Ressonância</h4>
                      <span className="px-3 py-1 bg-surface-variant text-on-surface-variant text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full border border-white/10">ESPERA</span>
                    </div>
                    <p className="text-sm text-on-surface-variant opacity-70 mb-6">Ajuste de humor ambiente programado para fase de pôr do sol circadiano.</p>
                    <div className="mt-auto flex items-center gap-4">
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-40">Programado para as 19:30</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </PageTransition>
      </main>
    </>
  );
}
