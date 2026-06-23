import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import BiometricsForm from "@/components/biometrics/BiometricsForm";
import { redirect } from "next/navigation";

export default async function BiometricsDashboard() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    // Para simplificar, não redirecionando imediatamente para login em dev,
    // mas na vida real seria redirect('/login')
  }

  // Buscar último registro
  let latest = null;
  if (userData?.user) {
    const { data } = await supabase
      .from("biometrics")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (data) latest = data;
  }

  const cards = [
    { label: "Última Leitura Cardíaca", value: latest ? `${latest.heart_rate} bpm` : "--", icon: "❤️", color: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/20" },
    { label: "Horas de Sono", value: latest ? `${latest.sleep_hours} h` : "--", icon: "😴", color: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/20" },
    { label: "Nível de Energia", value: latest ? latest.energy_level : "--", icon: "⚡", color: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/20" },
    { label: "Humor", value: latest ? latest.mood : "--", icon: "😊", color: "from-pink-500/20 to-pink-500/5", border: "border-pink-500/20" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className={`bg-gradient-to-b ${card.color} border ${card.border} backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg transition-transform hover:scale-105`}>
              <span className="text-3xl mb-2">{card.icon}</span>
              <span className="text-2xl font-bold text-white mb-1">{card.value}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</span>
            </div>
          ))}
        </div>

        {/* Integration Placeholders */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400">sync</span>
            Integrações Disponíveis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 bg-black/40 rounded-xl p-4 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <span className="text-black font-bold text-xl"></span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Apple HealthKit</div>
                  <div className="text-xs text-gray-400">Em breve</div>
                </div>
              </div>
              <button disabled className="text-xs px-3 py-1 bg-white/10 rounded-full text-gray-300">Conectar</button>
            </div>
            
            <div className="border border-white/10 bg-black/40 rounded-xl p-4 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">watch</span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Apple Watch</div>
                  <div className="text-xs text-gray-400">Em breve</div>
                </div>
              </div>
              <button disabled className="text-xs px-3 py-1 bg-white/10 rounded-full text-gray-300">Conectar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <BiometricsForm />
      </div>
    </div>
  );
}
