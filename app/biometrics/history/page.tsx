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
    <div className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
          Histórico de Registros
        </h2>
        
        <div className="flex gap-2 bg-[#0a0a0a] p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setFilter("7d")} 
            className={`px-4 py-2 text-sm rounded-lg transition-all ${filter === "7d" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Últimos 7 dias
          </button>
          <button 
            onClick={() => setFilter("30d")} 
            className={`px-4 py-2 text-sm rounded-lg transition-all ${filter === "30d" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Últimos 30 dias
          </button>
          <button 
            onClick={() => setFilter("all")} 
            className={`px-4 py-2 text-sm rounded-lg transition-all ${filter === "all" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Todos
          </button>
        </div>
      </div>

      <div className="relative z-10 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs uppercase bg-black/40 text-gray-400">
            <tr>
              <th className="px-6 py-4">Data e Hora</th>
              <th className="px-6 py-4">Batimentos (bpm)</th>
              <th className="px-6 py-4">Sono (h)</th>
              <th className="px-6 py-4">Energia</th>
              <th className="px-6 py-4">Humor</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Carregando registros...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhum registro encontrado para este período.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="border-b border-white/5 bg-black/20 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(record.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2">
                      <span className="text-red-400">❤️</span> {record.heart_rate}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2">
                      <span className="text-purple-400">😴</span> {record.sleep_hours}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-300 rounded-md text-xs border border-yellow-500/20">
                      {record.energy_level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-cyan-500/10 text-cyan-300 rounded-md text-xs border border-cyan-500/20">
                      {record.mood}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(record.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      title="Excluir"
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
  );
}
