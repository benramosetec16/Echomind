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
  riskLevel: 'Crítico' | 'Moderado' | 'Observação' | 'Baixo';
  trend: 'decline' | 'stable' | 'improve';
  lastCheckin: string;
  moodAvg: number;
  energyAvg: number;
  checkinCount: number;
  guardianName: string;
  guardianPhone: string;
}

interface Intervention {
  id: string;
  student_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

const riskColor: Record<string, string> = {
  'Crítico': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Moderado': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Elevado': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Observação': 'text-secondary bg-secondary/10 border-secondary/20',
  'Baixo': 'text-green-400 bg-green-400/10 border-green-400/20',
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
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  
  // New intervention form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [intervTitle, setIntervTitle] = useState('');
  const [intervDesc, setIntervDesc] = useState('');
  const [submittingInterv, setSubmittingInterv] = useState(false);

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

  const loadData = async (currentUserId: string) => {
    setLoading(true);

    // 1. Fetch classrooms assigned to this Orientador
    const { data: myRooms } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('orientador_id', currentUserId);

    const roomIds = myRooms ? myRooms.map((r) => r.id) : [];

    // 2. Fetch Orientandos (linked directly or via assigned classrooms)
    let studentsQuery = supabase
      .from('profiles')
      .select('id, full_name, classroom_id, guardian_name, guardian_phone')
      .eq('role', 'aluno');

    if (roomIds.length > 0) {
      studentsQuery = studentsQuery.or(`orientador_id.eq.${currentUserId},classroom_id.in.(${roomIds.join(',')})`);
    } else {
      studentsQuery = studentsQuery.eq('orientador_id', currentUserId);
    }

    const { data: students } = await studentsQuery;

    if (!students || students.length === 0) {
      setWatchList([]);
      setLoading(false);
      return;
    }

    const studentIds = students.map((s) => s.id);

    // Map Classrooms
    const classroomIds = [...new Set(students.map((s) => s.classroom_id).filter(Boolean))];
    let classesMap = new Map();
    if (classroomIds.length > 0) {
      const { data: clsData } = await supabase
        .from('classrooms')
        .select('id, name')
        .in('id', classroomIds);
      if (clsData) {
        clsData.forEach((c) => classesMap.set(c.id, c.name));
      }
    }

    // Fetch Recent Check-ins for these students
    const { data: checkins } = await supabase
      .from('emotional_checkins')
      .select('user_id, valence_value, created_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false });

    // Fetch biometrics for energy
    const { data: biometrics } = await supabase
      .from('biometrics')
      .select('user_id, energy_level, created_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false });

    // Fetch Interventions
    const { data: intervData } = await supabase
      .from('interventions')
      .select('*')
      .eq('orientador_id', currentUserId)
      .order('created_at', { ascending: false });

    if (intervData) setInterventions(intervData);

    // Fetch Session Requests
    const { count: sessionRequestsCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', currentUserId)
      .eq('type', 'session_request');

    const formattedStudents: WatchStudent[] = students.map((student) => {
      const userCheckins = checkins ? checkins.filter((c) => c.user_id === student.id) : [];
      const userBiometrics = biometrics ? biometrics.filter((b) => b.user_id === student.id) : [];

      let riskLevel: 'Crítico' | 'Moderado' | 'Observação' | 'Baixo' = 'Baixo';
      let trend: 'decline' | 'stable' | 'improve' = 'stable';
      let lastCheckinStr = 'Sem registros';
      let moodAvg = 0;
      let energyAvg = 0;

      if (userCheckins.length > 0) {
        const lastDate = new Date(userCheckins[0].created_at);
        lastCheckinStr = `${lastDate.toLocaleDateString('pt-BR')} ${lastDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        moodAvg = Math.round(userCheckins.reduce((acc, c) => acc + c.valence_value, 0) / userCheckins.length);
        
        if (moodAvg < 30 && userCheckins.length >= 3) riskLevel = 'Crítico';
        else if (moodAvg < 50) riskLevel = 'Moderado';
        else if (moodAvg < 70) riskLevel = 'Observação';

        if (userCheckins.length > 1) {
          const latestValence = userCheckins[0].valence_value;
          const prevValence = userCheckins[1].valence_value;
          if (latestValence < prevValence - 10) trend = 'decline';
          else if (latestValence > prevValence + 10) trend = 'improve';
        }
      }

      if (userBiometrics.length > 0) {
        energyAvg = Math.round(userBiometrics.reduce((acc, b) => acc + (b.energy_level || 50), 0) / userBiometrics.length);
      }

      const nameParts = (student.full_name || 'Aluno').split(' ');
      const initials = nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[1][0]}` : nameParts[0].substring(0, 2);

      return {
        id: student.id,
        initials: initials.toUpperCase(),
        name: student.full_name || 'Aluno Sem Nome',
        course: classesMap.get(student.classroom_id) || 'Sala Não Informada',
        riskLevel,
        trend,
        lastCheckin: lastCheckinStr,
        moodAvg,
        energyAvg,
        checkinCount: userCheckins.length + userBiometrics.length,
        guardianName: student.guardian_name || 'Não informado',
        guardianPhone: student.guardian_phone || 'Não informado',
      };
    });

    setWatchList(formattedStudents);

    setStats({
      emObservacao: formattedStudents.length,
      intervencoes: intervData ? intervData.length : 0,
      riscoElevado: formattedStudents.filter((s) => s.riskLevel === 'Crítico' || s.riskLevel === 'Moderado').length,
      sessoes: sessionRequestsCount || 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;

    loadData(userId);

    const channel = supabase
      .channel('orientador_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emotional_checkins' }, () => loadData(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interventions' }, () => loadData(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadData(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedStudentId || !intervTitle.trim() || !intervDesc.trim()) return;

    setSubmittingInterv(true);

    const { data: studentProf } = await supabase
      .from('profiles')
      .select('institution_id, classroom_id')
      .eq('id', selectedStudentId)
      .single();

    const { error } = await supabase.from('interventions').insert({
      orientador_id: userId,
      student_id: selectedStudentId,
      institution_id: studentProf?.institution_id,
      classroom_id: studentProf?.classroom_id,
      title: intervTitle.trim(),
      description: intervDesc.trim(),
      status: 'pendente',
    });

    if (error) {
      alert('Erro ao registrar intervenção: ' + error.message);
    } else {
      setIntervTitle('');
      setIntervDesc('');
      setSelectedStudentId('');
      loadData(userId);
    }

    setSubmittingInterv(false);
  };

  return (
    <>
      <TopBar title="Painel do Orientador" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <header className="max-w-[1200px] mx-auto mb-12">
            <span className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]">
              Acompanhamento Emocional & Orientação
            </span>
            <h1 className="text-5xl font-extralight tracking-tighter text-on-surface mt-1">
              Olá, Orientador {userName || '...'}.
            </h1>
            <p className="text-on-surface-variant max-w-xl mt-2">
              Alunos sob sua orientação, solicitações de apoio e registro de intervenções em tempo real.
            </p>
          </header>

          {/* Quick Metrics */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Alunos Vinculados</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{loading ? '...' : stats.emObservacao}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Alertas de Risco</span>
              <h3 className="text-3xl font-light text-red-400 mt-2">{loading ? '...' : stats.riscoElevado}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Intervenções</span>
              <h3 className="text-3xl font-light text-secondary mt-2">{loading ? '...' : stats.intervencoes}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Pedidos de Sessão</span>
              <h3 className="text-3xl font-light text-yellow-400 mt-2">{loading ? '...' : stats.sessoes}</h3>
            </div>
          </section>

          {/* Intervention Creator */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <div className="aetheric-glass rounded-[28px] p-8">
              <h2 className="text-xl font-light text-on-surface mb-4">Registrar Nova Intervenção</h2>
              <form onSubmit={handleCreateIntervention} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                >
                  <option value="">Selecione o Aluno...</option>
                  {watchList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-surface text-on-surface">
                      {s.name} ({s.course})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={intervTitle}
                  onChange={(e) => setIntervTitle(e.target.value)}
                  placeholder="Título da Intervenção (Ex: Escuta Ativa)"
                  required
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                />
                <input
                  type="text"
                  value={intervDesc}
                  onChange={(e) => setIntervDesc(e.target.value)}
                  placeholder="Detalhamento / Ações combinadas"
                  required
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                />
                <button
                  type="submit"
                  disabled={submittingInterv}
                  className="bg-secondary text-background font-semibold rounded-2xl text-xs uppercase tracking-wider hover:bg-secondary-bright transition-colors disabled:opacity-50"
                >
                  {submittingInterv ? 'Registrando...' : 'Salvar Intervenção'}
                </button>
              </form>
            </div>
          </section>

          {/* Student Watchlist */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <div className="aetheric-glass rounded-[28px] p-8">
              <h2 className="text-xl font-light text-on-surface mb-6">Lista de Observação Emocional</h2>

              {loading ? (
                <div className="text-sm text-on-surface-variant opacity-60">Sincronizando frequências...</div>
              ) : watchList.length === 0 ? (
                <div className="text-sm text-on-surface-variant opacity-60">Nenhum aluno sob sua responsabilidade ainda.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {watchList.map((student) => (
                    <div key={student.id} className="bg-surface-container/40 border border-white/5 rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center font-bold text-secondary text-sm">
                            {student.initials}
                          </div>
                          <div>
                            <h4 className="text-base font-medium text-on-surface">{student.name}</h4>
                            <span className="text-xs text-on-surface-variant">{student.course}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${riskColor[student.riskLevel]}`}>
                          {student.riskLevel}
                        </span>
                      </div>

                      <div className="text-xs text-on-surface-variant space-y-1 mt-4 pt-3 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-white/5 p-2 rounded-lg flex flex-col items-center">
                            <span className="text-[10px] uppercase tracking-widest opacity-60">Humor Médio</span>
                            <span className="text-lg font-semibold text-white">{student.moodAvg}%</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg flex flex-col items-center">
                            <span className="text-[10px] uppercase tracking-widest opacity-60">Energia Média</span>
                            <span className="text-lg font-semibold text-white">{student.energyAvg}%</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg flex flex-col items-center col-span-2">
                            <span className="text-[10px] uppercase tracking-widest opacity-60">Check-ins Totais</span>
                            <span className="text-lg font-semibold text-white">{student.checkinCount} registros</span>
                          </div>
                        </div>
                        <p><strong>Evolução (Tendência):</strong> <span className={`material-symbols-outlined text-sm align-middle ${trendColor[student.trend]}`}>{trendIcon[student.trend]}</span></p>
                        <p><strong>Último Registro:</strong> {student.lastCheckin}</p>
                        <p><strong>Responsável:</strong> {student.guardianName} ({student.guardianPhone})</p>
                      </div>
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
