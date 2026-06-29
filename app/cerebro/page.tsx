'use client';

import dynamic from 'next/dynamic';

// Carrega o Spline apenas no lado do cliente (navegador), removendo o erro de importação
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => (
    <div className="text-[#9fcfd5] text-sm tracking-widest uppercase">
      Carregando Conexão Neural...
    </div>
  ),
});

export default function CerebroPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#121414] overflow-hidden">
      {/* Modelo 3D do Cérebro */}
      <div className="absolute inset-0 z-0 h-full w-full flex items-center justify-center">
        <Spline
          scene="https://my.spline.design/particleaibraincopy-XnPe5vT1k2TPsSHWbxQARBw2/" 
        />
      </div>

      {/* Textos da Interface por cima */}
      <div className="relative z-10 pointer-events-none flex flex-col items-center text-center p-6 mt-auto mb-12">
        <h2 className="text-sm uppercase tracking-[0.3em] text-[#9fcfd5] font-semibold drop-shadow-[0_0_15px_rgba(159,207,213,0.4)]">
          Interface Neural Ativa
        </h2>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white opacity-40 mt-2">
          Use o mouse para girar pelas laterais e topo
        </p>
      </div>
    </main>
  );
}