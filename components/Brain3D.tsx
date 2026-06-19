'use client';

import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline/next';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '../utils/supabase/client';

export type BrainStatus = 'neutral' | 'positive' | 'attention' | 'alert';

interface Brain3DProps {
  initialStatus?: BrainStatus;
  className?: string;
}

export default function Brain3D({ initialStatus = 'neutral', className = '' }: Brain3DProps) {
  const [status, setStatus] = useState<BrainStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Cores de diagnóstico
  const statusColors = {
    neutral: 'rgba(159, 207, 213, 0.4)',   // Azul
    positive: 'rgba(74, 222, 128, 0.4)',    // Verde
    attention: 'rgba(250, 204, 21, 0.4)',   // Amarelo
    alert: 'rgba(248, 113, 113, 0.4)',      // Vermelho
  };

  const currentColor = statusColors[status];

  useEffect(() => {
    // Diagnóstico de Sistema: Conecta com a análise real-time do usuário
    const fetchUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: checkins } = await supabase
        .from('emotional_checkins')
        .select('valence_value')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkins && checkins.length > 0) {
        const valence = checkins[0].valence_value;
        if (valence >= 70) setStatus('positive');
        else if (valence >= 40) setStatus('neutral');
        else if (valence >= 20) setStatus('attention');
        else setStatus('alert');
      }
    };
    fetchUserStatus();
  }, [supabase]);

  // Fallback timeout para garantir que o loading suma caso o Spline demore ou falhe o onLoad
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative w-full h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center ${className}`}>
      
      {/* Glow de Status Emocional */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none rounded-full blur-[100px]"
        animate={{ 
          backgroundColor: currentColor,
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Loading Skeleton Fallback */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-3xl"
          >
            <div className="w-12 h-12 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4" />
            <span className="text-secondary text-xs uppercase tracking-widest font-semibold animate-pulse">
              Iniciando Motor Neural...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cérebro 3D */}
      <motion.div 
        className="absolute inset-0 z-10 w-full h-full flex items-center justify-center"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Spline
          scene="https://prod.spline.design/FoVRT01nXlAKzsUa/scene.splinecode"
          onLoad={() => setIsLoading(false)}
          style={{ width: '100%', height: '100%' }}
        />
      </motion.div>
    </div>
  );
}
