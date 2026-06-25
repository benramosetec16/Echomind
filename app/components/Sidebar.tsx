'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';

const navItems = [
  { icon: 'waves', label: 'Atmosfera', href: '/dashboard' },
  { icon: 'auto_awesome', label: 'Refletir', href: '/dashboard/checkin' },
  { icon: 'favorite', label: 'Pulso', href: '/dashboard/history' },
  { icon: 'spa', label: 'Harmonia', href: '/dashboard/alerts' },
  { icon: 'monitor_heart', label: 'Biometria', href: '/biometrics' },
  { icon: 'school', label: 'Estudos', href: '/study' },
  { icon: 'nightlight', label: 'Santuário', href: '/dashboard/profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>('UU');
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
        setUserName(name);
        setUserInitials(name.substring(0, 2).toUpperCase());
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-20 hover:w-64 transition-all duration-500 ease-in-out z-50 bg-background/80 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-8 gap-6 overflow-hidden group">
      <div className="mb-10 mt-4 flex items-center justify-center w-full px-6">
        <span className="material-symbols-outlined text-primary text-3xl hidden group-hover:block mr-3">auto_awesome</span>
        <span className="font-display text-4xl font-extralight text-primary tracking-tighter block group-hover:hidden">E</span>
        <span className="font-display text-4xl font-extralight text-primary tracking-tighter hidden group-hover:block">EchoMind</span>
      </div>

      <div className="flex flex-col gap-4 w-full px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-4 py-3 px-3 transition-all duration-300 rounded-full active:scale-95 ${
                isActive 
                  ? 'text-secondary bg-secondary-container/20' 
                  : 'text-on-surface-variant opacity-60 hover:text-primary'
              }`}
            >
              <span 
                className="material-symbols-outlined text-2xl flex-shrink-0"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-sans text-sm tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto mb-8 w-full px-4 flex flex-col gap-3">
        {/* User Info */}
        <div className="flex items-center gap-4 group-hover:px-2 transition-all">
          <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-surface-container flex items-center justify-center">
             <span className="font-sans text-sm font-medium text-on-surface-variant">{userInitials}</span>
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <span className="font-sans text-sm text-on-surface font-semibold">{userName || '...'}</span>
            <span className="text-[10px] text-green-400 uppercase tracking-widest font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
              Online
            </span>
          </div>
        </div>

        {/* Logout button - only visible on hover */}
        <button 
          onClick={handleLogout}
          className="hidden group-hover:flex items-center gap-3 py-2.5 px-3 rounded-full text-on-surface-variant opacity-60 hover:text-error hover:opacity-100 hover:bg-error/10 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0">logout</span>
          <span className="font-sans text-sm tracking-wide whitespace-nowrap">Sair</span>
        </button>
      </div>
    </nav>
  );
}
