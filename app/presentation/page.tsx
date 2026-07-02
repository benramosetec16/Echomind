'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import NeuralBackground from '@/components/NeuralBackground';
import { ArrowLeft, BrainCircuit, Activity, ShieldCheck, Database } from 'lucide-react';

export default function PresentationPage() {
  return (
    <>
      <NeuralBackground />
      
      <div className="min-h-screen pt-20 pb-16 px-6 md:px-12 lg:px-24 flex flex-col items-center">
        <header className="w-full max-w-[1200px] flex justify-between items-center mb-16 z-10">
          <Link 
            href="/"
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
          <span className="text-xl font-extralight tracking-tighter text-primary">EchoMind</span>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-[1000px] w-full text-center z-10 mb-20"
        >
          <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tighter mb-6">
            A evolução da <br className="hidden md:block" />
            <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-secondary via-white to-primary">
              Saúde Mental Estudantil
            </span>
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant font-light max-w-2xl mx-auto">
            O EchoMind utiliza IA avançada para realizar o mapeamento biométrico e análise de padrões emocionais, garantindo intervenções precisas antes do esgotamento.
          </p>
        </motion.div>

        <div className="max-w-[1200px] w-full grid grid-cols-1 md:grid-cols-2 gap-8 z-10 mb-20">
          {[
            {
              icon: BrainCircuit,
              title: "Processamento Neural",
              desc: "A inteligência artificial Groq analisa o Diário Etérico (Aetheric Journal) buscando sinais precoces de ansiedade ou depressão."
            },
            {
              icon: Activity,
              title: "Sincronia Biométrica",
              desc: "Integração contínua com Apple HealthKit e Wearables para leitura de frequência cardíaca, ciclos de sono e níveis de energia."
            },
            {
              icon: Database,
              title: "Armazenamento Criptografado",
              desc: "Dados armazenados com Row Level Security (RLS) no Supabase, garantindo que o diário emocional permaneça privado."
            },
            {
              icon: ShieldCheck,
              title: "Segurança Institucional",
              desc: "Painéis exclusivos (Dashboards) desenvolvidos sob medida para orientadores e corpo docente poderem monitorar turmas e agir rapidamente."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="glass-panel p-8 rounded-3xl hover:border-white/10 transition-colors"
            >
              <feature.icon className="w-10 h-10 text-secondary mb-6" />
              <h3 className="text-xl font-medium text-white mb-3">{feature.title}</h3>
              <p className="text-sm text-on-surface-variant font-light leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="z-10"
        >
          <Link 
            href="/login"
            className="px-10 py-5 rounded-full bg-white text-background font-semibold text-sm uppercase tracking-widest hover:bg-secondary transition-colors text-center shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(159,207,213,0.5)]"
          >
            Acessar o Sistema
          </Link>
        </motion.div>
      </div>
    </>
  );
}
