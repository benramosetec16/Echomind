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

  const loadData = async (currentUserId: string) => {
    setLoading(true);

    // 1. Fetch Classrooms assigned to this Teacher
    const { data: myRooms } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('professor_id', currentUserId);

    const roomIds = myRooms ? myRooms.map((r) => r.id) : [];

    // 2. Fetch Students of these classrooms or directly linked
    let studentsMap = new Map();

    // Query A: Students directly assigned to this professor
    const { data: studentsDirect } = await supabase
      .from('profiles')
      .select('id, full_name, classroom_id')
      .eq('role', 'aluno')
      .eq('professor_id', currentUserId);

    if (studentsDirect) {
      studentsDirect.forEach(s => studentsMap.set(s.id, s));
    }

    // Query B: Students in the classrooms this professor manages
    if (roomIds.length > 0) {
      const { data: studentsClass } = await supabase
        .from('profiles')
        .select('id, full_name, classroom_id')
        .eq('role', 'aluno')
        .in('classroom_id', roomIds);

      if (studentsClass) {
        studentsClass.forEach(s => studentsMap.set(s.id, s));
      }
    }

    const students = Array.from(studentsMap.values());

    if (!students || students.length === 0) {
      setLoading(false);
      return;
    }

    const studentIds = students.map((s) => s.id);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // 3. Fetch Check-ins today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: checkins } = await supabase
      .from('emotional_checkins')
      .select('id, user_id, valence_value, created_at')
      .in('user_id', studentIds)
      .gte('created_at', today.toISOString());

    // 4. Fetch Alerts (Biometric logs)
    const { data: alerts } = await supabase
      .from('biometric_logs')
      .select('id, user_id, title, type, created_at')
      .in('user_id', studentIds)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    // 5. Fetch Classrooms info
    const classroomIds = [...new Set(students.map((s) => s.classroom_id).filter(Boolean))];
    let classesData: any[] = [];
    if (classroomIds.length > 0) {
      const { data: clsData } = await supabase
        .from('classrooms')
        .select('id, name')
        .in('id', classroomIds);
      if (clsData) classesData = clsData;
    }

    // Build stats per classroom
    const roomStatsMap = new Map<string, ClassroomStat>();

    classesData.forEach((c) => {
      roomStatsMap.set(c.id, {
        id: c.id,
        name: c.name,
        total: 0,
        checkins: 0,
        avgMood: 0,
        alerts: 0,
      });
    });

    const sumValenceMap = new Map<string, number>();
    const countValenceMap = new Map<string, number>();

    students.forEach((student) => {
      const cId = student.classroom_id;
      if (cId && roomStatsMap.has(cId)) {
        const item = roomStatsMap.get(cId)!;
        item.total += 1;
      }
    });

    if (checkins) {
      checkins.forEach((c) => {
        const student = studentMap.get(c.user_id);
        if (student && student.classroom_id && roomStatsMap.has(student.classroom_id)) {
          const item = roomStatsMap.get(student.classroom_id)!;
          item.checkins += 1;
          sumValenceMap.set(student.classroom_id, (sumValenceMap.get(student.classroom_id) || 0) + c.valence_value);
          countValenceMap.set(student.classroom_id, (countValenceMap.get(student.classroom_id) || 0) + 1);
        }
      });
    }

    if (alerts) {
      alerts.forEach((a) => {
        const student = studentMap.get(a.user_id);
        if (student && student.classroom_id && roomStatsMap.has(student.classroom_id)) {
          const item = roomStatsMap.get(student.classroom_id)!;
          item.alerts += 1;
        }
      });
    }

    roomStatsMap.forEach((val, key) => {
      const totalV = sumValenceMap.get(key) || 0;
      const countV = countValenceMap.get(key) || 0;
      val.avgMood = countV > 0 ? Math.round(totalV / countV) : 75;
    });

    const classroomList = Array.from(roomStatsMap.values());
    setClassrooms(classroomList);

    // Format alerts
    const formattedAlerts: AlertStat[] = (alerts || []).slice(0, 5).map((a) => {
      const student = studentMap.get(a.user_id);
      const now = new Date();
      const alertDate = new Date(a.created_at);
      const diffMins = Math.floor((now.getTime() - alertDate.getTime()) / 60000);
      const timeStr = diffMins > 60 ? `há ${Math.floor(diffMins / 60)}h` : `há ${diffMins} min`;

      return {
        id: a.id,
        student: student?.full_name || 'Aluno',
        type: a.title,
        time: timeStr,
        severity: a.type,
      };
    });
    setRecentAlerts(formattedAlerts);

    setStats({
      activeClasses: classroomList.length,
      monitoredStudents: students.length,
      pendingAlerts: alerts ? alerts.length : 0,
      checkinsToday: checkins ? checkins.length : 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;

    loadData(userId);

    const channel = supabase
      .channel('professor_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emotional_checkins' }, () => loadData(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_logs' }, () => loadData(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return (
    <>
      <TopBar title="Painel do Professor" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <header className="max-w-[1200px] mx-auto mb-12">
            <span className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]">
              Visão Pedagógica & Acompanhamento
            </span>
            <h1 className="text-5xl font-extralight tracking-tighter text-on-surface mt-1">
              Olá, Professor {userName || '...'}.
            </h1>
            <p className="text-on-surface-variant max-w-xl mt-2">
              Acompanhamento do clima emocional das suas salas em tempo real.
            </p>
          </header>

          {/* Stat Cards */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Salas Ativas</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{loading ? '...' : stats.activeClasses}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Alunos Monitorados</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{loading ? '...' : stats.monitoredStudents}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Check-ins Hoje</span>
              <h3 className="text-3xl font-light text-secondary mt-2">{loading ? '...' : stats.checkinsToday}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Alertas Ativos</span>
              <h3 className="text-3xl font-light text-yellow-400 mt-2">{loading ? '...' : stats.pendingAlerts}</h3>
            </div>
          </section>

          {/* Classrooms Grid */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <div className="aetheric-glass rounded-[28px] p-8">
              <h2 className="text-xl font-light text-on-surface mb-6">Salas Sob Sua Responsabilidade</h2>

              {loading ? (
                <div className="text-sm text-on-surface-variant opacity-60">Carregando salas...</div>
              ) : classrooms.length === 0 ? (
                <div className="text-sm text-on-surface-variant opacity-60">Nenhuma sala atribuída no momento.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {classrooms.map((room) => (
                    <div key={room.id} className="bg-surface-container/40 border border-white/5 rounded-2xl p-6">
                      <h3 className="text-lg font-medium text-on-surface mb-4">{room.name}</h3>

                      <div className="space-y-2 text-xs text-on-surface-variant">
                        <div className="flex justify-between">
                          <span>Total de Alunos:</span>
                          <strong className="text-on-surface">{room.total}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Check-ins Hoje:</span>
                          <strong className="text-secondary">{room.checkins}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Média da Valência:</span>
                          <strong className="text-on-surface">{room.avgMood}/100</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Alertas Ativos:</span>
                          <strong className={room.alerts > 0 ? 'text-red-400' : 'text-on-surface'}>{room.alerts}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Recent Alerts */}
          <section className="max-w-[1200px] mx-auto">
            <div className="aetheric-glass rounded-[28px] p-8">
              <h2 className="text-xl font-light text-on-surface mb-6">Alertas Recentes dos Seus Alunos</h2>

              {loading ? (
                <div className="text-sm text-on-surface-variant opacity-60">Carregando alertas...</div>
              ) : recentAlerts.length === 0 ? (
                <div className="text-sm text-on-surface-variant opacity-60">Nenhum alerta recente.</div>
              ) : (
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="bg-surface-container/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-on-surface">{alert.student}</h4>
                        <p className="text-xs text-on-surface-variant opacity-70">{alert.type}</p>
                      </div>
                      <span className="text-[11px] text-on-surface-variant opacity-40">{alert.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </PageTransition>
      </main>
    </>
  );
}
