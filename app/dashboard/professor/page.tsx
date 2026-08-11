'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

  // AI Report State
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const handleGenerateReport = async (classroomId: string, classroomName: string) => {
    setLoadingReportId(classroomId);
    try {
      const res = await fetch('/api/report/professor/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório.');
      }
      const data = await res.json();
      setAiReport({ ...data, classroomName });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingReportId(null);
    }
  };

  const downloadProfessorPdf = async () => {
    if (!aiReport) return;
    setDownloadingPdf(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { InstitutionalPDFReport } = await import('../../components/PDFReport');
      
      const blob = await pdf(<InstitutionalPDFReport data={aiReport} institutionName={`Turma ${aiReport.classroomName}`} title="Relatório de Inteligência - Professor" />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-echomind-professor-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

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

                      <div className="space-y-2 text-xs text-on-surface-variant mb-4">
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

                      <button
                        onClick={() => handleGenerateReport(room.id, room.name)}
                        disabled={loadingReportId === room.id || room.total === 0}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary/10 text-secondary border border-secondary/30 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-secondary/20 transition-colors disabled:opacity-50 mt-auto"
                      >
                        {loadingReportId === room.id ? (
                          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                        )}
                        {loadingReportId === room.id ? 'Analisando...' : 'Relatório IA'}
                      </button>
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

      {/* AI Report Modal */}
      <AnimatePresence>
        {aiReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAiReport(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 md:p-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-start bg-surface-container-highest/30">
                <div>
                  <span className="text-xs font-semibold text-secondary uppercase tracking-[0.2em] mb-2 block">
                    Inteligência Pedagógica EchoMind
                  </span>
                  <h3 className="text-2xl font-light text-on-surface">Relatório da {aiReport.classroomName}</h3>
                </div>
                <button
                  onClick={() => setAiReport(null)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex flex-col gap-8">
                  <div className={`p-4 rounded-xl flex items-center gap-4 ${
                    aiReport.nivel_alerta_geral === 'Crítico' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                    aiReport.nivel_alerta_geral === 'Elevado' ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' :
                    aiReport.nivel_alerta_geral === 'Moderado' ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400' :
                    'bg-green-400/10 border border-green-400/30 text-green-400'
                  }`}>
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {aiReport.nivel_alerta_geral === 'Crítico' ? 'warning' : 'info'}
                    </span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80 block mb-1">Nível de Alerta da Turma</span>
                      <span className="text-xl font-medium">{aiReport.nivel_alerta_geral}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">summarize</span> Resumo Executivo
                    </h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
                      {aiReport.resumo_executivo}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span> Pontos Positivos
                      </h4>
                      <ul className="space-y-2">
                        {aiReport.pontos_positivos?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">•</span> <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-400 text-lg">error</span> Pontos Críticos
                      </h4>
                      <ul className="space-y-2">
                        {aiReport.pontos_criticos?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span> <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-surface-variant/30 p-5 rounded-2xl border border-white/5">
                      <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-400 text-lg">visibility</span> Áreas de Atenção
                      </h4>
                      <ul className="space-y-2">
                        {aiReport.areas_atencao?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                            <span className="text-yellow-400 mt-0.5">•</span> <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-surface-variant/30 p-5 rounded-2xl border border-white/5">
                      <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">lightbulb</span> Estratégias Pedagógicas
                      </h4>
                      <ul className="space-y-2">
                        {aiReport.estrategias_institucionais?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                            <span className="text-secondary mt-0.5">•</span> <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={downloadProfessorPdf}
                      disabled={downloadingPdf}
                      className="bg-white/10 border border-white/20 text-on-surface font-semibold px-6 py-3 rounded-full text-xs uppercase tracking-wider hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {downloadingPdf ? 'sync' : 'picture_as_pdf'}
                      </span>
                      {downloadingPdf ? 'Gerando PDF...' : 'Baixar Relatório PDF'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
