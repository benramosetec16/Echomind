'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

interface Institution {
  id: string;
  name: string;
  created_at: string;
}

interface GeneratedCode {
  code: string;
  type: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  last_login: string;
}

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

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [newInstName, setNewInstName] = useState('');
  const [creatingInst, setCreatingInst] = useState(false);

  // Painel de Gerenciamento Expandido
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [activeTab, setActiveTab] = useState<'codes' | 'members'>('codes');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [codeType, setCodeType] = useState<'gestor' | 'professor' | 'orientador' | 'aluno'>('gestor');
  const [gestorEmail, setGestorEmail] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);

  const [stats, setStats] = useState({ 
    activeUsers: 0, 
    activeUsersNew: 0, 
    institutions: 0,
    classrooms: 0,
    alunos: 0,
    professores: 0,
    orientadores: 0,
    gestores: 0
  });
  const [roleDist, setRoleDist] = useState<RoleDist[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Admin');
    };
    fetchUser();
  }, [supabase]);

  const loadInstitutions = async () => {
    const res = await fetch('/api/admin/institutions');
    const json = await res.json();
    if (json.error) {
      console.error('Erro ao carregar instituições:', json.error);
      return;
    }
    if (json.institutions) setInstitutions(json.institutions);
  };

  const loadMembers = async (instId: string) => {
    setLoadingMembers(true);
    const res = await fetch(`/api/admin/users?institution_id=${instId}`);
    const json = await res.json();
    if (json.users) setMembers(json.users);
    setLoadingMembers(false);
  };

  const loadData = async () => {
    setLoading(true);
    await loadInstitutions();

    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      
      if (json.stats) {
        const { stats: s } = json;
        setStats({ 
          activeUsers: s.activeUsers, 
          activeUsersNew: s.activeUsersNew, 
          institutions: s.institutions,
          classrooms: s.classrooms,
          alunos: s.alunos,
          professores: s.professores,
          orientadores: s.orientadores,
          gestores: s.gestores
        });

        const total = s.activeUsers;
        setRoleDist([
          { label: 'Alunos', count: s.alunos, color: 'bg-secondary', pct: total > 0 ? (s.alunos / total) * 100 : 0 },
          { label: 'Professores', count: s.professores, color: 'bg-primary', pct: total > 0 ? (s.professores / total) * 100 : 0 },
          { label: 'Orientadores', count: s.orientadores, color: 'bg-tertiary', pct: total > 0 ? (s.orientadores / total) * 100 : 0 },
          { label: 'Gestores', count: s.gestores, color: 'bg-yellow-400', pct: total > 0 ? (s.gestores / total) * 100 : 0 },
          { label: 'Administradores', count: total - (s.alunos + s.professores + s.orientadores + s.gestores), color: 'bg-white/40', pct: total > 0 ? ((total - (s.alunos + s.professores + s.orientadores + s.gestores)) / total) * 100 : 0 },
        ]);

        const activities: Activity[] = [];
        const now = new Date();
        
        if (s.recentProfiles) {
          s.recentProfiles.forEach((p: any) => activities.push({ id: p.id, action: 'Novo usuário registrado', detail: `Cargo: ${p.role}`, time: '', icon: 'person_add', created_at: new Date(p.created_at) }));
        }
        if (s.recentBio) {
          s.recentBio.forEach((b: any) => activities.push({ id: b.id, action: 'Alerta biométrico', detail: `Nível: ${b.type}`, time: '', icon: 'warning', created_at: new Date(b.created_at) }));
        }

        activities.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        const finalActivities = activities.slice(0, 5).map(a => {
          const diffMins = Math.floor((now.getTime() - a.created_at.getTime()) / 60000);
          a.time = diffMins > 60 ? `há ${Math.floor(diffMins / 60)}h` : `há ${diffMins} min`;
          return a;
        });
        setRecentActivity(finalActivities);
      }
    } catch (err) {
      console.error("Erro ao carregar stats do admin:", err);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel('admin_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_logs' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName.trim()) return;
    setCreatingInst(true);
    const res = await fetch('/api/admin/institutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newInstName.trim() })
    });
    const json = await res.json();
    if (json.error) alert('Erro ao criar: ' + json.error);
    else { setNewInstName(''); await loadInstitutions(); }
    setCreatingInst(false);
  };

  const handleDeleteInstitution = async (id: string) => {
    if (!confirm('Deseja realmente remover esta instituição? Todos os dados vinculados serão apagados.')) return;
    const res = await fetch('/api/admin/institutions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const json = await res.json();
    if (json.error) alert('Erro: ' + json.error);
    else { if (selectedInst?.id === id) setSelectedInst(null); await loadInstitutions(); }
  };

  const handleGenerateCode = async () => {
    if (!selectedInst) return;
    setGeneratingCode(true);
    setGeneratedCode(null);
    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: selectedInst.id,
        type: codeType,
        gestorEmail: codeType === 'gestor' && gestorEmail ? gestorEmail : null
      })
    });
    const json = await res.json();
    if (json.error) alert('Erro: ' + json.error);
    else {
      setGeneratedCode({ code: json.code, type: codeType });
      if (codeType === 'gestor' && gestorEmail) {
        // Se vinculou um gestor automaticamente, atualiza a lista de membros
        loadMembers(selectedInst.id);
      }
    }
    setGeneratingCode(false);
  };

  const systemStats = [
    { label: 'Usuários Totais', value: stats.activeUsers, icon: 'group', sub: `+${stats.activeUsersNew} esta semana` },
    { label: 'Instituições', value: stats.institutions, icon: 'domain', sub: 'Ativas' },
    { label: 'Turmas (Salas)', value: stats.classrooms, icon: 'meeting_room', sub: 'Cadastradas' },
    { label: 'Alunos', value: stats.alunos, icon: 'school', sub: 'Total' },
    { label: 'Professores', value: stats.professores, icon: 'cast_for_education', sub: 'Total' },
    { label: 'Orientadores', value: stats.orientadores, icon: 'psychology', sub: 'Total' },
    { label: 'Gestores', value: stats.gestores, icon: 'admin_panel_settings', sub: 'Institucionais' },
    { label: 'Admins', value: stats.activeUsers - (stats.alunos + stats.professores + stats.orientadores + stats.gestores), icon: 'verified_user', sub: 'Sistema' },
  ];

  const roleTypeLabel: Record<string, string> = { gestor: 'Gestor', professor: 'Professor', orientador: 'Orientador', aluno: 'Aluno' };
  const roleColors: Record<string, string> = { 
    gestor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', 
    professor: 'bg-primary/20 text-primary border-primary/30', 
    orientador: 'bg-tertiary/20 text-tertiary border-tertiary/30', 
    aluno: 'bg-secondary/20 text-secondary border-secondary/30' 
  };

  return (
    <>
      <TopBar title="Centro de Controle" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <section className="max-w-[1200px] mx-auto mb-12">
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]">
              Administração do Sistema
            </motion.span>
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-extralight leading-[1.1] text-on-surface tracking-tighter mt-1">
              Centro de Controle, {userName || '...'}.
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-base text-on-surface-variant max-w-xl mt-2">
              Gestão global da plataforma EchoMind, instituições cadastradas e logs operacionais.
            </motion.p>
          </section>

          {/* System Stats */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {systemStats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="aetheric-glass rounded-[24px] p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-semibold">{stat.label}</span>
                  <span className="material-symbols-outlined text-secondary opacity-60 text-xl">{stat.icon}</span>
                </div>
                <span className="text-4xl font-extralight text-on-surface">{loading ? '...' : stat.value}</span>
                <span className="text-[11px] text-on-surface-variant opacity-50 uppercase tracking-wider">{stat.sub}</span>
              </motion.div>
            ))}
          </section>

          {/* Institutions Management */}
          <section className="max-w-[1200px] mx-auto mb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="aetheric-glass rounded-[28px] p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-light text-on-surface">Gestão de Instituições</h3>
                  <p className="text-xs text-on-surface-variant">Cadastre, gere códigos e administre as instituições parceiras do EchoMind.</p>
                </div>
              </div>

              <form onSubmit={handleCreateInstitution} className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="Nome da Nova Instituição..."
                  className="flex-1 bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary transition-colors"
                />
                <button
                  type="submit"
                  disabled={creatingInst || !newInstName.trim()}
                  className="px-6 py-3 bg-secondary text-background font-semibold rounded-2xl text-xs uppercase tracking-wider hover:bg-secondary-bright transition-colors disabled:opacity-50"
                >
                  {creatingInst ? 'Criando...' : 'Adicionar'}
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {institutions.length === 0 ? (
                  <p className="text-sm text-on-surface-variant opacity-60 col-span-3">Nenhuma instituição cadastrada ainda.</p>
                ) : (
                  institutions.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => {
                        if (selectedInst?.id === inst.id) {
                          setSelectedInst(null);
                        } else {
                          setSelectedInst(inst);
                          setActiveTab('codes');
                          loadMembers(inst.id);
                        }
                      }}
                      className={`bg-surface-container/50 border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${selectedInst?.id === inst.id ? 'border-secondary/60 bg-secondary/5' : 'border-white/5 hover:border-white/20'}`}
                    >
                      <div>
                        <h4 className="text-sm font-medium text-on-surface">{inst.name}</h4>
                        <span className="text-[10px] text-on-surface-variant opacity-50 uppercase">{new Date(inst.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        {selectedInst?.id === inst.id && (
                          <span className="material-symbols-outlined text-secondary text-sm">settings</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteInstitution(inst.id); }} className="text-red-400 hover:text-red-300 p-2 rounded-xl hover:bg-red-500/10 transition-colors" title="Remover">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </section>

          {/* Painel de Gerenciamento da Instituição Selecionada */}
          <AnimatePresence>
            {selectedInst && (
              <motion.section
                key={selectedInst.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-[1200px] mx-auto mb-10"
              >
                <div className="aetheric-glass rounded-[28px] p-8 border border-secondary/20">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-3xl">domain</span>
                      <div>
                        <h3 className="text-xl font-light text-on-surface">{selectedInst.name}</h3>
                        <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-wider">Painel de Controle Institucional</p>
                      </div>
                    </div>

                    <div className="flex bg-background/50 border border-white/5 rounded-xl p-1">
                      <button 
                        onClick={() => setActiveTab('codes')}
                        className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'codes' ? 'bg-secondary text-background' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        Gerar Códigos
                      </button>
                      <button 
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'members' ? 'bg-secondary text-background' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        Membros ({members.length})
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'codes' && (
                      <motion.div key="codes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid md:grid-cols-2 gap-8">
                        {/* Gerar Código */}
                        <div className="flex flex-col gap-4">
                          <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest">Novo Acesso</h4>

                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 block">Tipo de Cargo</label>
                            <select
                              value={codeType}
                              onChange={(e) => { setCodeType(e.target.value as any); setGestorEmail(''); setGeneratedCode(null); }}
                              className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-secondary transition-colors"
                            >
                              <option value="gestor">Gestor Institucional</option>
                              <option value="professor">Professor</option>
                              <option value="orientador">Orientador</option>
                              <option value="aluno">Aluno</option>
                            </select>
                          </div>

                          {codeType === 'gestor' && (
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 block">
                                E-mail do Gestor <span className="opacity-50">(opcional — vincula automaticamente)</span>
                              </label>
                              <input
                                type="email"
                                value={gestorEmail}
                                onChange={(e) => setGestorEmail(e.target.value)}
                                placeholder="gestor@escola.com"
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-secondary transition-colors"
                              />
                              <p className="text-[10px] text-on-surface-variant opacity-40 mt-1">Se informado, o usuário será movido imediatamente para esta instituição sem precisar digitar código.</p>
                            </div>
                          )}

                          <button
                            onClick={handleGenerateCode}
                            disabled={generatingCode}
                            className="w-full py-3 bg-secondary/10 border border-secondary/30 text-secondary font-semibold rounded-xl text-xs uppercase tracking-wider hover:bg-secondary/20 transition-colors disabled:opacity-50"
                          >
                            {generatingCode ? 'Gerando...' : `Gerar Código de ${roleTypeLabel[codeType]}`}
                          </button>

                          <AnimatePresence>
                            {generatedCode && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-secondary/5 border border-secondary/30 rounded-2xl p-5 text-center mt-2"
                              >
                                <p className="text-[10px] text-secondary uppercase tracking-widest mb-2">Código {roleTypeLabel[generatedCode.type]} Gerado</p>
                                <p className="text-3xl font-mono font-bold text-on-surface tracking-[0.3em]">{generatedCode.code}</p>
                                <p className="text-[10px] text-on-surface-variant opacity-40 mt-2">Uso único e permanente. Compartilhe com o novo usuário.</p>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(generatedCode.code); }}
                                  className="mt-3 text-[10px] uppercase tracking-wider text-secondary opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 mx-auto"
                                >
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                  Copiar Código
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Instruções */}
                        <div className="flex flex-col gap-4">
                          <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest">Regras de Vínculo</h4>
                          <div className="flex flex-col gap-3 text-sm text-on-surface-variant">
                            {[
                              { icon: 'person_add', label: 'Cadastro Legado', desc: 'Se o usuário já tem conta, ele será solicitado a digitar este código assim que fizer o próximo login na plataforma.' },
                              { icon: 'key', label: 'Vínculo Automático', desc: 'Para Gestores que você inseriu o e-mail, eles não precisam do código. Já constam na aba "Membros".' },
                            ].map(item => (
                              <div key={item.icon} className="flex gap-3 items-start bg-surface-container/30 rounded-xl p-3">
                                <span className="material-symbols-outlined text-secondary text-base mt-0.5">{item.icon}</span>
                                <div>
                                  <p className="text-xs font-semibold text-on-surface mb-0.5">{item.label}</p>
                                  <p className="text-[11px] opacity-60 leading-relaxed">{item.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'members' && (
                      <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest">Lista de Membros</h4>
                          <button onClick={() => loadMembers(selectedInst.id)} className="text-xs text-secondary hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">refresh</span> Atualizar
                          </button>
                        </div>
                        
                        {loadingMembers ? (
                          <div className="text-center py-8 text-sm text-on-surface-variant opacity-60">Carregando membros...</div>
                        ) : members.length === 0 ? (
                          <div className="text-center py-10 bg-surface-container/30 rounded-2xl border border-white/5">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-30 mb-2">group_off</span>
                            <p className="text-sm text-on-surface-variant opacity-60">Nenhum membro vinculado a esta instituição ainda.</p>
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-4">
                            {members.map(member => (
                              <div key={member.id} className="bg-surface-container/40 border border-white/5 rounded-xl p-4 flex justify-between items-center hover:border-white/10 transition-colors">
                                <div>
                                  <p className="text-sm font-medium text-on-surface truncate">{member.full_name || 'Usuário Sem Nome'}</p>
                                  <p className="text-[10px] text-on-surface-variant opacity-50">Entrou em: {new Date(member.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${roleColors[member.role] || roleColors['aluno']}`}>
                                  {roleTypeLabel[member.role] || member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-8">
            {/* Role Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="aetheric-glass rounded-[28px] p-8">
              <h3 className="text-lg font-light text-on-surface mb-6">Distribuição de Perfis no Sistema</h3>
              <div className="flex flex-col gap-4">
                {roleDist.map((role) => (
                  <div key={role.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-on-surface-variant">{role.label}</span>
                      <span className="text-xs font-semibold text-on-surface">{loading ? '-' : role.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${role.pct}%` }} transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${role.color}`} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activity Log */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="aetheric-glass rounded-[28px] p-8">
              <h3 className="text-lg font-light text-on-surface mb-6">Log Geral em Tempo Real</h3>
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
