"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BiometricsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/biometrics", label: "Dashboard", icon: "dashboard" },
    { href: "/biometrics/history", label: "Histórico", icon: "history" },
    { href: "/biometrics/insights", label: "Insights IA", icon: "psychology" },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-gray-200 p-4 md:p-8 relative overflow-hidden">
      {/* Glow Effects Fundos */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
              Biometria & Saúde
            </h1>
            <p className="text-gray-400 mt-1">Sincronize e analise seus dados vitais</p>
          </div>
          
          <nav className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive 
                      ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
