'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { icon: 'waves', label: 'Atmosphere', href: '/dashboard' },
  { icon: 'auto_awesome', label: 'Reflect', href: '/dashboard/checkin' },
  { icon: 'favorite', label: 'Pulse', href: '/dashboard/history' },
  { icon: 'spa', label: 'Harmony', href: '/dashboard/alerts' },
  { icon: 'nightlight', label: 'Sanctuary', href: '/dashboard/profile' },
];

export default function Sidebar() {
  const pathname = usePathname();

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

      <div className="mt-auto mb-8 w-full px-4 flex justify-center group-hover:justify-start group-hover:px-6 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-surface-container flex items-center justify-center">
             <span className="font-sans text-sm font-medium text-on-surface-variant">AX</span>
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <span className="font-sans text-sm text-on-surface font-semibold">Alex X.</span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Resonance: 98%</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
