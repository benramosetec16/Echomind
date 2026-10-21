'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está em modo standalone (PWA instalado)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // 2. Verifica se o usuário dispensou recentemente (últimos 7 dias)
    const dismissedAt = localStorage.getItem('echomind_pwa_dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // 3. Detecção iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Apresentar de forma discreta após 25 segundos
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 25000);
      return () => clearTimeout(timer);
    }

    // 4. Detecção Chromium / Android / Desktop (beforeinstallprompt)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Mostrar após 15 segundos de engajamento do usuário
      setTimeout(() => {
        setShowPrompt(true);
      }, 15000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Erro na instalação:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('echomind_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.3 }}
        aria-label="Sugestão de instalação do aplicativo"
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40"
      >
        <div className="aetheric-glass rounded-2xl p-4 md:p-5 border border-secondary/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0 border border-white/10 flex items-center justify-center p-1">
              <img src="/echomind-logo.png" alt="EchoMind" className="w-full h-full object-contain" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  Aplicativo PWA
                </span>
                <button
                  onClick={handleDismiss}
                  className="text-on-surface-variant hover:text-on-surface p-1 text-sm rounded-lg"
                  aria-label="Fechar aviso de instalação"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <p className="text-xs text-on-surface-variant leading-snug mb-3">
                Instale o EchoMind no seu dispositivo para acessar mais rapidamente.
              </p>

              {showIOSInstructions ? (
                <div className="bg-surface-container/60 rounded-xl p-3 border border-white/5 text-[11px] text-on-surface-variant space-y-1 mb-2">
                  <p className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-secondary">ios_share</span>
                    Como instalar no iPhone:
                  </p>
                  <p>1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari.</p>
                  <p>2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</p>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2 px-3 bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-secondary text-xs font-semibold rounded-xl tracking-wide uppercase transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Instalar EchoMind
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2 px-3 text-on-surface-variant/70 hover:text-on-surface text-xs rounded-xl transition-colors min-h-[38px]"
                >
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
