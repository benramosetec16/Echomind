"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from "recharts";

type ChartData = {
  date: string;
  heart_rate: number;
  sleep_hours: number;
  energy_level: string;
  mood: string;
};

interface BiometricsChartsProps {
  data: ChartData[];
}

export default function BiometricsCharts({ data }: BiometricsChartsProps) {
  const [activeChart, setActiveChart] = useState<"heart_rate" | "sleep" | "mood">("heart_rate");

  // Transformar mood e energy para numérico para o gráfico (opcional/simplificado)
  const chartData = data.map(item => {
    let moodValue = 0;
    switch(item.mood) {
      case "Feliz": moodValue = 5; break;
      case "Tranquilo": moodValue = 4; break;
      case "Neutro": moodValue = 3; break;
      case "Ansioso": moodValue = 2; break;
      case "Estressado": moodValue = 1; break;
      case "Triste": moodValue = 0; break;
    }
    return {
      ...item,
      dateFormatted: new Date(item.date).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      moodValue
    };
  }).reverse(); // Do mais antigo para o mais recente se vier ordernado desc

  return (
    <div className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,255,255,0.05)]">
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setActiveChart("heart_rate")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeChart === "heart_rate" 
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,255,255,0.2)]" 
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          Frequência Cardíaca
        </button>
        <button
          onClick={() => setActiveChart("sleep")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeChart === "sleep" 
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          Sono
        </button>
        <button
          onClick={() => setActiveChart("mood")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeChart === "mood" 
              ? "bg-pink-500/20 text-pink-300 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]" 
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          Humor (Tendência)
        </button>
      </div>

      <div className="h-[300px] w-full">
        {activeChart === "heart_rate" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHeart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="dateFormatted" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#06b6d4' }}
              />
              <Area type="monotone" dataKey="heart_rate" name="BPM" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorHeart)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeChart === "sleep" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="dateFormatted" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#a855f7' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="sleep_hours" name="Horas" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeChart === "mood" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="dateFormatted" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="rgba(255,255,255,0.5)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tickFormatter={(val) => {
                  switch(val) {
                    case 5: return "Feliz";
                    case 4: return "Tranquilo";
                    case 3: return "Neutro";
                    case 2: return "Ansioso";
                    case 1: return "Estresse";
                    case 0: return "Triste";
                    default: return "";
                  }
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: 'white' }}
                formatter={(value: any, name: any, props: any) => [props.payload.mood, 'Humor']}
              />
              <Line type="monotone" dataKey="moodValue" name="Humor" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6, fill: '#fff', stroke: '#ec4899', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
