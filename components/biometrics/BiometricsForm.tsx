"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function BiometricsForm() {
  const [heartRate, setHeartRate] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [energyLevel, setEnergyLevel] = useState("Média");
  const [mood, setMood] = useState("Neutro");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase.from("biometrics").insert({
        user_id: userData.user.id,
        heart_rate: parseInt(heartRate),
        sleep_hours: parseFloat(sleepHours),
        energy_level: energyLevel,
        mood: mood,
      });

      if (error) throw error;

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
    <form onSubmit={handleSubmit} className="relative z-10 bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl p-8 shadow-[0_0_40px_rgba(0,255,255,0.1)] hover:shadow-[0_0_60px_rgba(0,255,255,0.15)] transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-2xl pointer-events-none"></div>
      
      <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
        Novo Registro Biométrico
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Frequência Cardíaca (bpm)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">❤️</span>
            <input
              type="number"
              required
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="Ex: 85 bpm"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Horas de Sono</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">😴</span>
            <input
              type="number"
              step="0.1"
              required
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="Ex: 8 horas"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nível de Energia</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⚡</span>
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all appearance-none"
            >
              <option value="Muito Baixa">Muito Baixa</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Muito Alta">Muito Alta</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Humor Atual</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">😊</span>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all appearance-none"
            >
              <option value="Feliz">Feliz</option>
              <option value="Tranquilo">Tranquilo</option>
              <option value="Neutro">Neutro</option>
              <option value="Ansioso">Ansioso</option>
              <option value="Triste">Triste</option>
              <option value="Estressado">Estressado</option>
            </select>
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
          className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-4"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 bg-[length:200%_auto] animate-gradient opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
          <div className="relative bg-black/80 backdrop-blur-md px-6 py-3 rounded-xl transition-all duration-300 group-hover:bg-black/60 flex items-center justify-center">
            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-300 group-hover:text-white transition-colors">
              {loading ? "Salvando..." : "Salvar Registro"}
            </span>
          </div>
        </button>
      </div>
    </form>
  );
}
