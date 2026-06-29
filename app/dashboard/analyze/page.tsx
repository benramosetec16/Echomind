'use client';

import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import EmotionAnalyzer from '../../../components/EmotionAnalyzer';
import { motion } from 'framer-motion';

export default function AnalyzePage() {
  return (
    <>
      <TopBar title="Analisar" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          {/* Header */}
          <header className="max-w-[1200px] mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-xs font-semibold text-secondary/60 uppercase tracking-[0.2em]">
                Inteligência Etérica
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-extralight tracking-tighter text-on-background mb-3"
            >
              Análise Emocional
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-on-surface-variant max-w-xl"
            >
              Descreva como você está se sentindo. Nossa IA etérica irá mapear seu estado emocional, níveis de energia e oferecer recomendações personalizadas.
            </motion.p>
          </header>

          {/* Analyzer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-[1200px] mx-auto"
          >
            <EmotionAnalyzer />
          </motion.div>
        </PageTransition>
      </main>
    </>
  );
}
