'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

interface ClassroomStat {
  id: string;
  name: string;
  total: number;
  checkins: number;
  avgMood: number;
  alerts: number;
}

interface AlertStat {
  id: string;
  student: string;
  type: string;
  time: string;
  severity: string;
}

export default function ProfessorDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    activeClasses: 0,
    monitoredStudents: 0,
    pendingAlerts: 0,
    checkinsToday: 0,
  });
  const [classrooms, setClassrooms] = useState<ClassroomStat[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertStat[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Professor');
        setUserId(user.id);
      }
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      
      // 1. Fetch Students
      const { data: students, error: studentsErr } = await supabase
        .from('profiles')
        .select('id, full_name, classroom_id')
        .eq('professor_id', userId);
        
      if (studentsErr || !students) {
        console.error(studentsErr);
        setLoading(false);
        return;
      }
      
      const studentIds = students.map(s => s.id);
      const studentMap = new Map(students.map(s => [s.id, s]));
      
      // 2. Fetch Check-ins today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: checkins } = await supabase
        .from('emotional_checkins')
        .select('id, user_id, valence_value, created_at')
        .in('user_id', studentIds)
        .gte('created_at', today.toISOString());

      // 3. Fetch Alerts (Biometric logs) today or recent pending
      const { data: alerts } = await supabase
        .from('biometric_logs')
        .select('id, user_id, title, type, created_at')
        .in('user_id', studentIds)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      // 4. Fetch Classrooms info
      const classroomIds = [...new Set(students.map(s => s.classroom_id).filter(Boolean))];
      let classesData: any[] = [];
      if (classroomIds.length > 0) {
        const { data: clsData } = await supabase
          .from('classrooms')
          .select('id, name')
          .in('id', classroomIds);
        if (clsData) classesData = clsData;
      }

      // Compute stats
      const activeClasses = classroomIds.length;
      const monitoredStudents = students.length;
      const pendingAlerts = alerts?.length || 0;
      const checkinsToday = checkins?.length || 0;

      setStats({
        activeClasses,
        monitoredStudents,
        pendingAlerts,
        checkinsToday,
      });

      // Compute Classroom stats
      const clsStats: ClassroomStat[] = classesData.map(cls => {
        const clsStudents = students.filter(s => s.classroom_id === cls.id);
        const clsStudentIds = clsStudents.map(s => s.id);
        
        const clsCheckins = checkins?.filter(c => clsStudentIds.includes(c.user_id)) || [];
        const clsAlerts = alerts?.filter(a => clsStudentIds.includes(a.user_id)) || [];
        
        let avgMood = 0;
        if (clsCheckins.length > 0) {
          const sum = clsCheckins.reduce((acc, curr) => acc + curr.valence_value, 0);
          avgMood = Math.round(sum / clsCheckins.length);
        }

        return {
          id: cls.id,
          name: cls.name,
          total: clsStudents.length,
          checkins: clsCheckins.length,
          avgMood,
          alerts: clsAlerts.length,
        };
      });
      setClassrooms(clsStats);

      // Compute Recent Alerts
      const rAlerts: AlertStat[] = (alerts || []).slice(0, 5).map(a => {
        const date = new Date(a.created_at);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeStr = `há ${diffMins} min`;
        if (diffMins > 60) timeStr = `há ${Math.floor(diffMins / 60)}h`;

        return {
          id: a.id,
          student: studentMap.get(a.user_id)?.full_name || 'Aluno',
          type: a.title,
          time: timeStr,
          severity: a.type === 'critical' ? 'critical' : 'warning',
        };
      });
      setRecentAlerts(rAlerts);

      setLoading(false);
    };

    loadData();

    // Realtime subscriptions
    const channel = supabase.channel('professor_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emotional_checkins' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_logs' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const statCards = [
    { label: 'Turmas Ativas', value: stats.activeClasses, icon: 'groups' },
    { label: 'Alunos Monitorados', value: stats.monitoredStudents, icon: 'person' },
    { label: 'Alertas Pendentes', value: stats.pendingAlerts, icon: 'warning' },
    { label: 'Check-ins Hoje', value: stats.checkinsToday, icon: 'check_circle' },
  ];

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
              Visão geral do estado emocional e de engajamento das suas turmas em tempo real.
            </motion.p>
          </section>

          {/* Stats Row */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="aetheric-glass rounded-[24px] p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-semibold">{stat.label}</span>
                  <span className="material-symbols-outlined text-secondary opacity-60 text-xl">{stat.icon}</span>
                </div>
                <span className="text-4xl font-extralight text-on-surface">
                  {loading ? '...' : stat.value}
                </span>
              </motion.div>
            ))}
          </section>

          {/* Classrooms */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-2xl font-light text-on-surface mb-6">
              Minhas Turmas
            </motion.h3>
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="text-sm text-on-surface-variant opacity-60">Sincronizando ambiente...</div>
              ) : classrooms.length === 0 ? (
                <div className="text-sm text-on-surface-variant opacity-60">Nenhuma turma registrada.</div>
              ) : (
                classrooms.map((cls, i) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                    className="aetheric-glass rounded-[24px] p-6 grid grid-cols-2 md:grid-cols-5 gap-4 items-center hover:border-secondary/20 transition-colors"
                  >
                    <div className="md:col-span-2">
                      <p className="font-medium text-on-surface">{cls.name}</p>
                      <p className="text-xs text-on-surface-variant mt-1 opacity-60">{cls.checkins}/{cls.total} check-ins hoje</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Humor Médio</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full transition-all duration-1000" style={{ width: `${cls.avgMood}%`, opacity: cls.avgMood < 60 ? 0.5 : 1 }} />
                        </div>
                        <span className="text-xs font-medium text-on-surface">{cls.avgMood}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Engajamento</p>
                      <span className="text-sm font-medium text-on-surface">{cls.total > 0 ? Math.round((cls.checkins / cls.total) * 100) : 0}%</span>
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
                ))
              )}
            </div>
          </section>

          {/* Recent Alerts */}
          <section className="max-w-[1200px] mx-auto">
            <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-2xl font-light text-on-surface mb-6">
              Alertas Recentes
            </motion.h3>
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="text-sm text-on-surface-variant opacity-60">Analisando sinapses...</div>
              ) : recentAlerts.length === 0 ? (
                <div className="text-sm text-on-surface-variant opacity-60">Nenhuma irregularidade detectada.</div>
              ) : (
                recentAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
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
                      <button className="text-xs text-secondary hover:underline underline-offset-2 uppercase tracking-wider">Avaliar</button>
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
