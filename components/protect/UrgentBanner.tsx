'use client';

import { motion } from 'framer-motion';

export default function UrgentBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 bg-error/5 border border-error/20 space-y-3"
    >
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-error"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emergency
        </span>
        <p className="text-sm font-semibold text-error">Se você estiver em perigo imediato</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
        <a
          href="tel:100"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error/10 border border-error/20 hover:bg-error/20 transition-colors"
        >
          <span className="material-symbols-outlined text-error text-base">call</span>
          <div>
            <p className="text-xs font-bold text-error">Disque 100</p>
            <p className="text-xs text-error/70">Direitos Humanos</p>
          </div>
        </a>

        <a
          href="tel:188"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-secondary text-base">support</span>
          <div>
            <p className="text-xs font-bold text-secondary">CVV 188</p>
            <p className="text-xs text-secondary/70">Apoio emocional 24h</p>
          </div>
        </a>

        <a
          href="tel:190"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
        >
          <span className="material-symbols-outlined text-orange-400 text-base">local_police</span>
          <div>
            <p className="text-xs font-bold text-orange-400">Polícia 190</p>
            <p className="text-xs text-orange-400/70">Emergência</p>
          </div>
        </a>

        <a
          href="tel:192"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
        >
          <span className="material-symbols-outlined text-green-400 text-base">medical_services</span>
          <div>
            <p className="text-xs font-bold text-green-400">SAMU 192</p>
            <p className="text-xs text-green-400/70">Emergência médica</p>
          </div>
        </a>
      </div>
    </motion.div>
  );
}
