'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

const stats = [
  { label: 'Turmas Ativas', value: '3', icon: 'groups', trend: null },
  { label: 'Alunos Monitorados', value: '87', icon: 'person', trend: '+2 hoje' },
  { label: 'Alertas Pendentes', value: '4', icon: 'warning', trend: 'Críticos: 1' },
  { label: 'Check-ins Hoje', value: '63', icon: 'check_circle', trend: '72% da turma' },
];

const classrooms = [
  { name: 'Turma 3A – Desenvolvimento', total: 30, checkins: 22, avgMood: 71, alerts: 1 },
  { name: 'Turma 2B – Design', total: 28, checkins: 25, avgMood: 85, alerts: 0 },
  { name: 'Turma 1C – Gestão', total: 29, checkins: 16, avgMood: 48, alerts: 3 },
];

const recentAlerts = [
  { student: 'Aluno A.', type: 'Ansiedade Elevada', time: 'há 12 min', severity: 'critical' },
  { student: 'Aluno B.', type: 'Baixo Humor Persistente', time: 'há 1h', severity: 'warning' },
  { student: 'Aluno C.', type: 'Frequência Cardíaca Alta', time: 'há 2h', severity: 'warning' },
];

export default function ProfessorDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Professor');
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <>
      <TopBar title="Painel do Professor" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <section className="max-w-[1200px] mx-auto mb-12">
            <motion.span
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]"
            >
              Visão do Professor
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
              Visão geral do estado emocional e de engajamento das suas turmas hoje.
            </motion.p>
          </section>

          {/* Stats Row */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="aetheric-glass rounded-[24px] p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-semibold">{stat.label}</span>
                  <span className="material-symbols-outlined text-secondary opacity-60 text-xl">{stat.icon}</span>
                </div>
                <span className="text-4xl font-extralight text-on-surface">{stat.value}</span>
                {stat.trend && <span className="text-[11px] text-on-surface-variant opacity-50 uppercase tracking-wider">{stat.trend}</span>}
              </motion.div>
            ))}
          </section>

          {/* Classrooms */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-2xl font-light text-on-surface mb-6">
              Minhas Turmas
            </motion.h3>
            <div className="flex flex-col gap-4">
              {classrooms.map((cls, i) => (
                <motion.div
                  key={cls.name}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                  className="aetheric-glass rounded-[24px] p-6 grid grid-cols-2 md:grid-cols-5 gap-4 items-center hover:border-secondary/20 transition-colors"
                >
                  <div className="md:col-span-2">
                    <p className="font-medium text-on-surface">{cls.name}</p>
                    <p className="text-xs text-on-surface-variant mt-1 opacity-60">{cls.checkins}/{cls.total} check-ins</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Humor Médio</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${cls.avgMood}%`, opacity: cls.avgMood < 60 ? 0.5 : 1 }} />
                      </div>
                      <span className="text-xs font-medium text-on-surface">{cls.avgMood}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Engajamento</p>
                    <span className="text-sm font-medium text-on-surface">{Math.round((cls.checkins / cls.total) * 100)}%</span>
                  </div>
                  <div className="text-center">
                    {cls.alerts > 0 ? (
                      <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-full border border-red-500/20">
                        {cls.alerts} Alerta{cls.alerts > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-wider rounded-full border border-secondary/20">
                        Normal
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Recent Alerts */}
          <section className="max-w-[1200px] mx-auto">
            <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-2xl font-light text-on-surface mb-6">
              Alertas Recentes
            </motion.h3>
            <div className="flex flex-col gap-3">
              {recentAlerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.1 }}
                  className="aetheric-glass rounded-[20px] p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]'}`} />
                    <div>
                      <p className="text-sm font-medium text-on-surface">{alert.student}</p>
                      <p className="text-xs text-on-surface-variant opacity-60">{alert.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-on-surface-variant opacity-40">{alert.time}</span>
                    <button className="text-xs text-secondary hover:underline underline-offset-2 uppercase tracking-wider">Ver</button>
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
