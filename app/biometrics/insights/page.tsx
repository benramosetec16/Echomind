"use client";

import { useEffect, useState } from "react";
import BiometricsCharts from "@/components/biometrics/BiometricsCharts";
import { createBrowserClient } from "@supabase/ssr";
import TopBar from "@/app/components/TopBar";
import PageTransition from "@/app/components/PageTransition";
import Link from "next/link";

export default function BiometricsInsights() {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchDataAndAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDataAndAnalyze = async () => {
    setLoading(true);
    try {
      // 1. Fetch data for charts
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data } = await supabase
          .from("biometrics")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        
        if (data) {
          // Format for charts
          const formatted = data.map(d => ({
            date: d.created_at,
            heart_rate: d.heart_rate,
            sleep_hours: d.sleep_hours,
            energy_level: d.energy_level,
            mood: d.mood
          }));
          setChartData(formatted);
        }
      }

      // 2. Fetch AI analysis
      const res = await fetch("/api/biometrics-analysis", {
        method: "POST"
      });
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Falha ao analisar os dados.");
      }
      
      if (result.insight) {
        setAnalysis(result.insight);
      } else if (result.analysis) {
        setAnalysis(result.analysis);
      } else if (result.message) {
        setAnalysis(result.message);
      } else {
        setAnalysis("Não foi possível carregar os insights neste momento.");
      }
    } catch (error: any) {
      console.error("Erro ao carregar insights:", error);
      setAnalysis(error.message || "Ocorreu um erro ao conectar com o serviço de análise.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse markdown-like response from our API
  const renderAnalysis = () => {
    if (!analysis) return null;

    const sections = analysis.split('###').filter(s => s.trim().length > 0);
    
    if (sections.length < 2) {
      return <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis}</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => {
          const lines = section.trim().split('\n');
          const title = lines[0].replace(/^\d+\.\s*/, '').trim();
          const content = lines.slice(1).join('\n').trim();

          let icon = "psychology";
          let colorClass = "text-secondary";

          if (title.toLowerCase().includes("padrões")) {
            icon = "pattern"; colorClass = "text-tertiary";
          } else if (title.toLowerCase().includes("recomenda")) {
            icon = "lightbulb"; colorClass = "text-primary";
          } else if (title.toLowerCase().includes("alerta")) {
            icon = "warning"; colorClass = "text-error";
          }

          return (
            <div key={idx} className="glass-panel rounded-3xl p-8 hover:border-white/10 transition-colors">
              <h3 className={`text-sm uppercase tracking-[0.15em] font-semibold mb-4 flex items-center gap-2 ${colorClass}`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-wrap font-light">
                {content}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <TopBar title="Insights da IA" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen flex flex-col">
        <PageTransition>
          <div className="max-w-[1200px] mx-auto w-full mb-10 flex justify-start">
             <Link href="/biometrics" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors">
               <span className="material-symbols-outlined text-[16px]">arrow_back</span> RETORNAR À BASE
             </Link>
          </div>

          <div className="space-y-8 max-w-[1200px] mx-auto w-full">
            {/* Charts Section */}
            <section className="aetheric-glass rounded-[32px] p-8 mb-8">
              <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-secondary mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">monitoring</span>
                EVOLUÇÃO BIOMÉTRICA
              </h2>
              {chartData.length > 0 ? (
                <BiometricsCharts data={chartData} />
              ) : (
                <div className="text-center opacity-50 py-10 text-on-surface-variant text-sm tracking-widest uppercase font-semibold">
                  {loading ? "Inicializando rastreamento..." : "Nenhum dado suficiente para visualização."}
                </div>
              )}
            </section>

            {/* AI Insights Section */}
            <section className="aetheric-glass rounded-[32px] p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-tertiary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  PROCESSAMENTO NEURAL: GROQ
                </h2>
                {loading && (
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 font-semibold">
                    <span className="w-3 h-3 border-2 border-tertiary border-t-transparent rounded-full animate-[spin_2s_linear_infinite]"></span>
                    Analisando Padrões
                  </span>
                )}
              </div>

              <div className="min-h-[200px] relative">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-4 opacity-50">
                    <span className="material-symbols-outlined text-4xl pulse-effect text-tertiary">neurology</span>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-on-surface-variant">Sintetizando Dados Biométricos...</p>
                  </div>
                ) : (
                  renderAnalysis()
                )}
              </div>
            </section>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
