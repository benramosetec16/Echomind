"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { biometricsService } from "@/services/biometrics";

export default function BiometricsForm() {
  const [heartRate, setHeartRate] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [energyLevel, setEnergyLevel] = useState("Média");
  const [mood, setMood] = useState("Neutro");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await biometricsService.saveEntry({
        heart_rate: parseInt(heartRate) || null,
        sleep_hours: parseFloat(sleepHours) || null,
        energy_level: energyLevel,
        mood: mood,
      });

      setMessage("Registro salvo com sucesso!");
      setHeartRate("");
      setSleepHours("");
      setEnergyLevel("Média");
      setMood("Neutro");
      router.refresh();
      
      // Simulação futura de sync com Apple HealthKit
      // /* FUTURE: await syncWithAppleHealthKit(userData.user.id); */
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Erro ao salvar registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative z-10 aetheric-glass rounded-[32px] p-10 overflow-hidden">
      <h2 className="text-sm uppercase tracking-[0.2em] font-semibold text-secondary mb-8 block">
        Novo Registro Biométrico
      </h2>

      <div className="space-y-6">
        <div className="group relative">
          <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
            Frequência Cardíaca (bpm)
          </label>
          <div className="input-underline py-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-secondary transition-colors">favorite</span>
            <input
              type="number"
              required
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="Ex: 85"
              className="w-full bg-transparent border-none outline-none text-on-surface placeholder-on-surface-variant/30"
            />
          </div>
        </div>

        <div className="group relative">
          <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
            Horas de Sono
          </label>
          <div className="input-underline py-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-secondary transition-colors">bedtime</span>
            <input
              type="number"
              step="0.1"
              required
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="Ex: 8"
              className="w-full bg-transparent border-none outline-none text-on-surface placeholder-on-surface-variant/30"
            />
          </div>
        </div>

        <div className="group relative">
          <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
            Nível de Energia
          </label>
          <div className="input-underline py-2 flex items-center gap-3 relative">
            <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-secondary transition-colors">bolt</span>
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-on-surface appearance-none cursor-pointer pr-8"
            >
              <option value="Muito Baixa" className="bg-surface-container">Muito Baixa</option>
              <option value="Baixa" className="bg-surface-container">Baixa</option>
              <option value="Média" className="bg-surface-container">Média</option>
              <option value="Alta" className="bg-surface-container">Alta</option>
              <option value="Muito Alta" className="bg-surface-container">Muito Alta</option>
            </select>
            <span className="material-symbols-outlined absolute right-0 text-on-surface-variant opacity-50 pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="group relative">
          <label className="block text-xs uppercase tracking-[0.15em] font-semibold text-on-surface-variant mb-2 transition-colors group-focus-within:text-secondary">
            Humor Atual
          </label>
          <div className="input-underline py-2 flex items-center gap-3 relative">
            <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-secondary transition-colors">mood</span>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-on-surface appearance-none cursor-pointer pr-8"
            >
              <option value="Feliz" className="bg-surface-container">Feliz</option>
              <option value="Tranquilo" className="bg-surface-container">Tranquilo</option>
              <option value="Neutro" className="bg-surface-container">Neutro</option>
              <option value="Ansioso" className="bg-surface-container">Ansioso</option>
              <option value="Triste" className="bg-surface-container">Triste</option>
              <option value="Estressado" className="bg-surface-container">Estressado</option>
            </select>
            <span className="material-symbols-outlined absolute right-0 text-on-surface-variant opacity-50 pointer-events-none">expand_more</span>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm ${message.includes('sucesso') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`cyan-ice-ghost w-full py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-semibold mt-4 transition-all duration-300 ${
            loading ? 'text-secondary opacity-50' : 'text-secondary hover:border-secondary/60'
          }`}
        >
          {loading ? "PROCESSANDO..." : "SALVAR REGISTRO"}
        </button>
      </div>
    </form>
  );
}
