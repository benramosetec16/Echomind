'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export default function TopBar({ title, showBack }: TopBarProps) {
  const [userName, setUserName] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
        setUserName(name);
        setUserInitials(name.substring(0, 2).toUpperCase());
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
    <header
      className="fixed top-0 right-0 w-full md:w-[calc(100%-80px)] z-40 bg-background/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none flex justify-between items-center px-4 md:px-16 h-14 md:h-auto md:py-8"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1 -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center md:hidden"
            aria-label="Voltar"
          >
            arrow_back
          </button>
        )}
        <h1 className="font-sans text-lg md:text-xl font-medium text-on-background truncate">{title}</h1>
      </div>

      {/* Desktop user info */}
      <div className="hidden md:flex items-center gap-6">
        <button className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity active:opacity-70" title="Sincronizar">
          sync
        </button>
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full pl-2 pr-4 py-1.5">
          <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
            {loading ? (
              <span className="material-symbols-outlined text-on-surface-variant text-sm animate-pulse">person</span>
            ) : (
              <span className="text-[11px] font-semibold text-secondary leading-none">{userInitials || '??'}</span>
            )}
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

      {/* Mobile: compact actions */}
      <div className="flex md:hidden items-center gap-2">
        <button
          className="material-symbols-outlined text-on-surface-variant p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Sincronizar"
          aria-label="Sincronizar"
        >
          sync
        </button>
      </div>
    </header>
  );
}
