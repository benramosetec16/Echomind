'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';

interface JournalEntry {
  id: string;
  title: string;
  sentiment_tag: string;
  sentiment_dots: number;
  icon: string;
  created_at: string;
}

interface Checkin {
  valence_value: number;
  created_at: string;
}

export default function HistoryPage() {
  const [timeRange, setTimeRange] = useState<'7D' | '30D'>('30D');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [journalRes, checkinsRes] = await Promise.all([
        supabase
          .from('aetheric_journal')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('emotional_checkins')
          .select('valence_value, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
      ]);

      if (journalRes.data) setEntries(journalRes.data as JournalEntry[]);
      if (checkinsRes.data) setCheckins(checkinsRes.data as Checkin[]);
      
      if (journalRes.error) console.error('Error fetching journal:', journalRes.error);
      if (checkinsRes.error) console.error('Error fetching checkins:', checkinsRes.error);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return `Hoje, ${timeString}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem, ${timeString}`;
    } else {
      return `${date.toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' })}, ${timeString}`;
    }
  };

  // Tag styling helper
  const getTagColor = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('seren') || t.includes('calm') || t.includes('peace') || t.includes('paz') || t.includes('tranquil')) {
      return 'text-secondary bg-secondary/10 border-secondary/20';
    }
    if (t.includes('turbul') || t.includes('anx') || t.includes('stress') || t.includes('ansie') || t.includes('tenso')) {
      return 'text-error bg-error/10 border-error/20';
    }
    return 'text-primary bg-surface-variant border-white/10';
  };

  // Calculate dynamic path based on checkins
  const calculatePath = () => {
    if (checkins.length < 2) {
      return "M 0,100 C 100,150 200,80 300,200 C 400,280 500,200 600,180 C 700,160 800,90 800,90";
    }
    
    // We have 800 width, 300 height.
    const width = 800;
    const height = 300;
    const paddingY = 50;
    const stepX = width / (checkins.length - 1);

    let path = `M 0,${height - paddingY - (checkins[0].valence_value / 100) * (height - 2 * paddingY)}`;
    
    for (let i = 1; i < checkins.length; i++) {
      const prevX = (i - 1) * stepX;
      const prevY = height - paddingY - (checkins[i - 1].valence_value / 100) * (height - 2 * paddingY);
      const currX = i * stepX;
      const currY = height - paddingY - (checkins[i].valence_value / 100) * (height - 2 * paddingY);
      
      const cp1x = prevX + (currX - prevX) / 2;
      const cp1y = prevY;
      const cp2x = prevX + (currX - prevX) / 2;
      const cp2y = currY;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${currX},${currY}`;
    }
    
    return path;
  };

  const dynamicPath = calculatePath();

  return (
    <>
      <TopBar title="Pulso" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          {/* Header */}
          <header className="max-w-[1200px] mx-auto mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-extralight tracking-tighter text-on-background mb-2"
            >
              Histórico Emocional
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-on-surface-variant max-w-xl"
            >
              Análise temporal da sua ressonância cognitiva e estabilidade ao longo do tempo.
            </motion.p>
          </header>

          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Temporal Analysis Graph */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8 aetheric-glass rounded-[32px] p-12"
            >
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="text-xl font-medium text-on-surface mb-1">Análise Temporal</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-secondary"></div> Estabilidade</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-surface-variant"></div> Turbulência</span>
                  </div>
                </div>
                <div className="flex gap-2 bg-surface-container-low rounded-full p-1 border border-white/5">
                  <button 
                    onClick={() => setTimeRange('7D')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition-all ${timeRange === '7D' ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    7D
                  </button>
                  <button 
                    onClick={() => setTimeRange('30D')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition-all ${timeRange === '30D' ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    30D
                  </button>
                </div>
              </div>

              {/* Graph Area */}
              <div className="relative h-[300px] w-full">
                <svg viewBox="0 0 800 300" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="stability-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9fcfd5" />
                      <stop offset="50%" stopColor="#cebdff" />
                      <stop offset="100%" stopColor="#9fcfd5" />
                    </linearGradient>
                    <linearGradient id="turbulence-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#333535" />
                      <stop offset="100%" stopColor="#8e9192" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="75" x2="800" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="150" x2="800" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="225" x2="800" y2="225" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  
                  {/* Paths */}
                  <path 
                    d="M 0,250 C 100,200 200,280 300,150 C 400,20 500,100 600,80 C 700,60 800,120 800,120" 
                    fill="none" 
                    stroke="url(#turbulence-gradient)" 
                    strokeWidth="2" 
                    strokeDasharray="4 4"
                    opacity="0.4"
                  />
                  <path 
                    key={dynamicPath}
                    d={dynamicPath} 
                    fill="none" 
                    stroke="url(#stability-gradient)" 
                    strokeWidth="3" 
                    className="path-draw"
                  />
                </svg>

                {/* Tooltip Point */}
                <div className="absolute left-[60%] top-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                  <div className="w-4 h-4 bg-background rounded-full border-2 border-tertiary flex items-center justify-center shadow-[0_0_15px_rgba(206,189,255,0.4)]">
                    <div className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></div>
                  </div>
                  <div className="mt-4 aetheric-glass px-4 py-2 rounded-lg text-center whitespace-nowrap">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-1">Último Pulso</div>
                    <div className="text-sm font-medium text-tertiary">Núcleo Estável</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Side Cards */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Cognitive Load */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="aetheric-glass rounded-[32px] p-8"
              >
                <h3 className="text-xl font-medium text-tertiary mb-8">Carga Cognitiva</h3>
                
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-on-surface-variant uppercase tracking-widest">Densidade de Informação</span>
                    <span className="text-secondary">Alta</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-secondary rounded-full shadow-[0_0_10px_rgba(159,207,213,0.5)]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-on-surface-variant uppercase tracking-widest">Ressonância Emocional</span>
                    <span className="text-tertiary">Estável</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[62%] bg-tertiary rounded-full shadow-[0_0_10px_rgba(206,189,255,0.5)]"></div>
                  </div>
                </div>
              </motion.div>

              {/* Aetheric Sync */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="aetheric-glass rounded-[32px] p-8 flex-1 relative overflow-hidden flex flex-col justify-center group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-tertiary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                <h3 className="text-2xl font-light text-primary mb-3 relative z-10">Sincronia do Sistema</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed relative z-10">
                  Seu fluxo atual está perfeitamente alinhado com suas janelas cognitivas ativas. Considere iniciar protocolos de trabalho profundo.
                </p>
              </motion.div>
            </div>

            {/* Aetheric Journal */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-12 mt-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-light text-on-surface">Diário de Registros</h3>
              </div>

              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="text-center py-12 text-on-surface-variant opacity-50 text-sm tracking-widest uppercase animate-pulse">
                    Sincronizando registros...
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12 aetheric-glass rounded-2xl">
                    <p className="text-on-surface-variant">Nenhum registro encontrado. Faça um check-in para gerar sua primeira análise da IA.</p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="aetheric-glass p-6 rounded-2xl flex items-center gap-6 group hover:bg-white/[0.04] cursor-pointer transition-all border border-transparent hover:border-white/10">
                      <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center border border-white/5 flex-shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="material-symbols-outlined text-2xl text-on-surface-variant group-hover:text-primary transition-colors relative z-10">{entry.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-on-surface-variant opacity-60 uppercase tracking-widest">{formatDate(entry.created_at)}</span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase tracking-widest border font-semibold ${getTagColor(entry.sentiment_tag)}`}>
                            {entry.sentiment_tag}
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-on-surface group-hover:text-primary transition-colors">{entry.title}</h4>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(dot => (
                            <div key={dot} className={`w-1.5 h-1.5 rounded-full transition-colors ${dot <= entry.sentiment_dots ? 'bg-primary' : 'bg-white/10 group-hover:bg-white/20'}`}></div>
                          ))}
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-300">chevron_right</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </PageTransition>
      </main>

      <style jsx global>{`
        .path-draw {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: draw 3s ease-out forwards;
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </>
  );
}
