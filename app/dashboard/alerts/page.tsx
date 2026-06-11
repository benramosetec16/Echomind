'use client';

import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

export default function AlertsPage() {
  return (
    <>
      <TopBar title="Harmony" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          {/* Header Section */}
          <header className="max-w-[1200px] mx-auto mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-2 h-2 rounded-full bg-[#9fcfd5] animate-pulse shadow-[0_0_10px_rgba(159,207,213,0.8)]"></div>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-secondary">Bio-Sync Status: Optimal</span>
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

          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Featured Alert */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-8 aetheric-glass rounded-3xl p-8 cortisol-glow overflow-hidden relative"
            >
              <div className="relative z-10 flex h-full">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-error">Critical Delta Detected</span>
                  </div>
                  
                  <h2 className="text-4xl font-light text-on-surface mb-4">Elevated Cortisol</h2>
                  <p className="text-on-surface-variant mb-10 max-w-md">
                    System detected a sudden 34% spike in stress markers during your recent focus session. 
                    Cognitive load exceeds optimal thresholds.
                  </p>
                  
                  <div className="flex gap-4">
                    <button className="px-6 py-3 rounded-full border border-secondary text-secondary text-sm font-semibold uppercase tracking-[0.1em] hover:bg-secondary/10 transition-colors">
                      Initiate Calm
                    </button>
                    <button className="px-6 py-3 rounded-full border border-white/10 text-on-surface-variant text-sm font-semibold uppercase tracking-[0.1em] hover:bg-white/5 hover:text-on-surface transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>

                <div className="w-1/3 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,180,171,0.15)_0%,transparent_70%)] rounded-full animate-pulse"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-5xl font-extralight text-error mb-1">84<span className="text-xl">bp</span></div>
                    <div className="text-[10px] uppercase tracking-widest text-error/60 font-semibold border border-error/20 px-3 py-1 rounded-full">Stress Peak</div>
                  </div>
                </div>
              </div>
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
              className="lg:col-span-12 mt-8 aetheric-glass rounded-3xl overflow-hidden"
            >
              <div className="p-8 flex justify-between items-center border-b border-white/5">
                <h3 className="text-lg font-medium text-on-surface uppercase tracking-[0.1em]">Biometric Log (24H)</h3>
                <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-secondary hover:text-secondary/80 transition-colors">
                  <span className="material-symbols-outlined text-sm">download</span> Export Protocol
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {/* Entry 1 */}
                <div className="p-6 flex items-center gap-8 group hover:bg-white/5 transition-colors">
                  <div className="text-sm text-on-surface-variant font-mono w-16">14:02</div>
                  <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(159,207,213,0.8)]"></div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-on-surface">Serotonin Uptake Spike</h4>
                    <p className="text-sm text-on-surface-variant opacity-60">Positive response to external stimulus. Mood stabilized.</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">info</span>
                </div>

                {/* Entry 2 */}
                <div className="p-6 flex items-center gap-8 group hover:bg-white/5 transition-colors">
                  <div className="text-sm text-on-surface-variant font-mono w-16">12:45</div>
                  <div className="w-2 h-2 rounded-full bg-surface-variant"></div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-on-surface opacity-70">Metabolic Calibration</h4>
                    <p className="text-sm text-on-surface-variant opacity-40">Routine background check completed. All systems nominal.</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">info</span>
                </div>

                {/* Entry 3 */}
                <div className="p-6 flex items-center gap-8 group bg-error/5 transition-colors">
                  <div className="text-sm text-error font-mono w-16">09:14</div>
                  <div className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_10px_rgba(255,180,171,0.6)]"></div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-error">Elevated Cortisol Peak</h4>
                    <p className="text-sm text-error/60">Sustained tension detected for 12+ minutes. Review recommended.</p>
                  </div>
                  <span className="material-symbols-outlined text-error opacity-100 cursor-pointer">error</span>
                </div>

                {/* Entry 4 */}
                <div className="p-6 flex items-center gap-8 group hover:bg-white/5 transition-colors">
                  <div className="text-sm text-on-surface-variant font-mono w-16">07:30</div>
                  <div className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(206,189,255,0.8)]"></div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-on-surface">Circadian Alignment</h4>
                    <p className="text-sm text-on-surface-variant opacity-60">Wake protocol initiated. Neural bridges active.</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">info</span>
                </div>
              </div>
            </motion.div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
