'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Registra após o carregamento da página para não concorrer com recursos críticos
    const handleLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Checa se há trabalhador aguardando ativação
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setShowUpdateToast(true);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setShowUpdateToast(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    };

    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateToast(false);
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdateToast && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 max-w-sm aetheric-glass rounded-2xl p-4 border border-secondary/30 shadow-2xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-secondary text-xl">update</span>
            <div className="text-xs">
              <p className="font-semibold text-on-surface">Nova versão disponível</p>
              <p className="text-on-surface-variant text-[11px]">Atualize para carregar melhorias.</p>
            </div>
          </div>
          <button
            onClick={handleUpdate}
            className="px-3 py-1.5 bg-secondary text-black font-semibold text-xs rounded-xl hover:bg-secondary/90 transition-all uppercase tracking-wider"
          >
            Atualizar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
