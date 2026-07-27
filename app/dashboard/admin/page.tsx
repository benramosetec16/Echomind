'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

interface RoleDist {
  label: string;
  count: number;
  color: string;
  pct: number;
}

interface Activity {
  id: string;
  action: string;
  detail: string;
  time: string;
  icon: string;
  created_at: Date;
}

export default function AdminDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    activeUsers: 0,
    activeUsersNew: 0,
    aiProcessings: 0,
    uptime: '99.9%',
    biometricLogs: 0,
  });

  const [roleDist, setRoleDist] = useState<RoleDist[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Fetch total profiles & distribution
      const { data: profiles } = await supabase.from('profiles').select('id, role, created_at');
      
      // Fetch AI operations (journal entries & biometric logs)
      const { count: journalCount } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true });
      const { count: bioCount } = await supabase.from('biometric_logs').select('*', { count: 'exact', head: true });

      // Recent Activity - Just use latest 5 profiles as new users and latest 5 biometric logs as alerts
      const { data: recentProfiles } = await supabase.from('profiles').select('id, role, created_at').order('created_at', { ascending: false }).limit(5);
      const { data: recentBio } = await supabase.from('biometric_logs').select('id, type, created_at').order('created_at', { ascending: false }).limit(5);

      if (profiles) {
        const total = profiles.length;
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const newUsers = profiles.filter(p => new Date(p.created_at) > lastWeek).length;
        
        setStats({
          activeUsers: total,
          activeUsersNew: newUsers,
          aiProcessings: (journalCount || 0) + (bioCount || 0),
          uptime: '99.9%',
          biometricLogs: bioCount || 0,
        });

        const rolesCount: Record<string, number> = {
          aluno: 0,
          professor: 0,
          orientador: 0,
          administrador: 0,
        };

        profiles.forEach(p => {
          if (rolesCount[p.role] !== undefined) rolesCount[p.role]++;
        });

        setRoleDist([
          { label: 'Alunos', count: rolesCount.aluno, color: 'bg-secondary', pct: total > 0 ? (rolesCount.aluno / total) * 100 : 0 },
          { label: 'Professores', count: rolesCount.professor, color: 'bg-primary', pct: total > 0 ? (rolesCount.professor / total) * 100 : 0 },
          { label: 'Orientadores', count: rolesCount.orientador, color: 'bg-tertiary', pct: total > 0 ? (rolesCount.orientador / total) * 100 : 0 },
          { label: 'Administradores', count: rolesCount.administrador, color: 'bg-white/40', pct: total > 0 ? (rolesCount.administrador / total) * 100 : 0 },
        ]);

        const activities: Activity[] = [];
        
        if (recentProfiles) {
          recentProfiles.forEach(p => {
            activities.push({
              id: p.id,
              action: 'Novo usuário registrado',
              detail: `Cargo: ${p.role}`,
              time: '',
              icon: 'person_add',
              created_at: new Date(p.created_at)
            });
          });
        }
        
        if (recentBio) {
          recentBio.forEach(b => {
            activities.push({
              id: b.id,
              action: 'Alerta biométrico',
              detail: `Nível: ${b.type}`,
              time: '',
              icon: 'warning',
              created_at: new Date(b.created_at)
            });
          });
        }

        activities.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        
        const finalActivities = activities.slice(0, 5).map(a => {
          const diffMins = Math.floor((now.getTime() - a.created_at.getTime()) / 60000);
          a.time = diffMins > 60 ? `há ${Math.floor(diffMins/60)}h` : `há ${diffMins} min`;
          return a;
        });
        
        setRecentActivity(finalActivities);
      }
      
      setLoading(false);
    };

    loadData();
    
    const channel = supabase.channel('admin_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_logs' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const systemStats = [
    { label: 'Usuários Totais', value: stats.activeUsers, icon: 'group', sub: `+${stats.activeUsersNew} esta semana` },
    { label: 'IA Processamentos', value: stats.aiProcessings, icon: 'psychology', sub: 'Total' },
    { label: 'Uptime do Sistema', value: stats.uptime, icon: 'cloud_done', sub: '30 dias' },
    { label: 'Registros Biom.', value: stats.biometricLogs, icon: 'database', sub: 'Total acumulado' },
  ];

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
                <span className="text-4xl font-extralight text-on-surface">{loading ? '...' : stat.value}</span>
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
                {roleDist.map((role) => (
                  <div key={role.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-on-surface-variant">{role.label}</span>
                      <span className="text-xs font-semibold text-on-surface">{loading ? '-' : role.count}</span>
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
                {loading ? (
                  <div className="text-sm text-on-surface-variant opacity-60">Carregando logs...</div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-sm text-on-surface-variant opacity-60">Nenhuma atividade recente.</div>
                ) : (
                  recentActivity.map((item, i) => (
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
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
