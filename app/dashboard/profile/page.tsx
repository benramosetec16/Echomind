'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // User data from auth
  const [userName, setUserName] = useState<string>('...');
  const [userInitials, setUserInitials] = useState<string>('...');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userCreatedAt, setUserCreatedAt] = useState<string>('');
  const [lastSignIn, setLastSignIn] = useState<string>('');

  // Form State
  const [hapticIntensity, setHapticIntensity] = useState(75);
  const [syncFrequency, setSyncFrequency] = useState<'instant' | 'hourly' | 'manual'>('instant');
  const [ghostMode, setGhostMode] = useState(false);
  const [ephemeralHistory, setEphemeralHistory] = useState(true);
  const [aethericProxy, setAethericProxy] = useState(true);
  const [localArchiving, setLocalArchiving] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({ focusLatency: 0.14, syncIntegrity: 99.8, aethericYield: 8.2 });

  // Stats
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalJournalEntries, setTotalJournalEntries] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserId(session.user.id);
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
          setUserName(name);
          setUserInitials(name.substring(0, 2).toUpperCase());
          setUserEmail(session.user.email || '');
          
          // Format dates
          if (session.user.created_at) {
            setUserCreatedAt(new Date(session.user.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric'
            }));
          }
          if (session.user.last_sign_in_at) {
            setLastSignIn(new Date(session.user.last_sign_in_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }));
          }

          // Load profile settings
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data) {
            setHapticIntensity(data.haptic_intensity ?? 75);
            setSyncFrequency(data.sync_frequency ?? 'instant');
            setGhostMode(data.ghost_mode ?? false);
            setEphemeralHistory(data.ephemeral_history ?? true);
            setAethericProxy(data.aetheric_proxy ?? true);
            setLocalArchiving(data.local_archiving ?? false);
            
            setMetrics({
               focusLatency: data.focus_latency ?? 0.14,
               syncIntegrity: data.sync_integrity ?? 99.8,
               aethericYield: data.aetheric_yield ?? 8.2,
            });
          } else if (error && error.code !== 'PGRST116') {
            console.error("Erro ao carregar perfil:", error.message);
          }

          // Load stats
          const [checkinsRes, journalRes] = await Promise.all([
            supabase.from('emotional_checkins').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
            supabase.from('aetheric_journal').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
          ]);

          setTotalCheckins(checkinsRes.count ?? 0);
          setTotalJournalEntries(journalRes.count ?? 0);

        } else {
          console.warn("Nenhuma sessão ativa encontrada.");
        }
      } catch (err) {
        console.error("Erro inesperado ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfile = async (updates: any) => {
    if (!userId) return;
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
      
    if (error) {
      console.error("Erro ao atualizar perfil:", error.message);
    }
  };

  const handleHapticChange = (val: number) => {
    setHapticIntensity(val);
    updateProfile({ haptic_intensity: val });
  };

  const handleSyncChange = (val: 'instant' | 'hourly' | 'manual') => {
    setSyncFrequency(val);
    updateProfile({ sync_frequency: val });
  };

  const toggleGhostMode = () => {
    const val = !ghostMode;
    setGhostMode(val);
    updateProfile({ ghost_mode: val });
  };

  const toggleEphemeralHistory = () => {
    const val = !ephemeralHistory;
    setEphemeralHistory(val);
    updateProfile({ ephemeral_history: val });
  };

  const toggleAethericProxy = () => {
    const val = !aethericProxy;
    setAethericProxy(val);
    updateProfile({ aetheric_proxy: val });
  };

  const toggleLocalArchiving = () => {
    const val = !localArchiving;
    setLocalArchiving(val);
    updateProfile({ local_archiving: val });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSwitchProfile = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background text-secondary">
         <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
       </div>
     );
  }

  return (
    <>
      <TopBar title="Santuário" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <div className="max-w-[1200px] mx-auto">
            {/* Auth Warning */}
            {!userId && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                 <span className="material-symbols-outlined text-red-400">warning</span>
                 <div>
                    <h4 className="text-red-400 font-medium text-sm">Autenticação Obrigatória</h4>
                    <p className="text-red-400/80 text-xs mt-1">Você não está conectado. As opções são funcionais na interface, mas as alterações não serão salvas no banco de dados.</p>
                 </div>
              </div>
            )}

            {/* Profile Hero Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-end gap-12 mb-16 relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/5 rounded-full blur-3xl"></div>
                <div className="w-48 h-48 rounded-full border border-white/10 grayscale hover:grayscale-0 transition-all duration-700 relative z-10 overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-center justify-center">
                  <span className="text-5xl text-on-surface-variant font-extralight tracking-tighter">{userInitials}</span>
                </div>
              </div>
              
              <div className="pb-4 flex-1">
                <span className="text-xs font-semibold text-secondary uppercase tracking-[0.2em] mb-2 block">Meu Perfil</span>
                <h1 className="text-5xl font-light text-on-surface mb-2">{userName}</h1>
                <p className="text-on-surface-variant max-w-md mb-6">
                  Gerencie suas configurações pessoais, visualize o status da sua conta e ajuste suas preferências.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSwitchProfile}
                    className="px-5 py-2.5 rounded-full border border-white/10 text-on-surface-variant text-xs uppercase tracking-[0.15em] font-semibold hover:bg-white/5 hover:border-white/20 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    Trocar Perfil
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="px-5 py-2.5 rounded-full border border-error/20 text-error text-xs uppercase tracking-[0.15em] font-semibold hover:bg-error/10 hover:border-error/40 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Sair da Conta
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Account Status Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="lg:col-span-5 aetheric-glass rounded-3xl p-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-secondary">account_circle</span>
                  <h3 className="text-xl font-medium text-on-surface">Status da Conta</h3>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-on-surface-variant">Email</span>
                    <span className="text-sm text-on-surface font-medium">{userEmail || 'Não disponível'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-on-surface-variant">Membro desde</span>
                    <span className="text-sm text-on-surface font-medium">{userCreatedAt || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-on-surface-variant">Último acesso</span>
                    <span className="text-sm text-on-surface font-medium">{lastSignIn || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-on-surface-variant">Status</span>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>
                      <span className="text-sm text-green-400 font-semibold">Ativo</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-on-surface-variant">Total de check-ins</span>
                    <span className="text-sm text-on-surface font-medium">{totalCheckins}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-on-surface-variant">Entradas no diário</span>
                    <span className="text-sm text-on-surface font-medium">{totalJournalEntries}</span>
                  </div>
                </div>
              </motion.div>

              {/* Personal Records */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-7 aetheric-glass rounded-3xl p-10 flex flex-col min-h-[400px]"
              >
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">lock</span>
                    <h3 className="text-xl font-medium text-on-surface">Registros Pessoais</h3>
                  </div>
                  <button className="px-5 py-2 rounded-full border border-secondary/20 text-secondary text-xs uppercase tracking-[0.15em] font-semibold hover:bg-secondary/5 hover:border-secondary/40 transition-all">
                    Descriptografar Sessão
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-4 flex-1">
                  <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Latência de Foco</span>
                    <div className="text-4xl font-extralight text-primary">{metrics.focusLatency} <span className="text-base text-on-surface-variant">ms</span></div>
                  </div>
                  
                  <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Integridade de Sincronia</span>
                    <div className="text-4xl font-extralight text-on-surface">{metrics.syncIntegrity} <span className="text-base text-on-surface-variant">%</span></div>
                  </div>
                  
                  <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Rendimento</span>
                    <div className="text-4xl font-extralight text-on-surface">{metrics.aethericYield} <span className="text-base text-on-surface-variant">k</span></div>
                  </div>
                </div>

                <div className="bg-surface-variant/10 rounded-2xl p-6 mt-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent"></div>
                  <div className="relative z-10 flex items-center gap-4">
                    <span className="material-symbols-outlined text-secondary">query_stats</span>
                    <p className="text-sm text-on-surface-variant italic">
                      "Sua taxa de recuperação cognitiva está atualmente entre os 4% melhores dos usuários ativos."
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Interface Feedback */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-4 glass-panel rounded-3xl p-8 flex flex-col"
              >
                <h3 className="text-lg font-medium text-on-surface mb-8">Feedback da Interface</h3>
                
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-on-surface-variant">Intensidade Háptica</span>
                    <span className="text-xs font-mono text-secondary">{hapticIntensity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={hapticIntensity}
                    onChange={(e) => setHapticIntensity(parseInt(e.target.value))}
                    onMouseUp={(e) => handleHapticChange(parseInt((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => handleHapticChange(parseInt((e.target as HTMLInputElement).value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-secondary"
                  />
                </div>

                <div className="mb-8 flex-1">
                  <span className="text-sm text-on-surface-variant block mb-4">Frequência de Sincronia</span>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleSyncChange('instant')}
                      className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${syncFrequency === 'instant' ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[inset_0_0_10px_rgba(159,207,213,0.1)]' : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'}`}
                    >
                      Instantânea
                    </button>
                    <button 
                      onClick={() => handleSyncChange('hourly')}
                      className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${syncFrequency === 'hourly' ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[inset_0_0_10px_rgba(159,207,213,0.1)]' : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'}`}
                    >
                      Por Hora
                    </button>
                    <button 
                      onClick={() => handleSyncChange('manual')}
                      className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${syncFrequency === 'manual' ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[inset_0_0_10px_rgba(159,207,213,0.1)]' : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                  <span className="material-symbols-outlined text-secondary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  <span className="text-xs uppercase tracking-[0.1em] font-semibold text-secondary">Desempenho Otimizado</span>
                </div>
              </motion.div>

              {/* Privacy Protocols */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-8 glass-panel rounded-3xl p-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-on-surface-variant">fingerprint</span>
                  <h3 className="text-xl font-medium text-on-surface">Protocolos de Privacidade</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ghost Mode */}
                  <div 
                    onClick={toggleGhostMode}
                    className={`cursor-pointer rounded-xl border p-6 flex flex-col relative overflow-hidden group transition-all duration-300 ${ghostMode ? 'bg-secondary/10 border-secondary/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <span className={`material-symbols-outlined mb-4 ${ghostMode ? 'text-secondary' : 'text-on-surface-variant'}`}>visibility_off</span>
                    <h4 className="text-base font-medium text-on-surface mb-2">Modo Fantasma</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1">
                      Ocultar ressonância emocional de todos os pares conectados.
                    </p>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${ghostMode ? 'bg-secondary shadow-[0_0_10px_rgba(159,207,213,0.3)]' : 'bg-surface-variant border border-white/5'}`}>
                      <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-300 ${ghostMode ? 'right-1' : 'left-1 opacity-40'}`}></div>
                    </div>
                  </div>

                  {/* Ephemeral History */}
                  <div 
                    onClick={toggleEphemeralHistory}
                    className={`cursor-pointer rounded-xl border p-6 flex flex-col relative overflow-hidden group transition-all duration-300 ${ephemeralHistory ? 'bg-secondary/10 border-secondary/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <span className={`material-symbols-outlined mb-4 ${ephemeralHistory ? 'text-secondary' : 'text-on-surface-variant'}`}>history_edu</span>
                    <h4 className="text-base font-medium text-on-surface mb-2">Histórico Efêmero</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1">
                      Exclusão automática de registros neurais após 24 horas.
                    </p>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${ephemeralHistory ? 'bg-secondary shadow-[0_0_10px_rgba(159,207,213,0.3)]' : 'bg-surface-variant border border-white/5'}`}>
                      <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-300 ${ephemeralHistory ? 'right-1' : 'left-1 opacity-40'}`}></div>
                    </div>
                  </div>

                  {/* Aetheric Proxy */}
                  <div 
                    onClick={toggleAethericProxy}
                    className={`cursor-pointer rounded-xl border p-6 flex flex-col relative overflow-hidden group transition-all duration-300 ${aethericProxy ? 'bg-secondary/10 border-secondary/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <span className={`material-symbols-outlined mb-4 ${aethericProxy ? 'text-secondary' : 'text-on-surface-variant'}`}>security</span>
                    <h4 className="text-base font-medium text-on-surface mb-2">Proxy Etérico</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1">
                      Redirecionar dados biométricos através de nós descentralizados.
                    </p>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${aethericProxy ? 'bg-secondary shadow-[0_0_10px_rgba(159,207,213,0.3)]' : 'bg-surface-variant border border-white/5'}`}>
                      <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-300 ${aethericProxy ? 'right-1' : 'left-1 opacity-40'}`}></div>
                    </div>
                  </div>

                  {/* Local Archiving */}
                  <div 
                    onClick={toggleLocalArchiving}
                    className={`cursor-pointer rounded-xl border p-6 flex flex-col relative overflow-hidden group transition-all duration-300 ${localArchiving ? 'bg-secondary/10 border-secondary/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <span className={`material-symbols-outlined mb-4 ${localArchiving ? 'text-secondary' : 'text-on-surface-variant'}`}>cloud_off</span>
                    <h4 className="text-base font-medium text-on-surface mb-2">Arquivamento Local</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1">
                      Armazenar todos os registros cognitivos exclusivamente no hardware local.
                    </p>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${localArchiving ? 'bg-secondary shadow-[0_0_10px_rgba(159,207,213,0.3)]' : 'bg-surface-variant border border-white/5'}`}>
                      <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-300 ${localArchiving ? 'right-1' : 'left-1 opacity-40'}`}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
