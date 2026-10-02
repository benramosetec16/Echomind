'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, AlertCircle, Languages } from 'lucide-react';
import { login, signup, requestPasswordReset, confirmPasswordReset } from './actions';

const t = {
  pt: {
    title: "Autenticação Segura Necessária",
    titleSignup: "Estabelecer Ponte Neural",
    titleForgot: "Recuperação Neural",
    titleOtp: "Validação de Identidade",
    titleReset: "Nova Frase-chave",
    loginBtn: "INICIAR ACESSO",
    signupBtn: "INICIALIZAR PROTOCOLO",
    forgotBtn: "SOLICITAR RECUPERAÇÃO",
    resetBtn: "REDEFINIR ACESSO",
    validating: "VALIDANDO...",
    granted: "ACESSO CONCEDIDO",
    noAccount: "Não tem uma conta? Cadastre-se",
    hasAccount: "Já tem uma conta? Faça Login",
    forgotPass: "Esqueceu sua frase-chave?",
    biometric: "Conexão Biométrica",
  },
  en: {
    title: "Secure Authentication Required",
    titleSignup: "Establish Neural Bridge",
    titleForgot: "Neural Recovery",
    titleOtp: "Identity Validation",
    titleReset: "New Keyphrase",
    loginBtn: "START ACCESS",
    signupBtn: "INITIALIZE PROTOCOL",
    forgotBtn: "REQUEST RECOVERY",
    resetBtn: "RESET ACCESS",
    validating: "VALIDATING...",
    granted: "ACCESS GRANTED",
    noAccount: "Don't have an account? Sign up",
    hasAccount: "Already have an account? Log in",
    forgotPass: "Forgot your keyphrase?",
    biometric: "Biometric Connection",
  }
};

export default function LoginPage() {
  const [locale, setLocale] = useState<'pt' | 'en'>('pt');
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'otp_reset'>('login');
  const [status, setStatus] = useState<'idle' | 'validating' | 'granted'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showBiometricToast, setShowBiometricToast] = useState(false);
  
  // States for OTP flow
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        const moveX = (e.clientX - window.innerWidth / 2) / 20;
        const moveY = (e.clientY - window.innerHeight / 2) / 20;
        glowRef.current.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('validating');
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      if (mode === 'login') {
        const result = await login(formData);
        if (result?.error) { setErrorMsg(result.error); setStatus('idle'); } 
        else { setStatus('granted'); }
      } 
      else if (mode === 'signup') {
        const result = await signup(formData);
        if (result?.error) { setErrorMsg(result.error); setStatus('idle'); } 
        else { setStatus('granted'); }
      }
      else if (mode === 'forgot') {
        const emailVal = (formData.get('email') as string)?.trim() || '';
        setRecoveryEmail(emailVal);
        const result = await requestPasswordReset(formData);
        if (result?.error) { setErrorMsg(result.error); setStatus('idle'); } 
        else {
          setSuccessMsg(locale === 'pt' ? 'Código de 6 dígitos enviado para seu e-mail.' : '6-digit code sent to your email.');
          setMode('otp_reset');
          setStatus('idle');
        }
      }
      else if (mode === 'otp_reset') {
        const result = await confirmPasswordReset(formData);
        if (result?.error) { setErrorMsg(result.error); setStatus('idle'); } 
        else {
          setSuccessMsg(locale === 'pt' ? 'Senha atualizada com sucesso! Faça o login.' : 'Password updated successfully! Please log in.');
          setMode('login');
          setStatus('idle');
        }
      }
    } catch (err) {
      setErrorMsg(locale === 'pt' ? 'Ocorreu uma disrupção neural. Tente novamente.' : 'A neural disruption occurred. Try again.');
      setStatus('idle');
    }
  };

  const toggleLanguage = () => setLocale(prev => prev === 'pt' ? 'en' : 'pt');

  const handleBiometricClick = () => {
    setShowBiometricToast(true);
    setTimeout(() => setShowBiometricToast(false), 3500);
  };

  const getTitle = () => {
    if (mode === 'login') return t[locale].title;
    if (mode === 'signup') return t[locale].titleSignup;
    if (mode === 'forgot') return t[locale].titleForgot;
    if (mode === 'otp_reset') return t[locale].titleReset;
    return t[locale].title;
  };

  const getButtonLabel = () => {
    if (mode === 'login') return t[locale].loginBtn;
    if (mode === 'signup') return t[locale].signupBtn;
    if (mode === 'forgot') return t[locale].forgotBtn;
    if (mode === 'otp_reset') return t[locale].resetBtn;
    return t[locale].loginBtn;
  };

  return (
    <>
      <button 
        type="button"
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-surface-container-low/50 hover:bg-surface-container-low border border-white/5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider text-on-surface-variant transition-all duration-300 backdrop-blur-md"
      >
        <Languages className="w-4 h-4" />
        {locale.toUpperCase()}
      </button>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-64 h-64 rounded-full bg-primary/20 blur-[60px]"
            />
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="relative text-4xl font-extralight tracking-tighter text-on-surface z-10"
            >
              EchoMind
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          ref={glowRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full transition-transform duration-75 ease-out opacity-60"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(91, 124, 255, 0.08) 0%, rgba(138, 108, 255, 0.04) 30%, rgba(8, 11, 18, 0) 70%)' }}
        />
      </div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative z-10 w-full max-w-[400px] mx-auto min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12"
      >
        <header className="text-center mb-8 mt-12">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.0, duration: 0.8 }}
            className="flex justify-center mb-4"
          >
            <img
              src="/echomind-logo.png"
              alt="EchoMind"
              className="w-20 h-20 object-contain"
            />
          </motion.div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            className="text-4xl font-light tracking-tighter bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent mb-2"
          >
            EchoMind
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.4, duration: 0.8 }}
            className="text-xs uppercase tracking-[0.2em] text-on-surface-variant opacity-60 font-semibold"
          >
            {getTitle()}
          </motion.p>
        </header>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.6, duration: 0.8 }}
          className="w-full rounded-2xl p-8 sm:p-10 relative overflow-hidden bg-surface-container-low/40 backdrop-blur-3xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_40px_rgba(91,124,255,0.03)]"
        >
          <AnimatePresence mode="popLayout">
            {errorMsg && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/20 p-3 flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-[10px] text-red-400 font-medium tracking-wider text-center px-2">{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && !errorMsg && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-0 left-0 right-0 bg-green-500/10 border-b border-green-500/20 p-3 flex items-center justify-center gap-2"
              >
                <span className="text-[10px] text-green-400 font-medium tracking-wider text-center px-2">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className={`flex flex-col gap-6 ${(errorMsg || successMsg) ? 'mt-6' : ''}`}>
            
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="group relative overflow-hidden flex flex-col gap-6"
                >
                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Designação (Nome Completo)
                    </label>
                    <div className="input-underline py-2">
                      <input name="fullName" type="text" required={mode === 'signup'} placeholder="João Silva" className="w-full bg-transparent border-none outline-none text-on-surface text-sm placeholder-on-surface-variant/30" />
                    </div>
                  </div>

                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Cargo
                    </label>
                    <div className="input-underline py-2">
                      <select name="role" required={mode === 'signup'} className="w-full bg-transparent border-none outline-none text-on-surface text-sm appearance-none cursor-pointer">
                        <option value="aluno" className="bg-surface-container text-on-surface">Aluno</option>
                        <option value="professor" className="bg-surface-container text-on-surface">Professor</option>
                        <option value="orientador" className="bg-surface-container text-on-surface">Orientador</option>
                        <option value="gestor" className="bg-surface-container text-on-surface">Gestor Institucional</option>
                        <option value="administrador" className="bg-surface-container text-on-surface">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Código Institucional
                    </label>
                    <div className="input-underline py-2">
                      <input name="institutionCode" type="text" placeholder="Ex: INST-001" className="w-full bg-transparent border-none outline-none text-on-surface text-sm placeholder-on-surface-variant/30 uppercase" />
                    </div>
                  </div>

                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Código de Sala / Turma
                    </label>
                    <div className="input-underline py-2">
                      <input name="classroomCode" type="text" placeholder="Ex: TURMA-A" className="w-full bg-transparent border-none outline-none text-on-surface text-sm placeholder-on-surface-variant/30 uppercase" />
                    </div>
                  </div>

                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Nome do Responsável
                    </label>
                    <div className="input-underline py-2">
                      <input name="guardianName" type="text" placeholder="Opcional" className="w-full bg-transparent border-none outline-none text-on-surface text-sm placeholder-on-surface-variant/30" />
                    </div>
                  </div>

                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Telefone do Responsável
                    </label>
                    <div className="input-underline py-2">
                      <input name="guardianPhone" type="text" placeholder="Opcional" className="w-full bg-transparent border-none outline-none text-on-surface text-sm placeholder-on-surface-variant/30" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {mode !== 'otp_reset' && (
              <div className="group relative">
                <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                  Identidade (Email)
                </label>
                <div className="input-underline py-2">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Identificador Universal"
                    className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder-on-surface-variant/30"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="group relative">
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant transition-colors group-focus-within:text-secondary">
                    Frase-chave (Senha)
                  </label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }} className="text-[9px] uppercase tracking-wider text-primary opacity-70 hover:opacity-100 transition-opacity">
                      {t[locale].forgotPass}
                    </button>
                  )}
                </div>
                <div className="input-underline py-2">
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder-on-surface-variant/30"
                  />
                </div>
              </div>
            )}

            {mode === 'otp_reset' && (
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col gap-6"
                >
                  <input type="hidden" name="email" value={recoveryEmail} />
                  
                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Código de Recuperação (OTP)
                    </label>
                    <div className="input-underline py-2">
                      <input
                        name="otp"
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Ex: 123456"
                        className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder-on-surface-variant/30 tracking-[0.5em] font-mono"
                      />
                    </div>
                  </div>

                  <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-1 transition-colors group-focus-within:text-secondary">
                      Nova Frase-chave
                    </label>
                    <div className="input-underline py-2">
                      <input
                        name="newPassword"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder-on-surface-variant/30"
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            <button
              type="submit"
              disabled={status !== 'idle'}
              className={`w-full py-4 rounded-xl text-[11px] uppercase tracking-[0.2em] font-bold mt-6 transition-all duration-300 relative overflow-hidden ${
                status === 'idle' ? 'bg-gradient-to-r from-primary to-tertiary text-white shadow-[0_0_20px_rgba(91,124,255,0.15)] hover:shadow-[0_0_30px_rgba(91,124,255,0.3)] hover:brightness-110 active:scale-[0.98]' : 
                status === 'validating' ? 'bg-primary/40 text-white/60 cursor-not-allowed shadow-none' : 
                'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
              }`}
            >
              {status === 'idle' && getButtonLabel()}
              {status === 'validating' && t[locale].validating}
              {status === 'granted' && t[locale].granted}
            </button>

            <div className="flex flex-col items-center gap-4 mt-2">
              <div className="w-px h-8 bg-gradient-to-b from-outline-variant/30 to-transparent"></div>
              
              <button 
                type="button" 
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-secondary transition-colors"
              >
                {mode === 'login' ? t[locale].noAccount : t[locale].hasAccount}
              </button>

              <button
                type="button"
                onClick={handleBiometricClick}
                className="flex items-center gap-3 text-on-surface-variant hover:text-secondary transition-colors group mt-2"
              >
                <Fingerprint className="w-5 h-5 text-secondary/60 pulse-slow group-hover:text-secondary transition-colors" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold opacity-70 group-hover:opacity-100 transition-opacity">{t[locale].biometric}</span>
              </button>
            </div>
          </form>
        </motion.div>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="mt-8 text-center opacity-30"
        >
          <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-on-surface-variant">
            © PROTOCOLO NEURAL ECHOMIND
          </p>
        </motion.footer>
      </motion.main>

      <AnimatePresence>
        {showBiometricToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface-container-low/90 backdrop-blur-md border border-white/5 px-5 py-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          >
            <Fingerprint className="w-4 h-4 text-secondary" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant">
              {locale === 'pt' ? 'Biometria disponível em breve' : 'Biometrics coming soon'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}