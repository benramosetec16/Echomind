"use client";

import { useEffect, useState } from "react";
import BiometricsCharts from "@/components/biometrics/BiometricsCharts";
import { createBrowserClient } from "@supabase/ssr";

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
      if (result.insight) {
        setAnalysis(result.insight);
      } else if (result.analysis) {
        setAnalysis(result.analysis);
      } else if (result.message) {
        setAnalysis(result.message);
      } else {
        setAnalysis("Não foi possível carregar os insights neste momento.");
      }
    } catch (error) {
      console.error("Erro ao carregar insights:", error);
      setAnalysis("Ocorreu um erro ao conectar com o serviço de análise.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse markdown-like response from our API
  const renderAnalysis = () => {
    if (!analysis) return null;

    const sections = analysis.split('###').filter(s => s.trim().length > 0);
    
    if (sections.length < 2) {
      return <p className="text-gray-300 leading-relaxed">{analysis}</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => {
          const lines = section.trim().split('\n');
          const title = lines[0].replace(/^\d+\.\s*/, '').trim();
          const content = lines.slice(1).join('\n').trim();

          let icon = "psychology";
          let color = "text-cyan-400";
          let bg = "bg-cyan-500/10";
          let border = "border-cyan-500/20";

          if (title.toLowerCase().includes("padrões")) {
            icon = "pattern"; color = "text-purple-400"; bg = "bg-purple-500/10"; border = "border-purple-500/20";
          } else if (title.toLowerCase().includes("recomenda")) {
            icon = "lightbulb"; color = "text-yellow-400"; bg = "bg-yellow-500/10"; border = "border-yellow-500/20";
          } else if (title.toLowerCase().includes("alerta")) {
            icon = "warning"; color = "text-red-400"; bg = "bg-red-500/10"; border = "border-red-500/20";
          }

          return (
            <div key={idx} className={`p-6 rounded-2xl border ${border} ${bg} backdrop-blur-sm`}>
              <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${color}`}>
                <span className="material-symbols-outlined">{icon}</span>
                {title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Charts Section */}
      <section>
        <h2 className="text-xl font-medium mb-4 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-cyan-400">monitoring</span>
          Evolução Biométrica
        </h2>
        {chartData.length > 0 ? (
          <BiometricsCharts data={chartData} />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
            {loading ? "Carregando gráficos..." : "Nenhum dado suficiente para gerar gráficos."}
          </div>
        )}
      </section>

      {/* AI Insights Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-purple-400">auto_awesome</span>
            Insights da IA Groq
          </h2>
          {loading && (
            <span className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
              Analisando...
            </span>
          )}
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 min-h-[200px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-purple-300 gap-4">
                <span className="material-symbols-outlined text-4xl animate-pulse">neurology</span>
                <p>Processando seus dados biométricos com modelos avançados...</p>
              </div>
            ) : (
              renderAnalysis()
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
