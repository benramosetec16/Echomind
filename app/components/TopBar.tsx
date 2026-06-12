'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');
      }
      setLoading(false);
    };
    fetchUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-80px)] z-40 bg-transparent flex justify-between items-center px-16 py-8">
      <h1 className="font-sans text-xl font-medium text-on-background">{title}</h1>
      <div className="flex items-center gap-6">
        <button className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity active:opacity-70" title="Sincronizar">
          sync
        </button>
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full pl-2 pr-4 py-1.5">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-white/10">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-on-surface leading-tight">
              {loading ? 'Carregando...' : userName || 'Desconectado'}
            </span>
            <span className="text-[10px] text-secondary uppercase tracking-widest font-semibold leading-tight">
              {userName ? 'Conectado' : 'Offline'}
            </span>
          </div>
          {userName && (
            <button 
              onClick={handleLogout}
              className="ml-2 text-[10px] uppercase font-semibold text-error hover:text-error/80 transition-colors"
              title="Sair"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
