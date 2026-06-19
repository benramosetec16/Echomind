'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Brain3D from './Brain3D';

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center pt-20 pb-16 px-6 md:px-12 lg:px-24 overflow-hidden">
      <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center z-10">
        
        {/* Left Column: Typography & CTAs */}
        <motion.div 
          className="flex flex-col items-center text-center lg:items-start lg:text-left order-2 lg:order-1"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/30 bg-secondary/10 backdrop-blur-md mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs uppercase tracking-[0.15em] font-semibold text-secondary">
              Inteligência Emocional Neural
            </span>
          </motion.div>

          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-extralight text-white leading-[1.1] tracking-tighter mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Entendendo emoções <br className="hidden md:block" />
            <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-secondary via-white to-primary">
              antes do colapso.
            </span>
          </motion.h1>

          <motion.p 
            className="text-base md:text-lg text-on-surface-variant max-w-xl mb-10 leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Utilizamos inteligência artificial para identificar padrões emocionais e gerar insights para ajudar jovens a compreender melhor sua saúde emocional.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <Link 
              href="/login"
              className="px-8 py-4 rounded-full bg-white text-background font-semibold text-sm uppercase tracking-widest hover:bg-secondary transition-colors text-center shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(159,207,213,0.4)]"
            >
              Começar Agora
            </Link>
            <button 
              className="px-8 py-4 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white font-semibold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors text-center"
            >
              Conhecer Tecnologia
            </button>
          </motion.div>
        </motion.div>

        {/* Right Column: 3D Brain */}
        <motion.div 
          className="w-full flex items-center justify-center order-1 lg:order-2"
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        >
          <div className="relative w-full max-w-[500px] lg:max-w-[700px] aspect-square">
            <Brain3D initialStatus="neutral" />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
