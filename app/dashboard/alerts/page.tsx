'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';

interface BiometricLog {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'normal' | 'warning' | 'critical';
  bpm: number | null;
  is_dismissed: boolean;
  created_at: string;
}

export default function AlertsPage() {
  const [logs, setLogs] = useState<BiometricLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Fetch logs
  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('biometric_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setLogs(data as BiometricLog[]);
    }
    if (error) console.error('Error fetching logs:', error);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps

    let channel: any;
    const subscribeToLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase.channel('realtime:biometric')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'biometric_logs', filter: `user_id=eq.${user.id}` }, (payload) => {
          setLogs((prev) => [payload.new as BiometricLog, ...prev]);
        })
        .subscribe();
    };

    subscribeToLogs();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Format time (e.g. 14:02)
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Find the most recent critical or warning log for the spotlight card
  const activeAlert = logs.find(log => !log.is_dismissed && (log.type === 'critical' || log.type === 'warning'));

  // Calculate dynamic stats
  const avgBpm = logs.length > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.bpm || 60), 0) / logs.length)
    : 62;
  
  const criticalCount = logs.filter(l => l.type === 'critical').length;
  const harmonyPercent = logs.length > 0 
    ? Math.max(0, 100 - (criticalCount * 15) - (logs.filter(l => l.type === 'warning').length * 5))
    : 92;

  return (
    <>
      <TopBar title="Harmonia" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen flex flex-col">
        <PageTransition>
          {/* Header Section */}
          <header className="max-w-[1200px] mx-auto w-full mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(159,207,213,0.8)] ${activeAlert ? 'bg-error shadow-error' : 'bg-[#9fcfd5]'}`}></div>
              <span className={`text-xs uppercase tracking-[0.2em] font-semibold ${activeAlert ? 'text-error' : 'text-secondary'}`}>
                Status Bio-Sync: {activeAlert ? 'Ação Necessária' : 'Otimizado'}
              </span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-extralight tracking-tighter text-on-surface mb-4"
            >
              Diagnóstico do Sistema
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-on-surface-variant max-w-2xl"
            >
              Monitoramento em tempo real da estabilidade da interface neural. 
              Qualquer desvio significativo da ressonância base será registrado aqui.
            </motion.p>
          </header>

          <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Featured Alert Spotlight */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`lg:col-span-8 aetheric-glass rounded-3xl p-8 overflow-hidden relative transition-all duration-500 ${
                activeAlert ? (activeAlert.type === 'critical' ? 'border-error/30 shadow-[0_0_30px_rgba(255,180,171,0.1)]' : 'border-tertiary/30') : ''
              }`}
            >
              {activeAlert ? (
                <div className="relative z-10 flex h-full">
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-6">
                      <span className={`material-symbols-outlined ${activeAlert.type === 'critical' ? 'text-error' : 'text-tertiary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                      <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${activeAlert.type === 'critical' ? 'text-error' : 'text-tertiary'}`}>
                        {activeAlert.type === 'critical' ? 'Delta Crítico Detectado' : 'Aviso no Sistema'}
                      </span>
                    </div>
                    
                    <h2 className="text-4xl font-light text-on-surface mb-4">{activeAlert.title}</h2>
                    <p className="text-on-surface-variant mb-10 max-w-md">
                      {activeAlert.description}
                    </p>
                    
                    <div className="flex gap-4">
                      <button className="px-6 py-3 rounded-full border border-secondary text-secondary text-sm font-semibold uppercase tracking-[0.1em] hover:bg-secondary/10 transition-colors">
                        Iniciar Protocolo Calma
                      </button>
                      <button 
                        onClick={async () => {
                          await supabase.from('biometric_logs').update({ is_dismissed: true }).eq('id', activeAlert.id);
                          fetchLogs();
                        }}
                        className="px-6 py-3 rounded-full border border-white/10 text-on-surface-variant text-sm font-semibold uppercase tracking-[0.1em] hover:bg-white/5 hover:text-on-surface transition-colors"
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>

                  {activeAlert.bpm && (
                    <div className="w-1/3 flex items-center justify-center relative">
                      <div className={`absolute inset-0 rounded-full animate-pulse ${activeAlert.type === 'critical' ? 'bg-[radial-gradient(circle_at_center,rgba(255,180,171,0.15)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(206,189,255,0.15)_0%,transparent_70%)]'}`}></div>
                      <div className="relative z-10 text-center">
                        <div className={`text-5xl font-extralight mb-1 ${activeAlert.type === 'critical' ? 'text-error' : 'text-tertiary'}`}>{activeAlert.bpm}<span className="text-xl">bp</span></div>
                        <div className={`text-[10px] uppercase tracking-widest font-semibold border px-3 py-1 rounded-full ${activeAlert.type === 'critical' ? 'text-error/60 border-error/20' : 'text-tertiary/60 border-tertiary/20'}`}>
                          {activeAlert.type === 'critical' ? 'Pico de Estresse' : 'Elevado'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-12">
                  <span className="material-symbols-outlined text-4xl mb-4 text-on-surface-variant">check_circle</span>
                  <p className="text-lg text-on-surface-variant">Nenhum alerta ativo. O sistema está estável.</p>
                </div>
              )}
            </motion.div>

            {/* Daily Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-4 aetheric-glass rounded-3xl p-8 flex flex-col"
            >
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant mb-8">Resumo Diário</h3>
              
              <div className="flex flex-col gap-6 flex-1 justify-center divide-y divide-white/5">
                <div className="flex justify-between items-center pb-6">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">Pulso Médio</div>
                    <div className="text-2xl font-light text-on-surface">{avgBpm} BPM</div>
                  </div>
                  <span className="material-symbols-outlined text-secondary">trending_flat</span>
                </div>
                
                <div className="flex justify-between items-center py-6">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">Harmonia Etérica</div>
                    <div className="text-2xl font-light text-on-surface">{harmonyPercent}%</div>
                  </div>
                  <span className="material-symbols-outlined text-secondary">trending_up</span>
                </div>
                
                <div className="flex justify-between items-center pt-6">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">Ciclo REM</div>
                    <div className="text-2xl font-light text-on-surface">2h 14m</div>
                  </div>
                  <span className="material-symbols-outlined text-error">trending_down</span>
                </div>
              </div>
            </motion.div>

            {/* Biometric Log */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-12 mt-8 aetheric-glass rounded-3xl overflow-hidden mb-12"
            >
              <div className="p-8 flex justify-between items-center border-b border-white/5">
                <h3 className="text-lg font-medium text-on-surface uppercase tracking-[0.1em]">Registro Biométrico (24H)</h3>
                <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-secondary hover:text-secondary/80 transition-colors">
                  <span className="material-symbols-outlined text-sm">download</span> Exportar Protocolo
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {loading ? (
                  <div className="p-8 text-center text-sm uppercase tracking-widest text-on-surface-variant animate-pulse">Sincronizando registros...</div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-on-surface-variant">Nenhum registro nas últimas 24 horas.</div>
                ) : (
                  logs.map((log) => {
                    const isError = log.type === 'critical';
                    const isWarning = log.type === 'warning';
                    
                    return (
                      <div key={log.id} className={`p-6 flex items-center gap-8 group transition-colors ${isError ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-white/5'}`}>
                        <div className={`text-sm font-mono w-16 ${isError ? 'text-error' : 'text-on-surface-variant'}`}>{formatTime(log.created_at)}</div>
                        
                        <div className={`w-2 h-2 rounded-full ${
                          isError ? 'bg-error shadow-[0_0_10px_rgba(255,180,171,0.6)] animate-pulse' : 
                          isWarning ? 'bg-tertiary shadow-[0_0_8px_rgba(206,189,255,0.8)]' : 
                          log.type === 'info' ? 'bg-secondary shadow-[0_0_8px_rgba(159,207,213,0.8)]' : 
                          'bg-surface-variant'
                        }`}></div>
                        
                        <div className="flex-1">
                          <h4 className={`text-base font-medium ${isError ? 'text-error' : 'text-on-surface'}`}>{log.title}</h4>
                          <p className={`text-sm ${isError ? 'text-error/60' : 'text-on-surface-variant opacity-60'}`}>{log.description}</p>
                        </div>
                        
                        <span className={`material-symbols-outlined cursor-pointer transition-opacity ${
                          isError ? 'text-error opacity-100' : 'text-on-surface-variant opacity-0 group-hover:opacity-100'
                        }`}>
                          {isError ? 'error' : 'info'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>

          </div>
        </PageTransition>
      </main>
    </>
  );
}
