'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';
import { getUserRole, updateUserRole, ROLE_LABELS, type UserRole } from '../../../utils/roles';

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Alex X.');
  const [userInitials, setUserInitials] = useState<string>('AX');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Photo / Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password Change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Role
  const [userRole, setUserRole] = useState<UserRole>('aluno');
  const [roleLoading, setRoleLoading] = useState(false);

  // Notification preferences
  const [notifCheckin, setNotifCheckin] = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [notifStudies, setNotifStudies] = useState(true);

  // Form State
  const [hapticIntensity, setHapticIntensity] = useState(75);
  const [syncFrequency, setSyncFrequency] = useState<'instant' | 'hourly' | 'manual'>('instant');
  const [ghostMode, setGhostMode] = useState(false);
  const [ephemeralHistory, setEphemeralHistory] = useState(true);
  const [aethericProxy, setAethericProxy] = useState(true);
  const [localArchiving, setLocalArchiving] = useState(false);

  // Mock metrics for display
  const [metrics, setMetrics] = useState({ focusLatency: 0.14, syncIntegrity: 99.8, aethericYield: 8.2 });

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserId(session.user.id);
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Líder';
          setUserName(name);
          setUserInitials(name.substring(0, 2).toUpperCase());
          setUserEmail(session.user.email ?? null);
          setSessionCreatedAt(session.user.created_at ?? null);

          // Load avatar from Supabase Storage
          const avatarPath = `avatars/${session.user.id}`;
          const extensions = ['jpg', 'jpeg', 'png', 'webp'];
          for (const ext of extensions) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(`${avatarPath}.${ext}`);
            if (urlData?.publicUrl) {
              // Verify it exists with a lightweight HEAD check
              try {
                const res = await fetch(urlData.publicUrl, { method: 'HEAD' });
                if (res.ok) {
                  setAvatarUrl(urlData.publicUrl + '?t=' + Date.now());
                  break;
                }
              } catch { /* ignore */ }
            }
          }

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

            // Load avatar_url from profile row if set
            if (data.avatar_url) {
              setAvatarUrl(data.avatar_url + '?t=' + Date.now());
            }
          } else if (error && error.code !== 'PGRST116') {
            console.error("Error loading profile:", error.message);
          }
        } else {
          console.warn("No active session found. Changes will only be local.");
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
    getUserRole().then(setUserRole);
  }, []);


  const updateProfile = async (updates: any) => {
    if (!userId) {
      console.log("Local state updated. Log in to sync with Supabase:", updates);
      return;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
      
    if (error) {
      console.error("Error updating profile:", error.message);
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

  // --- Photo Upload ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: upError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (upError) throw upError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl + '?t=' + Date.now());
    } catch (err: any) {
      console.error('Avatar upload error:', err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  // --- Password Change ---
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg('Erro: ' + error.message);
    } else {
      setPasswordMsg('Senha atualizada com sucesso!');
      setNewPassword('');
      setShowPasswordForm(false);
    }
    setPasswordLoading(false);
  };

  // --- Role Change ---
  const handleRoleChange = async (role: UserRole) => {
    setRoleLoading(true);
    setUserRole(role);
    await updateUserRole(role);
    setRoleLoading(false);
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
              <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <div className="absolute inset-0 bg-secondary/5 rounded-full blur-3xl"></div>
                <div className="w-48 h-48 rounded-full border border-white/10 grayscale hover:grayscale-0 transition-all duration-700 relative z-10 overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl text-on-surface-variant font-extralight tracking-tighter">{userInitials}</span>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-background/70 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                    {avatarUploading ? (
                      <span className="material-symbols-outlined text-secondary animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-secondary text-3xl">photo_camera</span>
                    )}
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              
              <div className="pb-4">
                <span className="text-xs font-semibold text-secondary uppercase tracking-[0.2em] mb-2 block">{ROLE_LABELS[userRole]}</span>
                <h1 className="text-5xl font-light text-on-surface mb-2">{userName}</h1>
                <p className="text-on-surface-variant max-w-md">
                  Ponte neural estabelecida. Padrões de ressonância atuais sugerem alta adaptabilidade em ambientes complexos.
                </p>
              </div>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Personal Records */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-8 aetheric-glass rounded-3xl p-10 flex flex-col min-h-[400px]"
              >
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">lock</span>
                    <h3 className="text-xl font-medium text-on-surface">Registros Pessoais</h3>
                  </div>
                  <button
                    onClick={() => setShowSessionModal(true)}
                    className="px-5 py-2 rounded-full border border-secondary/20 text-secondary text-xs uppercase tracking-[0.15em] font-semibold hover:bg-secondary/5 hover:border-secondary/40 transition-all"
                  >
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
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Rendimento Etérico</span>
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
                className="lg:col-span-12 glass-panel rounded-3xl p-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-on-surface-variant">fingerprint</span>
                  <h3 className="text-xl font-medium text-on-surface">Protocolos de Privacidade</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

              {/* Account Settings: Password, Role & Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-12 glass-panel rounded-3xl p-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-on-surface-variant">manage_accounts</span>
                  <h3 className="text-xl font-medium text-on-surface">Configurações da Conta</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Password Change */}
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-on-surface mb-4 uppercase tracking-[0.1em]">Alterar Senha</h4>
                    {!showPasswordForm ? (
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="cyan-ice-ghost py-3 rounded-xl text-xs font-semibold uppercase tracking-widest text-secondary hover:bg-secondary/5 transition-all"
                      >
                        Redefinir Senha
                      </button>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Nova senha (mín. 6 caracteres)"
                          className="bg-surface-container-lowest/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/30 focus:outline-none focus:border-secondary/50 transition-colors"
                        />
                        {passwordMsg && (
                          <p className={`text-xs ${passwordMsg.includes('sucesso') ? 'text-secondary' : 'text-error'}`}>
                            {passwordMsg}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handlePasswordChange}
                            disabled={passwordLoading}
                            className="flex-1 py-2.5 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary text-xs font-semibold uppercase tracking-widest hover:bg-secondary/20 disabled:opacity-50 transition-all"
                          >
                            {passwordLoading ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={() => { setShowPasswordForm(false); setPasswordMsg(null); }}
                            className="py-2.5 px-4 rounded-xl border border-white/10 text-on-surface-variant text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-on-surface mb-4 uppercase tracking-[0.1em]">
                      Papel na Instituição {roleLoading && <span className="text-secondary opacity-60">(Salvando...)</span>}
                    </h4>
                    <div className="flex flex-col gap-2">
                      {(['aluno', 'professor', 'orientador', 'administrador'] as UserRole[]).map(role => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(role)}
                          className={`py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${
                            userRole === role
                              ? 'bg-secondary/10 text-secondary border border-secondary/30'
                              : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'
                          }`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-on-surface mb-4 uppercase tracking-[0.1em]">Preferências de Notificação</h4>
                    <div className="flex flex-col gap-4">
                      {[
                        { label: 'Lembrete de Check-in Diário', state: notifCheckin, toggle: () => setNotifCheckin(v => !v) },
                        { label: 'Relatórios Disponíveis', state: notifReports, toggle: () => setNotifReports(v => !v) },
                        { label: 'Lembrete de Estudos', state: notifStudies, toggle: () => setNotifStudies(v => !v) },
                      ].map(item => (
                        <div
                          key={item.label}
                          onClick={item.toggle}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">{item.label}</span>
                          <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${item.state ? 'bg-secondary shadow-[0_0_10px_rgba(159,207,213,0.3)]' : 'bg-surface-variant border border-white/5'}`}>
                            <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-300 ${item.state ? 'right-1' : 'left-1 opacity-40'}`}></div>
                          </div>
                        </div>
                      ))}
                      <p className="text-[10px] text-on-surface-variant opacity-40 mt-2 leading-relaxed">
                        Os envios serão ativados quando o módulo de e-mail for configurado.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </PageTransition>
      </main>

      {/* Session Info Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSessionModal(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="aetheric-glass rounded-3xl p-10 max-w-lg w-full"
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <h3 className="text-xl font-medium text-on-surface">Dados da Sessão</h3>
              </div>

              <div className="flex flex-col gap-5">
                <div className="border-b border-white/5 pb-5">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Identidade</p>
                  <p className="text-lg font-light text-on-surface">{userName}</p>
                </div>
                <div className="border-b border-white/5 pb-5">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">E-mail</p>
                  <p className="text-base font-light text-on-surface">{userEmail ?? 'Não disponível'}</p>
                </div>
                <div className="border-b border-white/5 pb-5">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">ID do Nó</p>
                  <p className="text-xs font-mono text-secondary break-all">{userId ?? 'Não autenticado'}</p>
                </div>
                {sessionCreatedAt && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant opacity-60 mb-1">Conta Criada em</p>
                    <p className="text-base font-light text-on-surface">
                      {new Date(sessionCreatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSessionModal(false)}
                className="mt-10 w-full py-3 rounded-full border border-white/10 text-on-surface-variant text-xs uppercase tracking-widest font-semibold hover:bg-white/5 hover:text-on-surface transition-all"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
