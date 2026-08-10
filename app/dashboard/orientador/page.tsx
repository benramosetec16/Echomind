'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

  // Multiclass Filter
  const [selectedClassroom, setSelectedClassroom] = useState<string>('All');
  const uniqueClassrooms = Array.from(new Set(watchList.map(s => s.course)));
  const filteredWatchList = selectedClassroom === 'All' ? watchList : watchList.filter(s => s.course === selectedClassroom);

  // New intervention form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [intervTitle, setIntervTitle] = useState('');
  const [intervDesc, setIntervDesc] = useState('');
  const [submittingInterv, setSubmittingInterv] = useState(false);

  // AI Report State
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingAiPdf, setDownloadingAiPdf] = useState(false);

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

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedStudentId || !intervTitle.trim() || !intervDesc.trim()) return;

    setSubmittingInterv(true);

    try {
      const res = await fetch('/api/orientador/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          title: intervTitle.trim(),
          description: intervDesc.trim(),
          status: 'pendente',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert('Erro ao registrar intervenção: ' + (data.error || 'Erro desconhecido.'));
      } else {
        setIntervTitle('');
        setIntervDesc('');
        setSelectedStudentId('');
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro de conexão ao registrar intervenção.');
    }

    setSubmittingInterv(false);
  };

  const handleCompleteIntervention = async (interventionId: string) => {
    try {
      const res = await fetch('/api/orientador/interventions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: interventionId, status: 'concluida' }),
      });
      if (!res.ok) {
        throw new Error('Erro ao concluir intervenção');
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateAiReport = async () => {
    if (!userId) return;
    setLoadingReport(true);
    try {
      const res = await fetch('/api/report/orientador/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orientadorId: userId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao gerar relatório IA');
      }
      const data = await res.json();
      setAiReport({ ...data, orientadorName: userName });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadAiPdf = async () => {
    if (!aiReport) return;
    setDownloadingAiPdf(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { InstitutionalPDFReport } = await import('../../components/PDFReport');
      
      const blob = await pdf(<InstitutionalPDFReport data={aiReport} institutionName={`Orientador(a) ${aiReport.orientadorName}`} title="Relatório de Inteligência - Orientação" />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-ia-orientacao-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setDownloadingAiPdf(false);
    }
  };

  const handleGenerateOrientadorPdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/report/orientador');
      if (!res.ok) throw new Error('Falha ao obter dados do relatório');
      const reportData = await res.json();

      const { pdf } = await import('@react-pdf/renderer');
      const { OrientadorPDFReport } = await import('../../components/PDFReport');

      const blob = await pdf(<OrientadorPDFReport data={reportData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-orientacao-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar PDF do Orientador: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <>
      <TopBar title="Painel do Orientador" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <header className="max-w-[1200px] mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]">
                Acompanhamento Emocional & Orientação
              </span>
              <h1 className="text-5xl font-extralight tracking-tighter text-on-surface mt-1">
                Olá, Orientador {userName || '...'}.
              </h1>
              <p className="text-on-surface-variant max-w-xl mt-2">
                Alunos sob sua orientação, solicitações de apoio e registro de intervenções em tempo real.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Filtrar por Sala:</span>
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                >
                  <option value="All">Todas as Salas</option>
                  {uniqueClassrooms.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateOrientadorPdf}
                  disabled={generatingPdf || loading}
                  className="bg-white/5 border border-white/10 text-on-surface hover:bg-white/10 font-semibold px-4 py-2 rounded-full text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {generatingPdf ? 'sync' : 'picture_as_pdf'}
                  </span>
                  {generatingPdf ? 'Gerando...' : 'Resumo PDF'}
                </button>
                <button
                  onClick={handleGenerateAiReport}
                  disabled={loadingReport || loading}
                  className="bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/20 font-semibold px-4 py-2 rounded-full text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {loadingReport ? 'sync' : 'psychology'}
                  </span>
                  {loadingReport ? 'Analisando...' : 'Relatório IA'}
                </button>
              </div>
            </div>
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
                  {filteredWatchList.map((s) => (
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
                  {filteredWatchList.map((student) => (
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
                    <div key={interv.id} className="bg-surface-container/40 border border-white/5 rounded-xl p-4 flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-on-surface">{interv.title}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{interv.description}</p>
                      </div>
                      <div className="flex flex-col md:flex-row items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border text-center ${
                          interv.status === 'concluida' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                          interv.status === 'em_andamento' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                          'text-on-surface-variant bg-white/5 border-white/10'
                        }`}>
                          {interv.status === 'concluida' ? 'Concluída' : interv.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                        </span>
                        {interv.status !== 'concluida' && (
                          <button
                            onClick={() => handleCompleteIntervention(interv.id)}
                            className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 font-semibold"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
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
                  <h3 className="text-2xl font-light text-on-surface">Visão Geral da Orientação</h3>
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
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80 block mb-1">Nível de Alerta Geral</span>
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
                        <span className="material-symbols-outlined text-secondary text-lg">lightbulb</span> Recomendações
                      </h4>
                      <ul className="space-y-2">
                        {aiReport.recomendacoes_preventivas?.map((p: string, i: number) => (
                          <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                            <span className="text-secondary mt-0.5">•</span> <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={downloadAiPdf}
                      disabled={downloadingAiPdf}
                      className="bg-white/10 border border-white/20 text-on-surface font-semibold px-6 py-3 rounded-full text-xs uppercase tracking-wider hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {downloadingAiPdf ? 'sync' : 'picture_as_pdf'}
                      </span>
                      {downloadingAiPdf ? 'Gerando PDF...' : 'Baixar Relatório PDF'}
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
