'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

export default function ProfilePage() {
  const [hapticIntensity, setHapticIntensity] = useState(75);
  const [syncFrequency, setSyncFrequency] = useState<'instant' | 'hourly' | 'manual'>('instant');

  return (
    <>
      <TopBar title="Sanctuary" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <div className="max-w-[1200px] mx-auto">
            {/* Profile Hero Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-end gap-12 mb-16 relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/5 rounded-full blur-3xl"></div>
                <div className="w-48 h-48 rounded-full border border-white/10 grayscale hover:grayscale-0 transition-all duration-700 relative z-10 overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-center justify-center">
                  <span className="text-5xl text-on-surface-variant font-extralight tracking-tighter">AX</span>
                </div>
              </div>
              
              <div className="pb-4">
                <span className="text-xs font-semibold text-secondary uppercase tracking-[0.2em] mb-2 block">Protocol Lead</span>
                <h1 className="text-5xl font-light text-on-surface mb-2">Alex X.</h1>
                <p className="text-on-surface-variant max-w-md">
                  Neural bridge established 48 days ago. Current resonance patterns suggest high adaptability to complex environments.
                </p>
              </div>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Personal Records */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-8 aetheric-glass rounded-3xl p-10 flex flex-col min-h-[400px]"
              >
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">lock</span>
                    <h3 className="text-xl font-medium text-on-surface">Personal Records</h3>
                  </div>
                  <button className="px-5 py-2 rounded-full border border-secondary/20 text-secondary text-xs uppercase tracking-[0.15em] font-semibold hover:bg-secondary/5 hover:border-secondary/40 transition-all">
                    Decrypt Session
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-4 flex-1">
                  <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Focus Latency</span>
                    <div className="text-4xl font-extralight text-primary">0.14 <span className="text-base text-on-surface-variant">ms</span></div>
                  </div>
                  
                  <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Sync Integrity</span>
                    <div className="text-4xl font-extralight text-on-surface">99.8 <span className="text-base text-on-surface-variant">%</span></div>
                  </div>
                  
                  <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant opacity-60 mb-2 font-semibold">Aetheric Yield</span>
                    <div className="text-4xl font-extralight text-on-surface">8.2 <span className="text-base text-on-surface-variant">k</span></div>
                  </div>
                </div>

                <div className="bg-surface-variant/10 rounded-2xl p-6 mt-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent"></div>
                  <div className="relative z-10 flex items-center gap-4">
                    <span className="material-symbols-outlined text-secondary">query_stats</span>
                    <p className="text-sm text-on-surface-variant italic">
                      "Your cognitive recovery rate is currently in the top 4% of active users."
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Interface Feedback */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-4 glass-panel rounded-3xl p-8 flex flex-col"
              >
                <h3 className="text-lg font-medium text-on-surface mb-8">Interface Feedback</h3>
                
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-on-surface-variant">Haptic Intensity</span>
                    <span className="text-xs font-mono text-secondary">{hapticIntensity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={hapticIntensity}
                    onChange={(e) => setHapticIntensity(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-secondary"
                  />
                </div>

                <div className="mb-8 flex-1">
                  <span className="text-sm text-on-surface-variant block mb-4">Sync Frequency</span>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setSyncFrequency('instant')}
                      className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${syncFrequency === 'instant' ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[inset_0_0_10px_rgba(159,207,213,0.1)]' : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'}`}
                    >
                      Instant
                    </button>
                    <button 
                      onClick={() => setSyncFrequency('hourly')}
                      className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${syncFrequency === 'hourly' ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[inset_0_0_10px_rgba(159,207,213,0.1)]' : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'}`}
                    >
                      Hourly
                    </button>
                    <button 
                      onClick={() => setSyncFrequency('manual')}
                      className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${syncFrequency === 'manual' ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[inset_0_0_10px_rgba(159,207,213,0.1)]' : 'bg-white/5 text-on-surface-variant border border-transparent hover:bg-white/10'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                  <span className="material-symbols-outlined text-secondary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  <span className="text-xs uppercase tracking-[0.1em] font-semibold text-secondary">Optimal Performance</span>
                </div>
              </motion.div>

              {/* Privacy Protocols */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-12 glass-panel rounded-3xl p-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-on-surface-variant">fingerprint</span>
                  <h3 className="text-xl font-medium text-on-surface">Privacy Protocols</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Protocol 1 */}
                  <div className="bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant mb-4">visibility_off</span>
                    <h4 className="text-base font-medium text-on-surface mb-2">Ghost Mode</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1">
                      Conceal emotional resonance from all connected peers.
                    </p>
                    <div className="w-10 h-5 rounded-full bg-surface-variant relative cursor-pointer border border-white/5">
                      <div className="absolute left-1 top-[2px] w-4 h-4 rounded-full bg-white/40 transition-all"></div>
                    </div>
                  </div>

                  {/* Protocol 2 */}
                  <div className="bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-secondary/20 transition-colors">
                    <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="material-symbols-outlined text-secondary mb-4 relative z-10">history_edu</span>
                    <h4 className="text-base font-medium text-on-surface mb-2 relative z-10">Ephemeral History</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1 relative z-10">
                      Auto-purge all neural logs after 24 hours of generation.
                    </p>
                    <div className="w-10 h-5 rounded-full bg-secondary relative cursor-pointer shadow-[0_0_10px_rgba(159,207,213,0.3)]">
                      <div className="absolute right-1 top-[2px] w-4 h-4 rounded-full bg-white transition-all"></div>
                    </div>
                  </div>

                  {/* Protocol 3 */}
                  <div className="bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-secondary/20 transition-colors">
                    <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="material-symbols-outlined text-secondary mb-4 relative z-10">security</span>
                    <h4 className="text-base font-medium text-on-surface mb-2 relative z-10">Aetheric Proxy</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1 relative z-10">
                      Reroute biometric data through decentralized nodes.
                    </p>
                    <div className="w-10 h-5 rounded-full bg-secondary relative cursor-pointer shadow-[0_0_10px_rgba(159,207,213,0.3)]">
                      <div className="absolute right-1 top-[2px] w-4 h-4 rounded-full bg-white transition-all"></div>
                    </div>
                  </div>

                  {/* Protocol 4 */}
                  <div className="bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant mb-4">cloud_off</span>
                    <h4 className="text-base font-medium text-on-surface mb-2">Local Archiving</h4>
                    <p className="text-xs text-on-surface-variant opacity-60 mb-6 flex-1">
                      Store all cognitive logs exclusively on hardware.
                    </p>
                    <div className="w-10 h-5 rounded-full bg-surface-variant relative cursor-pointer border border-white/5">
                      <div className="absolute left-1 top-[2px] w-4 h-4 rounded-full bg-white/40 transition-all"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
