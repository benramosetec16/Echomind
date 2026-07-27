'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

interface WatchStudent {
  id: string;
  initials: string;
  name: string;
  course: string;
  riskLevel: 'Crítico' | 'Moderado' | 'Observação' | 'Normal';
  trend: 'decline' | 'stable' | 'improve';
  lastCheckin: string;
  mood: number;
  guardianName: string;
  guardianPhone: string;
}

const riskColor: Record<string, string> = {
  'Crítico': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Moderado': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Observação': 'text-secondary bg-secondary/10 border-secondary/20',
  'Normal': 'text-green-400 bg-green-400/10 border-green-400/20',
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
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    emObservacao: 0,
    intervencoes: 0,
    riscoElevado: 0,
    sessoes: 0,
  });

  const [watchList, setWatchList] = useState<WatchStudent[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Orientador');
        setUserId(user.id);
      }
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);

      // Fetch Orientandos
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, classroom_id, guardian_name, guardian_phone')
        .eq('orientador_id', userId);

      if (!students || students.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Fetch Classrooms
      const classroomIds = [...new Set(students.map(s => s.classroom_id).filter(Boolean))];
      let classesMap = new Map();
      if (classroomIds.length > 0) {
        const { data: clsData } = await supabase
          .from('classrooms')
          .select('id, name')
          .in('id', classroomIds);
        if (clsData) {
          clsData.forEach(c => classesMap.set(c.id, c.name));
        }
      }

      // Fetch Recent Check-ins
      const { data: checkins } = await supabase
        .from('emotional_checkins')
        .select('user_id, valence_value, created_at')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false });

      // Build watch list
      let emObservacao = 0;
      let riscoElevado = 0;

      const latestCheckinsMap = new Map();
      if (checkins) {
        checkins.forEach(c => {
          if (!latestCheckinsMap.has(c.user_id)) {
            latestCheckinsMap.set(c.user_id, c);
          }
        });
      }

      const wList: WatchStudent[] = students.map(s => {
        const initials = s.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'AL';
        const className = s.classroom_id ? classesMap.get(s.classroom_id) || 'Sem Turma' : 'Sem Turma';
        
        const lastCheckin = latestCheckinsMap.get(s.id);
        const mood = lastCheckin ? lastCheckin.valence_value : 50; // Default to neutral if no checkins

        let riskLevel: 'Crítico' | 'Moderado' | 'Observação' | 'Normal' = 'Normal';
        if (mood <= 35) riskLevel = 'Crítico';
        else if (mood <= 50) riskLevel = 'Moderado';
        else if (mood <= 65) riskLevel = 'Observação';

        if (riskLevel === 'Crítico' || riskLevel === 'Moderado') riscoElevado++;
        if (riskLevel === 'Observação') emObservacao++;

        let timeStr = 'Nenhum';
        if (lastCheckin) {
          const diffMins = Math.floor((new Date().getTime() - new Date(lastCheckin.created_at).getTime()) / 60000);
          timeStr = diffMins > 1440 ? `${Math.floor(diffMins / 1440)}d atrás` : diffMins > 60 ? `${Math.floor(diffMins / 60)}h atrás` : `${diffMins}m atrás`;
        }

        return {
          id: s.id,
          initials,
          name: s.full_name || 'Aluno',
          course: className,
          riskLevel,
          trend: mood < 40 ? 'decline' : mood > 60 ? 'improve' : 'stable',
          lastCheckin: timeStr,
          mood,
          guardianName: s.guardian_name || 'Não informado',
          guardianPhone: s.guardian_phone || 'Não informado',
        };
      });

      // Sort by risk (lowest mood first)
      wList.sort((a, b) => a.mood - b.mood);

      setWatchList(wList);
      setStats(prev => ({ ...prev, emObservacao, riscoElevado }));
      setLoading(false);
    };

    loadData();

    const channel = supabase.channel('orientador_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emotional_checkins' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const kpiCards = [
    { label: 'Alunos em Observação', value: stats.emObservacao, icon: 'visibility', color: 'text-yellow-400' },
    { label: 'Intervenções Ativas', value: stats.intervencoes, icon: 'support', color: 'text-secondary' },
    { label: 'Risco Elevado (7d)', value: stats.riscoElevado, icon: 'emergency', color: 'text-red-400' },
    { label: 'Sessões Agendadas', value: stats.sessoes, icon: 'calendar_month', color: 'text-secondary' },
  ];

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
                <span className={`text-4xl font-extralight ${card.color}`}>{loading ? '...' : card.value}</span>
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
                <h3 className="text-2xl font-light text-on-surface">Lista de Observação Global</h3>
              </div>
            </motion.div>
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="text-sm text-on-surface-variant opacity-60">Sincronizando registros aethericos...</div>
              ) : watchList.length === 0 ? (
                <div className="text-sm text-on-surface-variant opacity-60">Nenhum aluno em sua rede de monitoramento.</div>
              ) : (
                watchList.map((student, i) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                    className="aetheric-glass rounded-[24px] p-5 grid grid-cols-1 md:grid-cols-6 gap-4 items-center hover:border-secondary/15 transition-colors"
                  >
                    <div className="flex items-center gap-4 md:col-span-2">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-secondary">{student.initials}</span>
                      </div>
                      <div>
                        <p className="font-medium text-on-surface text-sm">{student.name}</p>
                        <p className="text-[10px] text-on-surface-variant opacity-50">{student.course}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Resp: {student.guardianName.split(' ')[0]}</p>
                      <p className="text-xs text-on-surface-variant opacity-60">{student.guardianPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Humor</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${student.mood}%`,
                              background: student.mood < 50 ? 'rgba(248,113,113,0.7)' : 'rgba(159,207,213,0.7)'
                            }}
                          />
                        </div>
                        <span className="text-xs text-on-surface">{student.mood}</span>
                      </div>
                    </div>
                    <div className="text-center flex justify-center gap-2">
                      <span className={`material-symbols-outlined text-lg ${trendColor[student.trend]}`}>
                        {trendIcon[student.trend]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${riskColor[student.riskLevel]}`}>
                        {student.riskLevel}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[10px] text-on-surface-variant opacity-40 mb-1">{student.lastCheckin}</p>
                      <button className="text-xs text-secondary hover:underline underline-offset-2 uppercase tracking-wider">Acionar Resp.</button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </PageTransition>
      </main>
    </>
  );
}
