'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    // Estado inicial
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-black px-4 py-2 backdrop-blur-md shadow-lg flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)' }}
        >
          <span className="material-symbols-outlined text-sm font-bold">wifi_off</span>
          <span>Você está offline. Ações que exigem servidor precisam de conexão.</span>
        </motion.div>
      )}

      {justReconnected && !isOffline && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-50 bg-emerald-500/90 text-white px-4 py-2 backdrop-blur-md shadow-lg flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)' }}
        >
          <span className="material-symbols-outlined text-sm font-bold">wifi</span>
          <span>Conexão restabelecida. Seus dados estão sincronizando.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
