'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

const kpiCards = [
  { label: 'Alunos em Observação', value: '12', icon: 'visibility', color: 'text-yellow-400' },
  { label: 'Intervenções Ativas', value: '3', icon: 'support', color: 'text-secondary' },
  { label: 'Risco Elevado (7d)', value: '2', icon: 'emergency', color: 'text-red-400' },
  { label: 'Sessões Agendadas', value: '8', icon: 'calendar_month', color: 'text-secondary' },
];

const watchList = [
  { initials: 'MS', name: 'M. Santos', course: '3A – Dev', riskLevel: 'Crítico', trend: 'decline', lastCheckin: '2h atrás', mood: 34 },
  { initials: 'JP', name: 'J. Pereira', course: '2B – Design', riskLevel: 'Moderado', trend: 'stable', lastCheckin: '4h atrás', mood: 52 },
  { initials: 'AC', name: 'A. Costa', course: '1C – Gestão', riskLevel: 'Moderado', trend: 'decline', lastCheckin: '1d atrás', mood: 47 },
  { initials: 'RL', name: 'R. Lima', course: '3A – Dev', riskLevel: 'Observação', trend: 'stable', lastCheckin: '6h atrás', mood: 61 },
  { initials: 'FO', name: 'F. Oliveira', course: '2B – Design', riskLevel: 'Observação', trend: 'improve', lastCheckin: '3h atrás', mood: 68 },
];

const riskColor: Record<string, string> = {
  'Crítico': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Moderado': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Observação': 'text-secondary bg-secondary/10 border-secondary/20',
};

const trendIcon: Record<string, string> = {
  decline: 'trending_down',
  stable: 'trending_flat',
  improve: 'trending_up',
};

const trendColor: Record<string, string> = {
  decline: 'text-red-400',
  stable: 'text-on-surface-variant',
  improve: 'text-green-400',
};

export default function OrientadorDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Orientador');
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <>
      <TopBar title="Central de Orientação" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <section className="max-w-[1200px] mx-auto mb-12">
            <motion.span
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]"
            >
              Painel de Orientação
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl font-extralight leading-[1.1] text-on-surface tracking-tighter mt-1"
            >
              Olá, {userName || '...'}.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-base text-on-surface-variant max-w-xl mt-2"
            >
              Monitoramento clínico-pedagógico em tempo real. Intervir cedo é o que muda resultados.
            </motion.p>
          </section>

          {/* KPI Cards */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="aetheric-glass rounded-[24px] p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-semibold">{card.label}</span>
                  <span className={`material-symbols-outlined ${card.color} opacity-70 text-xl`}>{card.icon}</span>
                </div>
                <span className={`text-4xl font-extralight ${card.color}`}>{card.value}</span>
              </motion.div>
            ))}
          </section>

          {/* Watch List */}
          <section className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-end justify-between mb-6"
            >
              <div>
                <span className="text-xs font-semibold text-secondary/60 uppercase tracking-[0.2em] mb-1 block">Monitoramento Ativo</span>
                <h3 className="text-2xl font-light text-on-surface">Lista de Observação</h3>
              </div>
            </motion.div>
            <div className="flex flex-col gap-3">
              {watchList.map((student, i) => (
                <motion.div
                  key={student.name}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                  className="aetheric-glass rounded-[24px] p-5 grid grid-cols-2 md:grid-cols-6 gap-4 items-center hover:border-secondary/15 transition-colors"
                >
                  <div className="flex items-center gap-4 md:col-span-2">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-secondary">{student.initials}</span>
                    </div>
                    <div>
                      <p className="font-medium text-on-surface text-sm">{student.name}</p>
                      <p className="text-xs text-on-surface-variant opacity-50">{student.course}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Humor</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${student.mood}%`,
                            background: student.mood < 50 ? 'rgba(248,113,113,0.7)' : 'rgba(159,207,213,0.7)'
                          }}
                        />
                      </div>
                      <span className="text-xs text-on-surface">{student.mood}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`material-symbols-outlined text-lg ${trendColor[student.trend]}`}>
                      {trendIcon[student.trend]}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${riskColor[student.riskLevel]}`}>
                      {student.riskLevel}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-on-surface-variant opacity-40 mb-1">{student.lastCheckin}</p>
                    <button className="text-xs text-secondary hover:underline underline-offset-2 uppercase tracking-wider">Contatar</button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </PageTransition>
      </main>
    </>
  );
}
