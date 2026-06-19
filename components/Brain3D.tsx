'use client';

import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline/next';
import { motion } from 'framer-motion';
import { createClient } from '../utils/supabase/client';

export type BrainStatus = 'neutral' | 'positive' | 'attention' | 'alert';

interface Brain3DProps {
  initialStatus?: BrainStatus;
  className?: string;
}

export default function Brain3D({ initialStatus = 'neutral', className = '' }: Brain3DProps) {
  const [status, setStatus] = useState<BrainStatus>(initialStatus);
  const supabase = createClient();

  // Mapeamento de cores baseado no status (para a aura/glow externa)
  const statusColors = {
    neutral: 'rgba(159, 207, 213, 0.4)',   // Azul / Ciano
    positive: 'rgba(74, 222, 128, 0.4)',    // Verde Neon
    attention: 'rgba(250, 204, 21, 0.4)',   // Amarelo
    alert: 'rgba(248, 113, 113, 0.4)',      // Vermelho
  };

  const currentColor = statusColors[status];

  useEffect(() => {
    // Busca o último check-in do usuário para definir a cor do cérebro
    const fetchUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // Mantém o initialStatus se não estiver logado

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

      {/* Modelo 3D com Flutuação (Floating Animation) */}
      <motion.div 
        className="w-full h-full relative z-10 flex items-center justify-center"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Usando o iframe / scene do Spline com tamanhos forçados */}
        <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
          <Spline
            scene="https://prod.spline.design/zLb9m5GVmDdg9RTQ/scene.splinecode"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
