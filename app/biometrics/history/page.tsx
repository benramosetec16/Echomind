"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type BiometricRecord = {
  id: string;
  heart_rate: number;
  sleep_hours: number;
  energy_level: string;
  mood: string;
  created_at: string;
};

import TopBar from "@/app/components/TopBar";
import PageTransition from "@/app/components/PageTransition";
import Link from "next/link";

export default function BiometricsHistory() {
  const [records, setRecords] = useState<BiometricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"7d" | "30d" | "all">("7d");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("biometrics")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (filter === "7d") {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      query = query.gte("created_at", date.toISOString());
    } else if (filter === "30d") {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      query = query.gte("created_at", date.toISOString());
    }

    const { data } = await query;
    if (data) setRecords(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      await supabase.from("biometrics").delete().eq("id", id);
      fetchRecords();
    }
  };

  return (
    <>
      <TopBar title="Histórico Biométrico" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen flex flex-col">
        <PageTransition>
          <div className="max-w-[1200px] mx-auto w-full mb-10 flex justify-start">
             <Link href="/biometrics" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary transition-colors">
               <span className="material-symbols-outlined text-[16px]">arrow_back</span> RETORNAR À BASE
             </Link>
          </div>
          
          <div className="max-w-[1200px] mx-auto w-full aetheric-glass rounded-[32px] p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
              <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">history</span>
                REGISTROS HISTÓRICOS
              </h2>
              
              <div className="flex gap-6">
                <button 
                  onClick={() => setFilter("7d")} 
                  className={`text-[10px] uppercase tracking-widest font-semibold transition-all hover:text-secondary ${filter === "7d" ? "text-secondary border-b border-secondary pb-1" : "text-on-surface-variant opacity-60"}`}
                >
                  7 DIAS
                </button>
                <button 
                  onClick={() => setFilter("30d")} 
                  className={`text-[10px] uppercase tracking-widest font-semibold transition-all hover:text-secondary ${filter === "30d" ? "text-secondary border-b border-secondary pb-1" : "text-on-surface-variant opacity-60"}`}
                >
                  30 DIAS
                </button>
                <button 
                  onClick={() => setFilter("all")} 
                  className={`text-[10px] uppercase tracking-widest font-semibold transition-all hover:text-secondary ${filter === "all" ? "text-secondary border-b border-secondary pb-1" : "text-on-surface-variant opacity-60"}`}
                >
                  TODOS
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant border-b border-white/10 opacity-70">
                  <tr>
                    <th className="px-6 py-6 font-semibold">Data e Hora</th>
                    <th className="px-6 py-6 font-semibold">Frequência</th>
                    <th className="px-6 py-6 font-semibold">Sono</th>
                    <th className="px-6 py-6 font-semibold">Energia</th>
                    <th className="px-6 py-6 font-semibold">Humor</th>
                    <th className="px-6 py-6 font-semibold text-right">Controle</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant uppercase tracking-widest text-xs opacity-50">
                        Recuperando registros...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant uppercase tracking-widest text-xs opacity-50">
                        Nenhum registro encontrado para este período.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-6 whitespace-nowrap text-on-surface-variant font-light">
                          {new Date(record.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-6 py-6">
                          <span className="flex items-center gap-2 font-light">
                            <span className="material-symbols-outlined text-[16px] text-secondary opacity-50 group-hover:opacity-100 transition-opacity">favorite</span>
                            {record.heart_rate} <span className="text-[10px] opacity-40">BPM</span>
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <span className="flex items-center gap-2 font-light">
                            <span className="material-symbols-outlined text-[16px] text-tertiary opacity-50 group-hover:opacity-100 transition-opacity">bedtime</span>
                            {record.sleep_hours} <span className="text-[10px] opacity-40">H</span>
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-xs uppercase tracking-widest text-primary opacity-80 border border-primary/20 px-2 py-1 rounded-md">
                            {record.energy_level}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-xs uppercase tracking-widest text-secondary opacity-80 border border-secondary/20 px-2 py-1 rounded-md">
                            {record.mood}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="text-on-surface-variant opacity-30 hover:opacity-100 hover:text-error transition-all"
                            title="Desintegrar Registro"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
