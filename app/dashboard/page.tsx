'use client';

import { motion } from 'framer-motion';
import TopBar from '../components/TopBar';
import PageTransition from '../components/PageTransition';
import OnboardingModal from '../components/OnboardingModal';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import { getUserRole } from '../../utils/roles';
import { verifyAndRestoreProfile } from './checkin/actions';

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('aluno');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [classroomName, setClassroomName] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    latestValence: 75,
    checkinsCount: 0,
    journalCount: 0,
  });

  const supabase = createClient();
  const router = useRouter();

  const loadStudentMetrics = async (uid: string) => {
    const [checkinRes, journalRes] = await Promise.all([
      supabase
        .from('emotional_checkins')
        .select('valence_value, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('aetheric_journal')
        .select('id', { count: 'exact' })
        .eq('user_id', uid),
    ]);

    const checkins = checkinRes.data || [];
    const latestValence = checkins.length > 0 ? checkins[0].valence_value : 75;

    setMetrics({
      latestValence,
      checkinsCount: checkins.length,
      journalCount: journalRes.count || 0,
    });
  };

  useEffect(() => {
    let channel: any;

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Guarantee profile exists via Server Action
          await verifyAndRestoreProfile();

          setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Viajante');
          setUserId(user.id);

          let { data: profile } = await supabase
            .from('profiles')
            .select('role, institution_id, classroom_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            if (!profile.institution_id) {
              setShowOnboarding(true);
            } else {
              // Load institution and classroom names for visual confirmation
              const { data: inst } = await supabase.from('institutions').select('name').eq('id', profile.institution_id).maybeSingle();
              if (inst) setInstitutionName(inst.name);
              if (profile.classroom_id) {
                const { data: cls } = await supabase.from('classrooms').select('name').eq('id', profile.classroom_id).maybeSingle();
                if (cls) setClassroomName(cls.name);
              }
            }
          }

        await loadStudentMetrics(user.id);

        // Realtime Subscription
        channel = supabase
          .channel('student_dashboard_realtime')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emotional_checkins', filter: `user_id=eq.${user.id}` }, () => loadStudentMetrics(user.id))
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'aetheric_journal', filter: `user_id=eq.${user.id}` }, () => loadStudentMetrics(user.id))
          .subscribe();
      }
    };

    const checkRole = async (user: any) => {
      let { data: profile } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .maybeSingle();

      // If missing, let fetchUser handle creation. We just don't crash here.
      if (profile) {
        setUserRole(profile.role);
        
        if (!profile.institution_id) {
          return;
        }

        const role = profile.role;
        if (role === 'professor') router.replace('/dashboard/professor');
        else if (role === 'orientador') router.replace('/dashboard/orientador');
        else if (role === 'gestor') router.replace('/dashboard/institution');
        else if (role === 'administrador') router.replace('/dashboard/admin');
      }
    };

    fetchUser().then(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await checkRole(user);
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return (
    <>
      <TopBar title="Atmosfera" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          {/* Hero Section */}
          <section className="max-w-[1200px] mx-auto mb-16">
            <div className="flex flex-col gap-2">
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]"
              >
                Sistema Inicializado
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-6xl font-extralight leading-[1.1] text-on-surface tracking-tighter"
              >
                Bem-vindo, {userName || '...'}.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base text-on-surface-variant max-w-xl"
              >
                Seu ecossistema emocional está ressoando em frequências ideais. Prioridade de hoje: manter foco profundo durante janelas cognitivas de alta intensidade.
              </motion.p>
              {institutionName && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-secondary text-base">domain</span>
                  <span className="text-xs font-semibold text-secondary uppercase tracking-[0.15em]">
                    {institutionName}{classroomName ? ` — ${classroomName}` : ''}
                  </span>
                </motion.div>
              )}
            </div>
          </section>

          {/* Metrics Bento Grid */}
          <section className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
            {/* Vibe Pulse */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="md:col-span-4 aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Pulso da Vibe</span>
                  <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">vital_signs</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight text-on-surface">{metrics.latestValence}</span>
                  <span className="text-sm text-on-surface-variant opacity-40">/100</span>
                </div>
              </div>
              <div className="mt-8 h-20 flex items-end gap-1">
                <div className="flex-1 bg-secondary/10 h-1/2 rounded-t-sm group-hover:h-3/4 transition-all duration-1000 ease-in-out"></div>
                <div className="flex-1 bg-secondary/10 h-2/3 rounded-t-sm group-hover:h-1/2 transition-all duration-1000 ease-in-out delay-100"></div>
                <div className="flex-1 bg-secondary/20 h-3/4 rounded-t-sm group-hover:h-full transition-all duration-1000 ease-in-out delay-200"></div>
                <div className="flex-1 bg-secondary/10 h-1/3 rounded-t-sm group-hover:h-2/3 transition-all duration-1000 ease-in-out delay-300"></div>
                <div className="flex-1 bg-secondary/10 h-1/2 rounded-t-sm group-hover:h-1/3 transition-all duration-1000 ease-in-out delay-400"></div>
              </div>
            </motion.div>

            {/* Total Checkins */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="md:col-span-4 aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Check-ins Realizados</span>
                  <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">auto_awesome</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight text-on-surface">{metrics.checkinsCount}</span>
                  <span className="text-sm text-on-surface-variant opacity-40">Registros</span>
                </div>
              </div>
              <div className="mt-8 relative h-20 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-dashed border-secondary/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                </div>
                <div className="w-12 h-12 rounded-full border border-secondary/40 flex items-center justify-center">
                  <div className="w-1 h-1 bg-secondary rounded-full aether-glow"></div>
                </div>
              </div>
            </motion.div>

            {/* Journal Entries */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="md:col-span-4 aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Entradas no Journal</span>
                  <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">book</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight text-on-surface">{metrics.journalCount}</span>
                  <span className="text-sm text-on-surface-variant opacity-40">Páginas</span>
                </div>
              </div>
              <div className="mt-8">
                <div className="w-full h-[1px] bg-white/10 relative">
                  <div className="absolute top-0 left-0 h-full w-4/5 bg-secondary aether-glow"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-semibold uppercase tracking-widest opacity-30">
                  <span>Sincronização</span>
                  <span>100%</span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Active Protocols Section */}
          <section className="max-w-[1200px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex justify-between items-end mb-10"
            >
              <div>
                <span className="text-xs font-semibold text-secondary/60 uppercase tracking-[0.2em] mb-2 block">Inteligência em Andamento</span>
                <h3 className="text-3xl font-normal text-on-surface">Protocolos Ativos</h3>
              </div>
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors"
              >
                CONFIGURAR <span className="material-symbols-outlined text-[16px]">settings</span>
              </button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Protocol Card 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="group cursor-pointer"
              >
                <div className="aetheric-glass rounded-[40px] p-8 flex gap-8 items-center transition-all duration-500 group-hover:bg-white/[0.04]">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden bg-surface-container flex-shrink-0 border border-white/5 relative">
                    <img src="/protocol_synapse.png" alt="Clareza Sináptica" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent"></div>
                  </div>

                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-medium text-on-surface">Clareza Sináptica</h4>
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full border border-secondary/20">ATIVO</span>
                    </div>
                    <p className="text-sm text-on-surface-variant opacity-70 mb-6">Supressão de fundo neural engajada para maximizar o rendimento do trabalho profundo.</p>
                  </div>
                </div>
              </motion.div>

              {/* Protocol Card 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="group cursor-pointer"
              >
                <div className="aetheric-glass rounded-[40px] p-8 flex gap-8 items-center transition-all duration-500 group-hover:bg-white/[0.04]">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden bg-surface-container flex-shrink-0 border border-white/5 relative">
                    <img src="/protocol_resonance.png" alt="Mudança de Ressonância" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-br from-tertiary/20 to-transparent"></div>
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-medium text-on-surface">Mudança de Ressonância</h4>
                      <span className="px-3 py-1 bg-surface-variant text-on-surface-variant text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full border border-white/10">ESPERA</span>
                    </div>
                    <p className="text-sm text-on-surface-variant opacity-70 mb-6">Ajuste de humor ambiente programado para fase de pôr do sol circadiano.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </PageTransition>
      </main>

      {/* Legacy User Onboarding Modal */}
      {showOnboarding && userId && (
        <OnboardingModal
          onComplete={async () => {
            setShowOnboarding(false);
            if (userId) {
              await loadStudentMetrics(userId);
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                // Re-run checkRole to redirect properly based on the new role
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', user.id)
                  .single();
                  
                if (profile) {
                   const role = profile.role;
                   if (role === 'professor') router.replace('/dashboard/professor');
                   else if (role === 'orientador') router.replace('/dashboard/orientador');
                   else if (role === 'gestor') router.replace('/dashboard/institution');
                   else if (role === 'administrador') router.replace('/dashboard/admin');
                }
              }
            }
          }}
        />
      )}
    </>
  );
}
