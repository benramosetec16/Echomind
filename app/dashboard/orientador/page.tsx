'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
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

  // Load all data from the secure API (bypasses RLS via service_role)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orientador/students');
      if (!res.ok) {
        console.error('[Orientador Dashboard] API error:', res.status);
        setWatchList([]);
        setLoading(false);
        return;
      }

      const json = await res.json();

      setWatchList(json.students ?? []);
      setInterventions(json.interventions ?? []);

      const students: WatchStudent[] = json.students ?? [];
      setStats({
        emObservacao: students.length,
        intervencoes: json.interventions?.length ?? 0,
        riscoElevado: students.filter(s => s.riskLevel === 'Crítico' || s.riskLevel === 'Moderado').length,
        sessoes: json.sessionCount ?? 0,
      });
    } catch (err) {
      console.error('[Orientador Dashboard]', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadData();

    // Realtime: recarrega quando há novos check-ins, intervenções ou mensagens
    const channel = supabase
      .channel('orientador_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emotional_checkins' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interventions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, loadData]);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedStudentId || !intervTitle.trim() || !intervDesc.trim()) return;

    setSubmittingInterv(true);

    // Usar a API admin para buscar dados do aluno
    const supabaseClient = createClient();
    const { data: studentProf } = await supabaseClient
      .from('profiles')
      .select('institution_id, classroom_id')
      .eq('id', selectedStudentId)
      .single();

    const { error } = await supabaseClient.from('interventions').insert({
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
      loadData();
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
                <div className="text-sm text-on-surface-variant opacity-60">
                  Nenhum aluno sob sua responsabilidade ainda. Verifique se você está vinculado a uma sala no painel institucional.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {watchList.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-surface-container/40 border border-white/5 rounded-2xl p-5"
                    >
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
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Interventions List */}
          {interventions.length > 0 && (
            <section className="max-w-[1200px] mx-auto mb-10">
              <div className="aetheric-glass rounded-[28px] p-8">
                <h2 className="text-xl font-light text-on-surface mb-6">Histórico de Intervenções</h2>
                <div className="space-y-3">
                  {interventions.map(interv => (
                    <div key={interv.id} className="bg-surface-container/40 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{interv.title}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{interv.description}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        interv.status === 'concluida' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                        interv.status === 'em_andamento' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                        'text-on-surface-variant bg-white/5 border-white/10'
                      }`}>
                        {interv.status === 'concluida' ? 'Concluída' : interv.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </PageTransition>
      </main>
    </>
  );
}
