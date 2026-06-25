'use client';

import Link from 'next/link';

export default function TopBar({ title }: { title: string }) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 aetheric-glass border-b border-white/5 py-4 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-light tracking-widest hover:text-secondary transition-colors">
          EchoMind
        </Link>
        <span className="w-px h-6 bg-white/10 hidden md:block"></span>
        <h1 className="text-sm uppercase tracking-[0.2em] font-semibold text-secondary/80 hidden md:block">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex gap-6">
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors">
            Painel
          </Link>
          <Link href="/biometrics" className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors">
            Biometria
          </Link>
          <Link href="/study" className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors">
            Estudos
          </Link>
        </nav>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center cursor-pointer hover:bg-secondary/20 transition-colors">
            <span className="material-symbols-outlined text-[18px] text-secondary">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
