'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';
import { getUserRole, updateUserRole, ROLE_LABELS, type UserRole } from '../../../utils/roles';
import { useAccessibility } from '@/components/AccessibilityProvider';

export default function ProfilePage() {
  const supabase = createClient();
  const { preferences, updatePreferences } = useAccessibility();

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

  // Mock metrics
  const [metrics, setMetrics] = useState({ focusLatency: 0.14, syncIntegrity: 99.8, aethericYield: 8.2 });

  // Guardian contact
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [guardianMsg, setGuardianMsg] = useState<string | null>(null);

  // Preferências de atendimento (Protect — campo de gênero)
  const [userGender, setUserGender] = useState<string | null>(null);
  const [savingGender, setSavingGender] = useState(false);
  const [genderMsg, setGenderMsg] = useState<string | null>(null);
  const [genderReminderDismissed, setGenderReminderDismissed] = useState(false);

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

          // Avatar from Supabase Storage
          const avatarPath = `avatars/${session.user.id}`;
          const extensions = ['jpg', 'jpeg', 'png', 'webp'];
          for (const ext of extensions) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(`${avatarPath}.${ext}`);
            if (urlData?.publicUrl) {
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

            setGuardianName(data.guardian_name ?? '');
            setGuardianPhone(data.guardian_phone ?? '');
            setUserGender(data.gender ?? null);

            if (data.avatar_url) {
              setAvatarUrl(data.avatar_url + '?t=' + Date.now());
            }
          } else if (error && error.code !== 'PGRST116') {
            console.error("Error loading profile:", error.message);
          }
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
    getUserRole().then(setUserRole);
  }, [supabase]);

  const updateProfile = async (updates: Record<string, unknown>) => {
    if (!userId) return;
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
    } catch (err: unknown) {
      console.error('Avatar upload error:', err);
    } finally {
      setAvatarUploading(false);
    }
  };

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

  const handleRoleChange = async (role: UserRole) => {
    setRoleLoading(true);
    setUserRole(role);
    await updateUserRole(role);
    setRoleLoading(false);
  };

  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) return;
    setSavingGuardian(true);
    setGuardianMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ guardian_name: guardianName.trim(), guardian_phone: guardianPhone.trim() })
      .eq('id', userId!);
    if (error) {
      setGuardianMsg('Erro ao salvar: ' + error.message);
    } else {
      setGuardianMsg('Contato salvo com sucesso!');
      setTimeout(() => setGuardianMsg(null), 3000);
    }
    setSavingGuardian(false);
  };

  const handleSaveGender = async (value: string | null) => {
    if (!userId) return;
    setSavingGender(true);
    setGenderMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ gender: value })
      .eq('id', userId);
    if (error) {
      setGenderMsg('Erro ao salvar: ' + error.message);
    } else {
      setUserGender(value);
      setGenderMsg('Salvo com sucesso!');
      setTimeout(() => setGenderMsg(null), 3000);
    }
    setSavingGender(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background text-secondary">
         <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
       </div>
     );
  }

  // Componente de Switch / Toggle com touch target >= 44px
  const ToggleRow = ({ enabled, onToggle, label, description, icon }: {
    enabled: boolean; onToggle: () => void; label: string; description?: string; icon?: string;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.99] min-h-[52px] ${
        enabled
          ? 'bg-secondary/[0.08] border-secondary/30'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
      }`}
      aria-pressed={enabled}
      role="switch"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <span className={`material-symbols-outlined text-xl flex-shrink-0 ${enabled ? 'text-secondary' : 'text-on-surface-variant/50'}`}>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium text-on-surface block leading-tight">{label}</span>
            {description && (
              <span className="text-xs text-on-surface-variant/60 mt-1 block leading-relaxed">{description}</span>
            )}
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors duration-300 ${
          enabled ? 'bg-secondary shadow-[0_0_12px_rgba(56,214,197,0.3)]' : 'bg-surface-variant border border-white/10'
        }`}>
          <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-300 ${
            enabled ? 'right-[3px]' : 'left-[3px] opacity-40'
          }`} />
        </div>
      </div>
    </button>
  );

  // Cartão de Seção vertical e limpo
  const CardSection = ({ title, icon, children, delay = 0 }: {
    title: string; icon: string; children: React.ReactNode; delay?: number;
  }) => (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="glass-panel rounded-2xl md:rounded-3xl overflow-hidden p-5 md:p-8"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-secondary text-lg">{icon}</span>
        </div>
        <h3 className="text-base md:text-lg font-medium text-on-surface">{title}</h3>
      </div>
      <div>
        {children}
      </div>
    </motion.section>
  );

  return (
    <>
      <TopBar title="Meu Perfil" showBack />
      <main className="pt-20 md:pt-32 px-4 md:px-12 pb-28 md:pb-24 relative min-h-screen">
        <PageTransition>
          <div className="max-w-[760px] mx-auto space-y-5 md:space-y-6">

            {/* Aviso para usuário não logado */}
            {!userId && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                 <span className="material-symbols-outlined text-red-400 flex-shrink-0 text-xl">warning</span>
                 <div>
                    <h4 className="text-red-400 font-medium text-sm">Autenticação Obrigatória</h4>
                    <p className="text-red-400/80 text-xs mt-1">Conecte-se para que suas alterações fiquem salvas.</p>
                 </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* 1. CARD PRINCIPAL — ÁREA DE IDENTIDADE          */}
            {/* ═══════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl md:rounded-3xl p-5 md:p-8 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 md:gap-8">
                {/* Avatar com touch target confortável */}
                <div
                  className="relative group/avatar cursor-pointer flex-shrink-0"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Alterar foto de perfil"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full border-2 border-secondary/30 relative z-10 overflow-hidden bg-surface-container flex items-center justify-center shadow-[0_0_24px_rgba(56,214,197,0.15)]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl sm:text-3xl md:text-5xl text-secondary font-light tracking-tight">{userInitials}</span>
                    )}
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover/avatar:opacity-100 active:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-secondary">
                      {avatarUploading ? (
                        <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-2xl">photo_camera</span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold">Alterar</span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    aria-label="Alterar foto de perfil"
                  />
                </div>

                {/* Identidade detalhada */}
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary/10 border border-secondary/25 text-secondary text-[10px] font-bold uppercase tracking-widest mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    {ROLE_LABELS[userRole]}
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-on-surface mb-1 break-words">
                    {userName}
                  </h1>

                  <p className="text-xs sm:text-sm text-on-surface-variant/80 break-all mb-3">
                    {userEmail || 'E-mail não informado'}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-on-surface-variant/60">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                      {userId ? 'Conta Verificada' : 'Modo Visitante'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão para ver sessão */}
              <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <span className="text-xs text-on-surface-variant/60 text-center sm:text-left">
                  Conexão segura com criptografia ponta a ponta.
                </span>
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="px-4 py-2.5 rounded-xl border border-secondary/30 text-secondary text-xs uppercase tracking-wider font-semibold hover:bg-secondary/10 transition-all active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">key</span>
                  Ver dados da sessão
                </button>
              </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════ */}
            {/* 2. INFORMAÇÕES DA CONTA                          */}
            {/* ═══════════════════════════════════════════════ */}
            <CardSection title="Informações da Conta" icon="account_circle" delay={0.1}>
              <div className="space-y-4">
                <div className="bg-surface-container/40 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-1">
                    Nome Completo
                  </span>
                  <p className="text-sm font-medium text-on-surface">{userName}</p>
                </div>

                <div className="bg-surface-container/40 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-1">
                    E-mail Institucional
                  </span>
                  <p className="text-sm font-medium text-on-surface break-all">{userEmail || '—'}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-2">
                    Papel / Função no Sistema {roleLoading && <span className="text-secondary">(Atualizando...)</span>}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['aluno', 'professor', 'orientador', 'administrador'] as UserRole[]).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleChange(role)}
                        disabled={roleLoading}
                        className={`py-3 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95 min-h-[46px] border text-center ${
                          userRole === role
                            ? 'bg-secondary/15 text-secondary border-secondary/40 shadow-[0_0_12px_rgba(56,214,197,0.1)]'
                            : 'bg-white/[0.02] text-on-surface-variant/70 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardSection>

            {/* ═══════════════════════════════════════════════ */}
            {/* 3. ACESSIBILIDADE — SEÇÃO PRÓPRIA               */}
            {/* ═══════════════════════════════════════════════ */}
            <CardSection title="Acessibilidade" icon="accessibility_new" delay={0.15}>
              <div className="space-y-4">
                {/* Tamanho da Fonte */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-2">
                    Tamanho do Texto
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'small' as const, label: 'Pequeno' },
                      { id: 'medium' as const, label: 'Padrão' },
                      { id: 'large' as const, label: 'Grande' },
                      { id: 'x-large' as const, label: 'Muito Grande' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updatePreferences({ font_size: f.id })}
                        className={`py-3 px-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 min-h-[46px] border text-center ${
                          preferences.font_size === f.id
                            ? 'bg-secondary/15 text-secondary border-secondary/40'
                            : 'bg-white/[0.02] text-on-surface-variant/70 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles de acessibilidade */}
                <div className="space-y-2.5 pt-2">
                  <ToggleRow
                    enabled={preferences.high_contrast}
                    onToggle={() => updatePreferences({ high_contrast: !preferences.high_contrast })}
                    label="Alto Contraste"
                    description="Eleva o contraste visual para facilitar a leitura em telas escuras ou sob luz forte."
                    icon="contrast"
                  />
                  <ToggleRow
                    enabled={preferences.reduced_motion}
                    onToggle={() => updatePreferences({ reduced_motion: !preferences.reduced_motion })}
                    label="Redução de Movimento"
                    description="Diminui ou remove transições dinâmicas e efeitos visuais contínuos."
                    icon="motion_photos_off"
                  />
                  <ToggleRow
                    enabled={preferences.simplified_interface}
                    onToggle={() => updatePreferences({ simplified_interface: !preferences.simplified_interface })}
                    label="Interface Simplificada"
                    description="Oculta brilhos etéricos decorativos e foca nos conteúdos essenciais."
                    icon="view_agenda"
                  />
                </div>

                {/* Estilo de Check-in */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-2">
                    Modo do Check-in
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'standard' as const, label: 'Slider Neural', desc: 'Controle contínuo' },
                      { id: 'visual' as const, label: 'Visual / Emojis', desc: 'Seleção por cartões' },
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => updatePreferences({ checkin_style: st.id })}
                        className={`p-3 rounded-xl border text-left transition-all active:scale-95 min-h-[50px] ${
                          preferences.checkin_style === st.id
                            ? 'bg-secondary/15 border-secondary/40 text-secondary'
                            : 'bg-white/[0.02] border-white/5 text-on-surface-variant/70'
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider">{st.label}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{st.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* VLibras notice */}
                <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-xl flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-lg flex-shrink-0">sign_language</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    <strong>VLibras integrado:</strong> Use o avatar flutuante de tradução em Libras no canto da tela a qualquer momento.
                  </p>
                </div>
              </div>
            </CardSection>

            {/* ═══════════════════════════════════════════════ */}
            {/* 4. PREFERÊNCIAS E FEEDBACK DA INTERFACE         */}
            {/* ═══════════════════════════════════════════════ */}
            <CardSection title="Preferências do Sistema" icon="tune" delay={0.2}>
              <div className="space-y-6">
                {/* Intensidade Háptica */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">
                      Resposta Háptica / Vibração
                    </span>
                    <span className="text-xs font-mono text-secondary font-bold">{hapticIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hapticIntensity}
                    onChange={(e) => setHapticIntensity(parseInt(e.target.value))}
                    onMouseUp={(e) => handleHapticChange(parseInt((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => handleHapticChange(parseInt((e.target as HTMLInputElement).value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-secondary min-h-[44px]"
                    aria-label="Intensidade háptica"
                  />
                </div>

                {/* Sincronização */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-2">
                    Frequência de Sincronia de Dados
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'instant' as const, label: 'Instantânea' },
                      { value: 'hourly' as const, label: 'Por Hora' },
                      { value: 'manual' as const, label: 'Manual' },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSyncChange(opt.value)}
                        className={`py-3 rounded-xl text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 min-h-[46px] border ${
                          syncFrequency === opt.value
                            ? 'bg-secondary/15 text-secondary border-secondary/40'
                            : 'bg-white/[0.02] text-on-surface-variant/70 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notificações */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-2">
                    Notificações do Aplicativo
                  </span>
                  <div className="space-y-2">
                    <ToggleRow
                      enabled={notifCheckin}
                      onToggle={() => setNotifCheckin(v => !v)}
                      label="Lembrete de Check-in Diário"
                      description="Aviso para registrar seu estado emocional."
                      icon="notifications"
                    />
                    <ToggleRow
                      enabled={notifReports}
                      onToggle={() => setNotifReports(v => !v)}
                      label="Relatórios Disponíveis"
                      description="Notificação quando análises periódicas forem geradas."
                      icon="insights"
                    />
                    <ToggleRow
                      enabled={notifStudies}
                      onToggle={() => setNotifStudies(v => !v)}
                      label="Lembrete de Estudos"
                      description="Incentivos para rotina de foco e aprendizagem."
                      icon="school"
                    />
                  </div>
                </div>
              </div>
            </CardSection>

            {/* ═══════════════════════════════════════════════ */}
            {/* 5. PROTOCOLOS DE PRIVACIDADE                    */}
            {/* ═══════════════════════════════════════════════ */}
            <CardSection title="Privacidade e Dados" icon="fingerprint" delay={0.25}>
              <div className="space-y-2.5">
                <ToggleRow
                  enabled={ghostMode}
                  onToggle={toggleGhostMode}
                  label="Modo Fantasma"
                  description="Oculta ressonância emocional de todos os pares conectados."
                  icon="visibility_off"
                />
                <ToggleRow
                  enabled={ephemeralHistory}
                  onToggle={toggleEphemeralHistory}
                  label="Histórico Efêmero"
                  description="Exclusão automática de registros neurais após 24 horas."
                  icon="history_edu"
                />
                <ToggleRow
                  enabled={aethericProxy}
                  onToggle={toggleAethericProxy}
                  label="Proxy Etérico"
                  description="Encaminha dados biométricos através de nós seguros descentralizados."
                  icon="security"
                />
                <ToggleRow
                  enabled={localArchiving}
                  onToggle={toggleLocalArchiving}
                  label="Arquivamento Local"
                  description="Armazena registros cognitivos exclusivamente no hardware do dispositivo."
                  icon="cloud_off"
                />
              </div>
            </CardSection>

            {/* ═══════════════════════════════════════════════ */}
            {/* 6. CONTATO DO RESPONSÁVEL                       */}
            {/* ═══════════════════════════════════════════════ */}
            <CardSection title="Contato do Responsável" icon="contact_phone" delay={0.3}>
              {!guardianPhone && (
                <div className="mb-4 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                    Nenhum contato cadastrado ainda
                  </span>
                </div>
              )}
              <p className="text-xs text-on-surface-variant/80 mb-4 leading-relaxed">
                Dados visíveis apenas para seu orientador institucional para acompanhamento emocional em momentos necessários.
              </p>

              <form onSubmit={handleSaveGuardian} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/70 mb-1.5">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={e => setGuardianName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    required
                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-yellow-400/50 transition-colors min-h-[46px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/70 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={guardianPhone}
                    onChange={e => setGuardianPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    required
                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-yellow-400/50 transition-colors min-h-[46px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingGuardian || !guardianName.trim() || !guardianPhone.trim()}
                  className="w-full py-3.5 bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 font-semibold rounded-xl text-xs uppercase tracking-wider hover:bg-yellow-400/25 transition-all disabled:opacity-40 min-h-[48px] active:scale-[0.99]"
                >
                  {savingGuardian ? 'Salvando...' : 'Salvar Contato do Responsável'}
                </button>
                {guardianMsg && (
                  <p className={`text-xs text-center pt-1 ${guardianMsg.includes('sucesso') ? 'text-secondary font-semibold' : 'text-red-400'}`}>
                    {guardianMsg}
                  </p>
                )}
              </form>
            </CardSection>

            {/* ═══════════════════════════════════════════════ */}
            {/* 7. ATENDIMENTO (Orientadores/Gestores)          */}
            {/* ═══════════════════════════════════════════════ */}
            {['orientador', 'gestor', 'administrador'].includes(userRole) && (
              <CardSection title="Preferências de Atendimento" icon="shield_person" delay={0.33}>
                <p className="text-xs text-on-surface-variant/80 mb-4 leading-relaxed">
                  Permite que alunos localizem profissionais de acordo com sua preferência de atendimento no módulo Protect.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block">
                    Gênero Informado
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'woman', label: 'Mulher' },
                      { value: 'man', label: 'Homem' },
                      { value: 'other', label: 'Outro' },
                      { value: 'prefer_not_to_say', label: 'Prefiro não informar' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSaveGender(userGender === opt.value ? null : opt.value)}
                        disabled={savingGender}
                        className={`py-3 px-3 rounded-xl text-xs font-semibold transition-all text-left border disabled:opacity-50 active:scale-95 min-h-[46px] ${
                          userGender === opt.value
                            ? 'bg-secondary/15 text-secondary border-secondary/40'
                            : 'bg-white/[0.02] text-on-surface-variant/70 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {genderMsg && (
                    <p className={`text-xs pt-1 ${genderMsg.includes('sucesso') ? 'text-secondary font-semibold' : 'text-red-400'}`}>
                      {genderMsg}
                    </p>
                  )}
                </div>
              </CardSection>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* 8. SEGURANÇA E ACESSO                           */}
            {/* ═══════════════════════════════════════════════ */}
            <CardSection title="Segurança da Conta" icon="security" delay={0.35}>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant/60 block mb-2">
                    Frase-chave de Acesso (Senha)
                  </span>
                  {!showPasswordForm ? (
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(true)}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider text-secondary border border-secondary/30 hover:bg-secondary/10 transition-all active:scale-[0.99] min-h-[46px]"
                    >
                      Alterar Senha
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Nova senha (mínimo 6 caracteres)"
                        className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary/50 transition-colors min-h-[46px]"
                      />
                      {passwordMsg && (
                        <p className={`text-xs ${passwordMsg.includes('sucesso') ? 'text-secondary' : 'text-error'}`}>
                          {passwordMsg}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handlePasswordChange}
                          disabled={passwordLoading}
                          className="flex-1 py-3 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary text-xs font-semibold uppercase tracking-wider hover:bg-secondary/25 transition-all min-h-[44px] active:scale-95"
                        >
                          {passwordLoading ? 'Salvando...' : 'Confirmar Nova Senha'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPasswordForm(false); setPasswordMsg(null); }}
                          className="py-3 px-4 rounded-xl border border-white/10 text-on-surface-variant text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-all min-h-[44px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-4 rounded-2xl border border-red-500/25 bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-[0.99] min-h-[50px] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Sair da Conta
                  </button>
                </div>
              </div>
            </CardSection>

          </div>
        </PageTransition>
      </main>

      {/* Modal / Bottom Sheet para dados de sessão */}
      <AnimatePresence>
        {showSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSessionModal(false)}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-background/80 backdrop-blur-md p-0 md:p-4"
          >
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="aetheric-glass rounded-t-3xl md:rounded-3xl p-6 md:p-8 w-full md:max-w-lg max-h-[85vh] overflow-y-auto border-t md:border border-white/10 shadow-2xl"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 24px)' }}
            >
              {/* Puxador no mobile */}
              <div className="flex justify-center mb-4 md:hidden">
                <div className="w-12 h-1 rounded-full bg-white/20" />
              </div>

              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <h3 className="text-lg md:text-xl font-medium text-on-surface">Dados da Sessão</h3>
              </div>

              <div className="space-y-4 text-left">
                <div className="bg-surface-container/50 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">Identidade</p>
                  <p className="text-sm font-medium text-on-surface">{userName}</p>
                </div>
                <div className="bg-surface-container/50 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">E-mail</p>
                  <p className="text-sm font-medium text-on-surface break-all">{userEmail ?? 'Não disponível'}</p>
                </div>
                <div className="bg-surface-container/50 p-3.5 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">ID de Usuário (UUID)</p>
                  <p className="text-[11px] font-mono text-secondary break-all">{userId ?? 'Não autenticado'}</p>
                </div>
                {sessionCreatedAt && (
                  <div className="bg-surface-container/50 p-3.5 rounded-xl border border-white/5">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">Conta Criada em</p>
                    <p className="text-sm font-medium text-on-surface">
                      {new Date(sessionCreatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className="mt-6 w-full py-3.5 rounded-xl border border-white/10 text-on-surface-variant text-xs uppercase tracking-widest font-semibold hover:bg-white/5 hover:text-on-surface transition-all active:scale-[0.99] min-h-[48px]"
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
