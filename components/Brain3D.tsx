'use client';

import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline/next';
import { motion, AnimatePresence } from 'framer-motion';

export type BrainStatus = 'neutral' | 'positive' | 'attention' | 'alert';

interface Brain3DProps {
  status?: BrainStatus;
  className?: string;
}

export default function Brain3D({ status = 'neutral', className = '' }: Brain3DProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Mapeamento de cores baseado no status (para a aura/glow externa)
  const statusColors = {
    neutral: 'rgba(159, 207, 213, 0.4)',   // Azul / Ciano
    positive: 'rgba(74, 222, 128, 0.4)',    // Verde Neon
    attention: 'rgba(250, 204, 21, 0.4)',   // Amarelo
    alert: 'rgba(248, 113, 113, 0.4)',      // Vermelho
  };

  const currentColor = statusColors[status];

  // Removemos o loading state após um breve delay simulado ou onLoad do Spline
  // O Spline dispara o onLoad nativamente, mas podemos garantir uma transição suave.
  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative w-full h-[400px] md:h-[600px] flex items-center justify-center ${className}`}>
      {/* Container de Efeitos Visuais (Aura/Glow) */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none rounded-full blur-[100px]"
        animate={{ 
          backgroundColor: currentColor,
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />

      {/* Tela de Loading (Glassmorphism) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md rounded-3xl border border-white/5"
          >
            <div className="w-16 h-16 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4" />
            <span className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold animate-pulse">
              Calibrando Conexões Neurais...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modelo 3D com Flutuação (Floating Animation) */}
      <motion.div 
        className="w-full h-full relative z-10"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Spline
          scene="https://prod.spline.design/zLb9m5GVmDdg9RTQ/scene.splinecode"
          onLoad={handleLoad}
          className="w-full h-full object-contain"
        />
      </motion.div>
    </div>
  );
}
