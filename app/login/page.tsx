'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, AlertCircle, Languages } from 'lucide-react';
import { login, signup } from './actions';

// Objeto simples com os textos em Português e Inglês
const t = {
  pt: {
    title: "Autenticação Segura Necessária",
    titleSignup: "Estabelecer Ponte Neural",
    loginBtn: "INICIAR ACESSO",
    signupBtn: "INICIALIZAR PROTOCOLO",
    validating: "VALIDANDO...",
    granted: "ACESSO CONCEDIDO",
    noAccount: "Não tem uma conta? Cadastre-se",
    hasAccount: "Já tem uma conta? Faça Login",
    biometric: "Conexão Biométrica",
  },
  en: {
    title: "Secure Authentication Required",
    titleSignup: "Establish Neural Bridge",
    loginBtn: "START ACCESS",
    signupBtn: "INITIALIZE PROTOCOL",
    validating: "VALIDATING...",
    granted: "ACCESS GRANTED",
    noAccount: "Don't have an account? Sign up",
    hasAccount: "Already have an account? Log in",
    biometric: "Biometric Connection",
  }
};

export default function LoginPage() {
  // Estado para controlar o idioma ('pt' ou 'en')
  const [locale, setLocale] = useState<'pt' | 'en'>('pt');
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [status, setStatus] = useState<'idle' | 'validating' | 'granted'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showBiometricToast, setShowBiometricToast] = useState(false);
  
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
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = mode === 'login' ? await login(formData) : await signup(formData);
      
      if (result?.error) {
        setErrorMsg(result.error);
        setStatus('idle');
      } else {
        setStatus('granted');
      }
    } catch (err) {
      setErrorMsg('Ocorreu uma disrupção neural. Tente novamente.');
      setStatus('idle');
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setErrorMsg(null);
    setStatus('idle');
  };

  // Função para alternar o idioma ao clicar no botão
  const toggleLanguage = () => {
    setLocale(prev => prev === 'pt' ? 'en' : 'pt');
  };

  const handleBiometricClick = () => {
    setShowBiometricToast(true);
    setTimeout(() => setShowBiometricToast(false), 3500);
  };

  return (
    <>
      {/* Botão Flutuante para Mudar de Idioma */}
      <button 
        type="button"
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300"
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
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-64 h-64 rounded-full bg-secondary/10 blur-[60px]"
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full transition-transform duration-75 ease-out"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(159, 207, 213, 0.08) 0%, rgba(18, 20, 20, 0) 70%)' }}
        />
      </div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative z-10 w-full max-w-[420px] mx-auto min-h-screen flex flex-col items-center justify-center px-6"
      >
        <header className="text-center mb-8">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            className="text-5xl font-extralight tracking-tighter text-primary mb-2"
          >
            EchoMind
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.4, duration: 0.8 }}
            className="text-xs uppercase tracking-[0.2em] text-on-surface-variant opacity-60 font-semibold"
          >
            {mode === 'login' ? t[locale].title : t[locale].titleSignup}
          </motion.p>
        </header>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.6, duration: 0.8 }}
          className="glass-panel w-full rounded-[24px] p-10 relative overflow-hidden"
        >
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/20 p-3 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-medium tracking-wider">{errorMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className={`flex flex-col gap-8 ${errorMsg ? 'mt-4' : ''}`}>
            
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="group relative overflow-hidden"
                >
                  <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
                    Designação (Nome Completo)
                  </label>
                  <div className="input-underline py-2">
                    <input
                      name="fullName"
                      type="text"
                      required={mode === 'signup'}
                      placeholder="João Silva"
                      className="w-full bg-transparent border-none outline-none text-on-surface placeholder-on-surface-variant/30"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="group relative">
              <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
                Identidade (Email)
              </label>
              <div className="input-underline py-2">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Identificador Universal"
                  className="w-full bg-transparent border-none outline-none text-on-surface placeholder-on-surface-variant/30"
                />
              </div>
            </div>

            <div className="group relative">
              <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
                Frase-chave (Senha)
              </label>
              <div className="input-underline py-2">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent border-none outline-none text-on-surface placeholder-on-surface-variant/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status !== 'idle'}
              className={`cyan-ice-ghost w-full py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-semibold mt-4 transition-all duration-300 ${
                status === 'idle' ? 'text-secondary hover:border-secondary/60' : 
                status === 'validating' ? 'text-secondary opacity-50' : 
                'bg-secondary/10 text-secondary border-secondary/30 shadow-[0_0_20px_rgba(159,207,213,0.2)]'
              }`}
            >
              {status === 'idle' && (mode === 'login' ? t[locale].loginBtn : t[locale].signupBtn)}
              {status === 'validating' && t[locale].validating}
              {status === 'granted' && t[locale].granted}
            </button>

            <div className="flex flex-col items-center gap-4 mt-2">
              <div className="w-px h-8 bg-gradient-to-b from-outline-variant/30 to-transparent"></div>
              
              <button 
                type="button" 
                onClick={toggleMode}
                className="text-xs text-on-surface-variant hover:text-secondary transition-colors underline underline-offset-4"
              >
                {mode === 'login' ? t[locale].noAccount : t[locale].hasAccount}
              </button>

              <button
                type="button"
                onClick={handleBiometricClick}
                className="flex items-center gap-3 text-on-surface-variant hover:text-secondary transition-colors group mt-2"
              >
                <Fingerprint className="w-5 h-5 text-secondary pulse-effect" />
                <span className="text-xs uppercase tracking-[0.15em] font-semibold">{t[locale].biometric}</span>
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
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-on-surface-variant">
            © PROTOCOLO NEURAL ECHOMIND
          </p>
        </motion.footer>
      </motion.main>

      {/* Biometric Toast */}
      <AnimatePresence>
        {showBiometricToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface-container border border-secondary/20 px-5 py-3 rounded-full shadow-[0_0_30px_rgba(159,207,213,0.15)]"
          >
            <Fingerprint className="w-4 h-4 text-secondary" />
            <span className="text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant">
              {locale === 'pt' ? 'Biometria disponível em breve' : 'Biometrics coming soon'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}