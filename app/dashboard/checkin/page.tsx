'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { transmitAura } from './actions';
import { AlertCircle, Sparkles } from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';


const states = [
  { threshold: 0, text: 'Vórtice de Discórdia', color: '#ffb4ab' },
  { threshold: 25, text: 'Deriva Melancólica', color: '#cebdff' },
  { threshold: 45, text: 'Equilíbrio', color: '#9fcfd5' },
  { threshold: 75, text: 'Clareza Luminosa', color: '#e5e2e1' },
  { threshold: 90, text: 'Serenidade Infinita', color: '#ffffff' },
];

const textures = [
  { id: 'focus', icon: 'target', name: 'Foco', desc: 'Afiado, linear, silencioso.' },
  { id: 'calm', icon: 'air', name: 'Calma', desc: 'Imóvel, expansivo, fresco.' },
  { id: 'anxiety', icon: 'bolt', name: 'Ansiedade', desc: 'Apertado, rápido, elétrico.' },
  { id: 'bloom', icon: 'filter_vintage', name: 'Florescer', desc: 'Quente, crescente, macio.' },
];

export default function CheckinPage() {
  const supabase = createClient();
  const [valenceValue, setValenceValue] = useState(50);
  const [selectedTexture, setSelectedTexture] = useState<string | null>('calm');
  const [thoughts, setThoughts] = useState('');
  const [checkinCount, setCheckinCount] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);

  const currentState = states.reduce((prev, curr) => 
    valenceValue >= curr.threshold ? curr : prev
  , states[0]);

  useEffect(() => {
    // Parallax Glow Effects
    if (glow1Ref.current && glow2Ref.current) {
      const xMove = (valenceValue - 50) * 2;
      glow1Ref.current.style.transform = `translate(${xMove}px, ${xMove / 2}px)`;
      glow2Ref.current.style.transform = `translate(${-xMove}px, ${-xMove / 2}px)`;
    }
  }, [valenceValue]);

  useEffect(() => {
    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('emotional_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setCheckinCount(count ?? 0);
    };
    fetchCount();
  }, []);

  const handleSubmit = async () => {
    if (!selectedTexture) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setAiInsight(null);

    const result = await transmitAura({
      valenceValue,
      texture: selectedTexture,
      thoughts
    });

    if (result?.error) {
      setErrorMsg(result.error);
      setIsSubmitting(false);
    } else if (result?.insight) {
      setAiInsight(result.insight);
      setIsSubmitting(false);
      // Optional: reset form after showing insight
      // setThoughts('');
    }
  };

  const resetForm = () => {
    setAiInsight(null);
    setThoughts('');
    setValenceValue(50);
  }

  return (
    <>
      <TopBar title="Refletir" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div ref={glow1Ref} className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-secondary opacity-[0.08] blur-[64px] transition-transform duration-300" />
        <div ref={glow2Ref} className="absolute bottom-[0%] -right-[5%] w-[50%] h-[50%] rounded-full bg-tertiary opacity-[0.08] blur-[64px] transition-transform duration-300" />
      </div>

      <main className="pt-32 px-16 pb-24 relative min-h-screen flex flex-col items-center">
        <PageTransition>
          {/* Header */}
          <header className="w-full max-w-[1200px] flex justify-between items-center mb-16 mx-auto">
            <div className="flex flex-col">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-extralight text-on-background tracking-tighter"
              >
                Check-in
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-medium text-on-surface-variant opacity-40 mt-1"
              >
                {checkinCount !== null ? `Pulso Etérico #${checkinCount + 1}` : 'Pulso Etérico'}
              </motion.p>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {aiInsight ? (
              /* AI Insight Reveal View */
              <motion.div 
                key="insight"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[800px] mx-auto text-center flex flex-col items-center mt-12"
              >
                <motion.div 
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 1 }}
                  className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(159,207,213,0.3)]"
                >
                  <Sparkles className="w-8 h-8 text-secondary" />
                </motion.div>
                
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary mb-6">Análise da IA</h2>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 1 }}
                  className="text-3xl md:text-4xl font-light leading-relaxed text-on-surface mb-12 tracking-tight"
                >
                  "{aiInsight}"
                </motion.p>

                <motion.button 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 1 }}
                  onClick={resetForm}
                  className="text-xs uppercase tracking-[0.2em] font-semibold text-on-surface-variant hover:text-secondary transition-colors"
                >
                  Retornar ao Santuário
                </motion.button>
              </motion.div>
            ) : (
              /* Check-in Form View */
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex flex-col items-center"
              >
                {/* Question Section */}
                <div className="w-full max-w-[800px] flex flex-col items-center mb-20 text-center mx-auto">
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-light text-primary mb-12 tracking-tighter"
                  >
                    Como você está, de verdade?
                  </motion.h2>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-full glass-panel rounded-full p-8 mb-4 relative"
                  >
                    <div className="flex justify-between items-center mb-6 px-2">
                      <span className="text-xs font-semibold text-on-surface-variant opacity-50 uppercase tracking-[0.15em]">INFELIZ</span>
                      <span className="text-xs font-semibold text-on-surface-variant opacity-50 uppercase tracking-[0.15em]">SERENO</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={valenceValue}
                      onChange={(e) => setValenceValue(parseInt(e.target.value))}
                      className="w-full h-[2px] bg-white/10 rounded-lg appearance-none cursor-pointer accent-secondary"
                    />
                  </motion.div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm font-semibold tracking-widest uppercase transition-colors duration-300"
                    style={{ color: currentState.color }}
                  >
                    {currentState.text}
                  </motion.p>
                </div>

                {/* Sensory Texture Grid */}
                <section className="w-full max-w-[1200px] mb-20 mx-auto">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col mb-8"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant mb-2">TEXTURA SENSORIAL</h3>
                    <div className="w-12 h-[1px] bg-secondary opacity-30"></div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {textures.map((texture, index) => {
                      const isSelected = selectedTexture === texture.id;
                      return (
                        <motion.button
                          key={texture.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + (index * 0.1) }}
                          onClick={() => setSelectedTexture(texture.id)}
                          className={`glass-panel group p-6 flex flex-col items-start gap-6 rounded-xl transition-all duration-500 text-left ${
                            isSelected ? 'border-secondary/40 bg-secondary/5' : 'hover:border-secondary/40'
                          }`}
                        >
                          <span 
                            className={`material-symbols-outlined text-secondary transition-all ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
                            style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            {texture.icon}
                          </span>
                          <div>
                            <p className="text-xl font-medium mb-1 text-on-surface">{texture.name}</p>
                            <p className="text-sm text-on-surface-variant opacity-60">{texture.desc}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                {/* Thoughts into Ether */}
                <section className="w-full max-w-[800px] mb-12 mx-auto">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="flex flex-col mb-8 items-center"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant mb-2">PENSAMENTOS NO ÉTER</h3>
                    <div className="w-12 h-[1px] bg-tertiary opacity-30"></div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="relative w-full"
                  >
                    <textarea 
                      value={thoughts}
                      onChange={(e) => setThoughts(e.target.value)}
                      className="w-full bg-surface-container-lowest/40 backdrop-blur-md border-b border-white/10 p-6 text-base text-on-surface focus:outline-none focus:border-secondary/50 transition-colors resize-none min-h-[160px] placeholder:opacity-20 text-center"
                      placeholder="Descreva o que sente..."
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-30">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">FORÇA DO SINAL</span>
                      <div className="flex gap-1">
                        <div className={`w-1 h-3 ${thoughts.length > 5 ? 'bg-secondary' : 'bg-white/20'}`}></div>
                        <div className={`w-1 h-3 ${thoughts.length > 20 ? 'bg-secondary' : 'bg-white/20'}`}></div>
                        <div className={`w-1 h-3 ${thoughts.length > 50 ? 'bg-secondary' : 'bg-white/20'}`}></div>
                      </div>
                    </div>
                  </motion.div>
                </section>

                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-8 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-widest font-semibold">{errorMsg}</span>
                  </motion.div>
                )}

                {/* Final Submission */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex flex-col items-center gap-6 mb-32 mx-auto"
                >
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedTexture}
                    className="group relative px-12 py-4 border border-secondary/30 rounded-full overflow-hidden transition-all hover:border-secondary hover:shadow-[0_0_30px_rgba(159,207,213,0.2)] disabled:opacity-50 disabled:hover:border-secondary/30 disabled:hover:shadow-none"
                  >
                    <span className="relative z-10 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      {isSubmitting ? 'TRANSMITINDO...' : 'TRANSMITIR AURA'}
                    </span>
                    <div className="absolute inset-0 bg-secondary opacity-0 group-hover:opacity-5 transition-opacity"></div>
                  </button>
                  <p className="text-sm text-on-surface-variant opacity-30 italic">Sessão expira ao fechar.</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </PageTransition>
      </main>
    </>
  );
}
