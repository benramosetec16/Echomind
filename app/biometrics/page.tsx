import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import BiometricsForm from "@/components/biometrics/BiometricsForm";
import { redirect } from "next/navigation";

import TopBar from "@/app/components/TopBar";
import PageTransition from "@/app/components/PageTransition";
import Link from "next/link";

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
    // Para simplificar, n├úo redirecionando imediatamente para login em dev,
    // mas na vida real seria redirect('/login')
  }

  // Buscar ├║ltimo registro
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
    { label: "├Ültima Leitura Card├¡aca", value: latest ? `${latest.heart_rate}` : "--", unit: latest ? "bpm" : "", icon: "favorite" },
    { label: "Horas de Sono", value: latest ? `${latest.sleep_hours}` : "--", unit: latest ? "h" : "", icon: "bedtime" },
    { label: "N├¡vel de Energia", value: latest ? latest.energy_level : "--", unit: "", icon: "bolt" },
    { label: "Humor", value: latest ? latest.mood : "--", unit: "", icon: "mood" }
  ];

  return (
    <>
      <TopBar title="Biometria & Sa├║de" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen flex flex-col">
        <PageTransition>
          <div className="max-w-[1200px] mx-auto w-full mb-10 flex justify-end gap-6 items-center">
             <Link href="/biometrics/history" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors">
               <span className="material-symbols-outlined text-[16px]">history</span> HIST├ôRICO
             </Link>
             <Link href="/biometrics/insights" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-tertiary hover:text-white transition-colors">
               <span className="material-symbols-outlined text-[16px]">auto_awesome</span> INSIGHTS IA
             </Link>
          </div>

          <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card, i) => (
                  <div key={i} className="aetheric-glass rounded-[32px] p-8 flex flex-col justify-between group hover:border-secondary/20 transition-all duration-700">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant">{card.label}</span>
                      <span className="material-symbols-outlined text-secondary opacity-50 group-hover:opacity-100 transition-opacity">{card.icon}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extralight text-on-surface">{card.value}</span>
                      {card.unit && <span className="text-sm text-on-surface-variant opacity-40">{card.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Integration Placeholders */}
              <div className="aetheric-glass rounded-[40px] p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant block">Integra├º├Áes</span>
                  <span className="material-symbols-outlined text-secondary opacity-50">sync</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Apple HealthKit */}
                  <div className="aetheric-glass rounded-3xl p-6 flex gap-4 items-center opacity-50 grayscale">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5">
                      <span className="material-symbols-outlined text-on-surface">health_metrics</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <h4 className="text-sm font-medium text-on-surface mb-1">Apple HealthKit</h4>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-40">Em breve</span>
                    </div>
                  </div>
                  
                  {/* Apple Watch */}
                  <div className="aetheric-glass rounded-3xl p-6 flex gap-4 items-center opacity-50 grayscale">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5">
                      <span className="material-symbols-outlined text-on-surface">watch</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <h4 className="text-sm font-medium text-on-surface mb-1">Apple Watch</h4>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-40">Em breve</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <BiometricsForm />
            </div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
