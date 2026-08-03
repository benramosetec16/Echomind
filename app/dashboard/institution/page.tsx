'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';
import { getUserRole, ROLE_LABELS, type UserRole } from '../../../utils/roles';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Classroom {
  id: string;
  name: string;
  code: string;
  professor_id?: string;
  orientador_id?: string;
  created_at: string;
}

interface InstitutionalCode {
  id: string;
  code: string;
  type: string;
  status: string;
  created_at: string;
  classroom_id?: string;
}

interface ProfileUser {
  id: string;
  full_name: string;
  role: string;
  classroom_id?: string;
}

interface EmotionalCheckin {
  id: string;
  user_id: string;
  valence_value: number;
  texture: string;
  created_at: string;
}

interface ChartDataTexture {
  name: string;
  quantidade: number;
  fill: string;
}

interface ChartDataValence {
  data: string;
  valencia: number;
}

export default function InstitutionPage() {
  const [userRole, setUserRole] = useState<UserRole>('aluno');
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lists
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [codes, setCodes] = useState<InstitutionalCode[]>([]);
  const [students, setStudents] = useState<ProfileUser[]>([]);
  const [professors, setProfessors] = useState<ProfileUser[]>([]);
  const [orientadores, setOrientadores] = useState<ProfileUser[]>([]);

  // Charts
  const [checkins, setCheckins] = useState<EmotionalCheckin[]>([]);
  const [textureData, setTextureData] = useState<ChartDataTexture[]>([]);
  const [valenceData, setValenceData] = useState<ChartDataValence[]>([]);

  // Forms
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');
  const [selectedOrientadorId, setSelectedOrientadorId] = useState('');

  const [codeType, setCodeType] = useState<'professor' | 'orientador' | 'aluno' | 'sala'>('aluno');
  const [codeRoomId, setCodeRoomId] = useState('');
  const [customCode, setCustomCode] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const processChartData = (data: EmotionalCheckin[]) => {
    const textureCounts = { focus: 0, calm: 0, anxiety: 0, bloom: 0 };
    data.forEach(c => {
      if (textureCounts[c.texture as keyof typeof textureCounts] !== undefined) {
        textureCounts[c.texture as keyof typeof textureCounts]++;
      }
    });
    
    setTextureData([
      { name: 'Foco', quantidade: textureCounts.focus, fill: '#3b82f6' },
      { name: 'Calma', quantidade: textureCounts.calm, fill: '#8b5cf6' },
      { name: 'Ansiedade', quantidade: textureCounts.anxiety, fill: '#f43f5e' },
      { name: 'Desabrochar', quantidade: textureCounts.bloom, fill: '#10b981' }
    ]);

    const dailyValence: Record<string, { total: number; count: number }> = {};
    data.forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dailyValence[date]) dailyValence[date] = { total: 0, count: 0 };
      dailyValence[date].total += c.valence_value;
      dailyValence[date].count++;
    });

    const processedValence = Object.keys(dailyValence).map(date => ({
      data: date,
      valencia: Math.round(dailyValence[date].total / dailyValence[date].count)
    }));

    setValenceData(processedValence);
  };

  const loadInstitutionalData = async (instId: string) => {
    setLoading(true);

    // Fetch classrooms
    const { data: roomData } = await supabase
      .from('classrooms')
      .select('*')
      .eq('institution_id', instId)
      .order('created_at', { ascending: false });
    if (roomData) setClassrooms(roomData);

    // Fetch codes
    const { data: codeData } = await supabase
      .from('institutional_codes')
      .select('*')
      .eq('institution_id', instId)
      .order('created_at', { ascending: false });
    if (codeData) setCodes(codeData);

    // Fetch profiles in institution
    const { data: profData } = await supabase
      .from('profiles')
      .select('id, full_name, role, classroom_id')
      .eq('institution_id', instId);

    if (profData) {
      const studentsData = profData.filter((p) => p.role === 'aluno');
      setStudents(studentsData);
      setProfessors(profData.filter((p) => p.role === 'professor'));
      setOrientadores(profData.filter((p) => p.role === 'orientador'));

      if (studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: checkinData } = await supabase
          .from('emotional_checkins')
          .select('*')
          .in('user_id', studentIds)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (checkinData) {
          setCheckins(checkinData);
          processChartData(checkinData);
        }
      } else {
        setCheckins([]);
        setTextureData([]);
        setValenceData([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    let channel: any;

    const init = async () => {
      const role = await getUserRole();
      setUserRole(role);

      if (!['gestor', 'administrador'].includes(role)) {
        router.replace('/dashboard');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();

      if (profile?.institution_id) {
        setInstitutionId(profile.institution_id);
        await loadInstitutionalData(profile.institution_id);

        // Realtime Subscription
        channel = supabase
          .channel('institution_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms', filter: `institution_id=eq.${profile.institution_id}` }, () => loadInstitutionalData(profile.institution_id))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'institutional_codes', filter: `institution_id=eq.${profile.institution_id}` }, () => loadInstitutionalData(profile.institution_id))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `institution_id=eq.${profile.institution_id}` }, () => loadInstitutionalData(profile.institution_id))
          .subscribe();
      } else {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  // Create Classroom
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !newRoomName.trim() || !newRoomCode.trim()) return;

    const { error } = await supabase.from('classrooms').insert({
      institution_id: institutionId,
      name: newRoomName.trim(),
      code: newRoomCode.trim().toUpperCase(),
      professor_id: selectedProfId || null,
      orientador_id: selectedOrientadorId || null,
    });

    if (error) {
      alert('Erro ao criar sala: ' + error.message);
    } else {
      setNewRoomName('');
      setNewRoomCode('');
      setSelectedProfId('');
      setSelectedOrientadorId('');
      loadInstitutionalData(institutionId);
    }
  };

  // Delete Classroom
  const handleDeleteClassroom = async (id: string) => {
    if (!confirm('Deseja realmente remover esta sala?')) return;
    const { error } = await supabase.from('classrooms').delete().eq('id', id);
    if (error) alert('Erro ao remover sala: ' + error.message);
    else if (institutionId) loadInstitutionalData(institutionId);
  };

  // Generate Institutional Code
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const generatedCode = customCode.trim()
      ? customCode.trim().toUpperCase()
      : `${codeType.substring(0, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase.from('institutional_codes').insert({
      institution_id: institutionId,
      code: generatedCode,
      type: codeType,
      status: 'ativo',
      created_by: user.id,
      classroom_id: codeRoomId || null,
    });

    if (error) {
      alert('Erro ao gerar código: ' + error.message);
    } else {
      setCustomCode('');
      if (institutionId) loadInstitutionalData(institutionId);
    }
  };

  // Revoke Code
  const handleRevokeCode = async (id: string) => {
    const { error } = await supabase
      .from('institutional_codes')
      .update({ status: 'revogado' })
      .eq('id', id);

    if (error) alert('Erro ao revogar código: ' + error.message);
    else if (institutionId) loadInstitutionalData(institutionId);
  };

  return (
    <>
      <TopBar title="Gestão Institucional" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <header className="max-w-[1200px] mx-auto mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">
                {ROLE_LABELS[userRole]} — Direção da Escola
              </span>
            </div>
            <h1 className="text-5xl font-extralight tracking-tighter text-on-surface mb-3">
              Painel de Gestão da Instituição
            </h1>
            <p className="text-on-surface-variant max-w-2xl">
              Crie salas, atribua professores e orientadores, e gere códigos institucionais com unicidade composta.
            </p>
          </header>

          {/* Quick Metrics */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Salas Ativas</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{classrooms.length}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Alunos</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{students.length}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Professores</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{professors.length}</h3>
            </div>
            <div className="aetheric-glass rounded-[24px] p-6">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant">Orientadores</span>
              <h3 className="text-3xl font-light text-on-surface mt-2">{orientadores.length}</h3>
            </div>
          </section>

          {/* Charts Section */}
          {students.length > 0 && (
            <section className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
              <div className="aetheric-glass rounded-[28px] p-8 flex flex-col">
                <h2 className="text-xl font-light text-on-surface mb-6">Média de Valência (7 dias)</h2>
                <div className="h-[250px] w-full flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={valenceData}>
                      <XAxis dataKey="data" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="valencia" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="aetheric-glass rounded-[28px] p-8 flex flex-col">
                <h2 className="text-xl font-light text-on-surface mb-6">Distribuição de Sentimentos</h2>
                <div className="h-[250px] w-full flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={textureData}>
                      <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="quantidade" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {/* Classroom Management */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <div className="aetheric-glass rounded-[28px] p-8">
              <h2 className="text-xl font-light text-on-surface mb-4">Gestão de Salas / Turmas</h2>

              <form onSubmit={handleCreateClassroom} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Nome da Sala (Ex: Turma 101)"
                  required
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                />
                <input
                  type="text"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                  placeholder="Código da Sala (Ex: T101)"
                  required
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary uppercase"
                />
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                >
                  <option value="">Selecione o Professor...</option>
                  {professors.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface text-on-surface">
                      {p.full_name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedOrientadorId}
                  onChange={(e) => setSelectedOrientadorId(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                >
                  <option value="">Selecione o Orientador...</option>
                  {orientadores.map((o) => (
                    <option key={o.id} value={o.id} className="bg-surface text-on-surface">
                      {o.full_name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-secondary text-background font-semibold rounded-2xl text-xs uppercase tracking-wider hover:bg-secondary-bright transition-colors"
                >
                  Criar Sala
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {classrooms.map((cls) => {
                  const roomStudents = students.filter((s) => s.classroom_id === cls.id);
                  const profName = professors.find((p) => p.id === cls.professor_id)?.full_name || 'Não atribuído';
                  const orientadorName = orientadores.find((o) => o.id === cls.orientador_id)?.full_name || 'Não atribuído';

                  return (
                    <div key={cls.id} className="bg-surface-container/40 border border-white/5 rounded-2xl p-5 relative flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-base font-medium text-on-surface">{cls.name}</h4>
                          <span className="px-2.5 py-1 bg-secondary/10 border border-secondary/30 text-secondary text-[11px] font-mono rounded-full">
                            {cls.code}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mb-1">
                          <strong>Prof:</strong> {profName}
                        </p>
                        <p className="text-xs text-on-surface-variant mb-1">
                          <strong>Orientador:</strong> {orientadorName}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          <strong>Alunos:</strong> {roomStudents.length}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteClassroom(cls.id)}
                        className="mt-4 self-end text-red-400 text-xs flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Institutional Code Generator */}
          <section className="max-w-[1200px] mx-auto">
            <div className="aetheric-glass rounded-[28px] p-8">
              <h2 className="text-xl font-light text-on-surface mb-4">Geração de Códigos Institucionais</h2>

              <form onSubmit={handleGenerateCode} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value as any)}
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                >
                  <option value="aluno" className="bg-surface text-on-surface">Código para Aluno</option>
                  <option value="professor" className="bg-surface text-on-surface">Código para Professor</option>
                  <option value="orientador" className="bg-surface text-on-surface">Código para Orientador</option>
                  <option value="sala" className="bg-surface text-on-surface">Código de Sala</option>
                </select>

                <select
                  value={codeRoomId}
                  onChange={(e) => setCodeRoomId(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary"
                >
                  <option value="">Vincular à Sala (Opcional)...</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface text-on-surface">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Código Personalizado (Opcional)"
                  className="bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary uppercase"
                />

                <button
                  type="submit"
                  className="bg-secondary text-background font-semibold rounded-2xl text-xs uppercase tracking-wider hover:bg-secondary-bright transition-colors"
                >
                  Gerar Código
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-on-surface-variant">
                  <thead className="text-xs uppercase tracking-wider text-on-surface border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {codes.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-secondary">{c.code}</td>
                        <td className="py-3 px-4 capitalize">{c.type}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                              c.status === 'ativo'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                : c.status === 'utilizado'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs opacity-60">
                          {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {c.status === 'ativo' && (
                            <button
                              onClick={() => handleRevokeCode(c.id)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </PageTransition>
      </main>
    </>
  );
}
