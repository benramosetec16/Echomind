'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

const systemStats = [
  { label: 'Usuários Ativos', value: '312', icon: 'group', sub: '+8 esta semana' },
  { label: 'IA Processamentos', value: '1.4k', icon: 'psychology', sub: 'Últimas 24h' },
  { label: 'Uptime do Sistema', value: '99.9%', icon: 'cloud_done', sub: '30 dias' },
  { label: 'Registros Biom.', value: '28.7k', icon: 'database', sub: 'Total acumulado' },
];

const roleDistribution = [
  { label: 'Alunos', count: 282, color: 'bg-secondary', pct: 90 },
  { label: 'Professores', count: 21, color: 'bg-primary', pct: 7 },
  { label: 'Orientadores', count: 7, color: 'bg-tertiary', pct: 2 },
  { label: 'Administradores', count: 2, color: 'bg-white/40', pct: 1 },
];

const recentActivity = [
  { action: 'Novo usuário registrado', detail: 'Cargo: Professor', time: '5 min atrás', icon: 'person_add' },
  { action: 'Alerta biométrico criado', detail: 'Turma 1C – nível crítico', time: '22 min atrás', icon: 'warning' },
  { action: 'Schema do banco atualizado', detail: 'supabase/schema.sql', time: '2h atrás', icon: 'storage' },
  { action: 'Protocolo de IA disparado', detail: '47 análises em paralelo', time: '3h atrás', icon: 'psychology' },
  { action: 'Sessão encerrada automaticamente', detail: 'Ghost Mode ativo', time: '5h atrás', icon: 'logout' },
];

export default function AdminDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Admin');
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <>
      <TopBar title="Centro de Controle" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <section className="max-w-[1200px] mx-auto mb-12">
            <motion.span
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]"
            >
              Administração do Sistema
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl font-extralight leading-[1.1] text-on-surface tracking-tighter mt-1"
            >
              Centro de Controle, {userName || '...'}.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-base text-on-surface-variant max-w-xl mt-2"
            >
              Saúde operacional da plataforma, distribuição de usuários e logs de atividade em tempo real.
            </motion.p>
          </section>

          {/* System Stats */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {systemStats.map((stat, i) => (
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
                <span className="text-[11px] text-on-surface-variant opacity-50 uppercase tracking-wider">{stat.sub}</span>
              </motion.div>
            ))}
          </section>

          <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-8">
            {/* Role Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="aetheric-glass rounded-[28px] p-8"
            >
              <h3 className="text-lg font-light text-on-surface mb-6">Distribuição por Cargo</h3>
              <div className="flex flex-col gap-4">
                {roleDistribution.map((role) => (
                  <div key={role.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-on-surface-variant">{role.label}</span>
                      <span className="text-xs font-semibold text-on-surface">{role.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${role.pct}%` }}
                        transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${role.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activity Log */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              className="aetheric-glass rounded-[28px] p-8"
            >
              <h3 className="text-lg font-light text-on-surface mb-6">Log de Atividade</h3>
              <div className="flex flex-col gap-4">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-secondary text-base">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface font-medium truncate">{item.action}</p>
                      <p className="text-xs text-on-surface-variant opacity-50 truncate">{item.detail}</p>
                    </div>
                    <span className="text-[10px] text-on-surface-variant opacity-30 whitespace-nowrap">{item.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
