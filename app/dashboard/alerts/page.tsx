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
  }, [supabase]);

  // Insert mock log for testing
  const insertMockLog = async (type: 'info' | 'normal' | 'warning' | 'critical') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Must be logged in to simulate logs.");

    const mocks = {
      critical: { title: 'Elevated Cortisol Peak', desc: 'System detected a sudden 34% spike in stress markers during focus session.', bpm: 84 },
      warning: { title: 'REM Cycle Disruption', desc: 'Minor interruptions detected in deep sleep pattern.', bpm: 68 },
      normal: { title: 'Metabolic Calibration', desc: 'Routine background check completed. All systems nominal.', bpm: 62 },
      info: { title: 'Serotonin Uptake Spike', desc: 'Positive response to external stimulus. Mood stabilized.', bpm: 65 }
    };

    const mock = mocks[type];

    await supabase.from('biometric_logs').insert({
      user_id: user.id,
      title: mock.title,
      description: mock.desc,
      type: type,
      bpm: mock.bpm
    });

    fetchLogs(); // refresh the list
  };

  // Format time (e.g. 14:02)
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Find the most recent critical or warning log for the spotlight card
  const activeAlert = logs.find(log => !log.is_dismissed && (log.type === 'critical' || log.type === 'warning'));

  return (
    <>
      <TopBar title="Harmony" />
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
                Bio-Sync Status: {activeAlert ? 'Action Required' : 'Optimal'}
              </span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-extralight tracking-tighter text-on-surface mb-4"
            >
              System Diagnostics
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-on-surface-variant max-w-2xl"
            >
              Real-time monitoring of neural interface stability. 
              Any significant deviations from baseline resonance will be logged here.
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
                        {activeAlert.type === 'critical' ? 'Critical Delta Detected' : 'Warning System Log'}
                      </span>
                    </div>
                    
                    <h2 className="text-4xl font-light text-on-surface mb-4">{activeAlert.title}</h2>
                    <p className="text-on-surface-variant mb-10 max-w-md">
                      {activeAlert.description}
                    </p>
                    
                    <div className="flex gap-4">
                      <button className="px-6 py-3 rounded-full border border-secondary text-secondary text-sm font-semibold uppercase tracking-[0.1em] hover:bg-secondary/10 transition-colors">
                        Initiate Calm
                      </button>
                      <button 
                        onClick={async () => {
                          await supabase.from('biometric_logs').update({ is_dismissed: true }).eq('id', activeAlert.id);
                          fetchLogs();
                        }}
                        className="px-6 py-3 rounded-full border border-white/10 text-on-surface-variant text-sm font-semibold uppercase tracking-[0.1em] hover:bg-white/5 hover:text-on-surface transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {activeAlert.bpm && (
                    <div className="w-1/3 flex items-center justify-center relative">
                      <div className={`absolute inset-0 rounded-full animate-pulse ${activeAlert.type === 'critical' ? 'bg-[radial-gradient(circle_at_center,rgba(255,180,171,0.15)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(206,189,255,0.15)_0%,transparent_70%)]'}`}></div>
                      <div className="relative z-10 text-center">
                        <div className={`text-5xl font-extralight mb-1 ${activeAlert.type === 'critical' ? 'text-error' : 'text-tertiary'}`}>{activeAlert.bpm}<span className="text-xl">bp</span></div>
                        <div className={`text-[10px] uppercase tracking-widest font-semibold border px-3 py-1 rounded-full ${activeAlert.type === 'critical' ? 'text-error/60 border-error/20' : 'text-tertiary/60 border-tertiary/20'}`}>
                          {activeAlert.type === 'critical' ? 'Stress Peak' : 'Elevated'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-12">
                  <span className="material-symbols-outlined text-4xl mb-4 text-on-surface-variant">check_circle</span>
                  <p className="text-lg text-on-surface-variant">No active alerts. System is stable.</p>
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
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant mb-8">Daily Summary</h3>
              
              <div className="flex flex-col gap-6 flex-1 justify-center divide-y divide-white/5">
                <div className="flex justify-between items-center pb-6">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">Avg. Pulse</div>
                    <div className="text-2xl font-light text-on-surface">62 BPM</div>
                  </div>
                  <span className="material-symbols-outlined text-secondary">trending_flat</span>
                </div>
                
                <div className="flex justify-between items-center py-6">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">Aetheric Harmony</div>
                    <div className="text-2xl font-light text-on-surface">92%</div>
                  </div>
                  <span className="material-symbols-outlined text-secondary">trending_up</span>
                </div>
                
                <div className="flex justify-between items-center pt-6">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">REM Cycle</div>
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
                <h3 className="text-lg font-medium text-on-surface uppercase tracking-[0.1em]">Biometric Log (24H)</h3>
                <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-secondary hover:text-secondary/80 transition-colors">
                  <span className="material-symbols-outlined text-sm">download</span> Export Protocol
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {loading ? (
                  <div className="p-8 text-center text-sm uppercase tracking-widest text-on-surface-variant animate-pulse">Syncing logs...</div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-on-surface-variant">No logs recorded in the last 24 hours.</div>
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

        {/* Temporary Simulation Controls */}
        <div className="mt-auto pb-8 pt-8 flex justify-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-xs text-on-surface-variant uppercase tracking-widest flex items-center mr-4">DEV SIMULATOR:</span>
          <button onClick={() => insertMockLog('critical')} className="text-[10px] uppercase px-3 py-1 bg-error/20 text-error rounded hover:bg-error/30">Trigger Critical</button>
          <button onClick={() => insertMockLog('info')} className="text-[10px] uppercase px-3 py-1 bg-secondary/20 text-secondary rounded hover:bg-secondary/30">Trigger Info</button>
          <button onClick={() => insertMockLog('normal')} className="text-[10px] uppercase px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20">Trigger Normal</button>
        </div>

      </main>
    </>
  );
}
