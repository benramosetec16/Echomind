'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { getUserRole, type UserRole, ROLE_LABELS } from '../../utils/roles';

// Shared items available to all roles
const sharedItems = [
  { icon: 'nightlight', label: 'Santuário', href: '/dashboard/profile' },
];

const navByRole: Record<UserRole, { icon: string; label: string; href: string }[]> = {
  aluno: [
    { icon: 'waves', label: 'Atmosfera', href: '/dashboard' },
    { icon: 'auto_awesome', label: 'Refletir', href: '/dashboard/checkin' },
    { icon: 'psychology', label: 'Analisar', href: '/dashboard/analyze' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'shield_person', label: 'Protect', href: '/dashboard/protect' },
    { icon: 'favorite', label: 'Pulso', href: '/dashboard/history' },
    { icon: 'spa', label: 'Harmonia', href: '/dashboard/alerts' },
    { icon: 'health_metrics', label: 'Biometria', href: '/biometrics' },
    { icon: 'school', label: 'Estudos', href: '/study' },
    { icon: 'event_note', label: 'Agenda', href: '/dashboard/calendar' },
    { icon: 'handshake', label: 'Parceiros', href: '/dashboard/parceiros' },
  ],
  professor: [
    { icon: 'waves', label: 'Painel', href: '/dashboard/professor' },
    { icon: 'groups', label: 'Turmas', href: '/dashboard/professor' },
    { icon: 'auto_awesome', label: 'Refletir', href: '/dashboard/checkin' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'spa', label: 'Harmonia', href: '/dashboard/alerts' },
    { icon: 'event_note', label: 'Agenda', href: '/dashboard/calendar' },
    { icon: 'corporate_fare', label: 'Institucional', href: '/dashboard/institution' },
  ],
  orientador: [
    { icon: 'waves', label: 'Painel', href: '/dashboard/orientador' },
    { icon: 'visibility', label: 'Observação', href: '/dashboard/orientador' },
    { icon: 'auto_awesome', label: 'Refletir', href: '/dashboard/checkin' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'shield_person', label: 'Protect', href: '/dashboard/orientador/protect' },
    { icon: 'spa', label: 'Harmonia', href: '/dashboard/alerts' },
    { icon: 'event_note', label: 'Agenda', href: '/dashboard/calendar' },
    { icon: 'handshake', label: 'Parceiros', href: '/dashboard/parceiros' },
    { icon: 'corporate_fare', label: 'Institucional', href: '/dashboard/institution' },
  ],
  gestor: [
    { icon: 'corporate_fare', label: 'Gestão Escolar', href: '/dashboard/institution' },
    { icon: 'meeting_room', label: 'Salas', href: '/dashboard/institution' },
    { icon: 'vpn_key', label: 'Códigos', href: '/dashboard/institution' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'event_note', label: 'Agenda', href: '/dashboard/calendar' },
  ],
  administrador: [
    { icon: 'waves', label: 'Controle', href: '/dashboard/admin' },
    { icon: 'group', label: 'Usuários', href: '/dashboard/admin' },
    { icon: 'auto_awesome', label: 'Refletir', href: '/dashboard/checkin' },
    { icon: 'spa', label: 'Harmonia', href: '/dashboard/alerts' },
    { icon: 'database', label: 'Sistema', href: '/dashboard/admin' },
    { icon: 'corporate_fare', label: 'Institucional', href: '/dashboard/institution' },
  ],
};

// Mobile bottom nav: show first 4 role items + profile (always 5 max)
const mobileNavByRole: Record<UserRole, { icon: string; label: string; href: string }[]> = {
  aluno: [
    { icon: 'waves', label: 'Início', href: '/dashboard' },
    { icon: 'auto_awesome', label: 'Check-in', href: '/dashboard/checkin' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'psychology', label: 'Análise', href: '/dashboard/analyze' },
  ],
  professor: [
    { icon: 'waves', label: 'Painel', href: '/dashboard/professor' },
    { icon: 'groups', label: 'Turmas', href: '/dashboard/professor' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'auto_awesome', label: 'Check-in', href: '/dashboard/checkin' },
  ],
  orientador: [
    { icon: 'waves', label: 'Painel', href: '/dashboard/orientador' },
    { icon: 'shield_person', label: 'Protect', href: '/dashboard/orientador/protect' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'auto_awesome', label: 'Check-in', href: '/dashboard/checkin' },
  ],
  gestor: [
    { icon: 'corporate_fare', label: 'Gestão', href: '/dashboard/institution' },
    { icon: 'chat', label: 'Mensagens', href: '/dashboard/messages' },
    { icon: 'vpn_key', label: 'Códigos', href: '/dashboard/institution' },
    { icon: 'event_note', label: 'Agenda', href: '/dashboard/calendar' },
  ],
  administrador: [
    { icon: 'waves', label: 'Controle', href: '/dashboard/admin' },
    { icon: 'group', label: 'Usuários', href: '/dashboard/admin' },
    { icon: 'auto_awesome', label: 'Check-in', href: '/dashboard/checkin' },
    { icon: 'database', label: 'Sistema', href: '/dashboard/admin' },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>('UU');
  const [userRole, setUserRole] = useState<UserRole>('aluno');
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Viajante';
        setUserName(name);
        setUserInitials(name.substring(0, 2).toUpperCase());
      }
    };
    const fetchRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };
    fetchUser();
    fetchRole();
  }, [supabase]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <>
      {/* Desktop: Side nav */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 hover:w-64 transition-all duration-500 ease-in-out z-50 bg-background/80 backdrop-blur-xl border-r border-white/5 flex-col items-center py-8 gap-6 overflow-hidden group">
        <div className="mb-10 mt-4 flex items-center justify-center w-full px-6">
          <img src="/echomind-logo.png" alt="EchoMind" className="w-10 h-10 object-contain block group-hover:hidden flex-shrink-0" />
          <img src="/echomind-logo.png" alt="EchoMind" className="w-10 h-10 object-contain hidden group-hover:block flex-shrink-0" />
          <span className="font-display text-2xl font-extralight text-primary tracking-tighter hidden group-hover:block ml-3">EchoMind</span>
        </div>

        <div className="flex flex-col gap-4 w-full px-4 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
          {[...(navByRole[userRole] || navByRole.aluno), ...sharedItems].map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex items-center gap-4 py-3 px-3 transition-all duration-300 rounded-full active:scale-95 ${
                  active
                    ? 'text-secondary bg-secondary-container/20'
                    : 'text-on-surface-variant opacity-60 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-2xl flex-shrink-0" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
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
              <span className="font-sans text-sm font-medium text-on-surface-variant">{userInitials}</span>
            </div>
            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              <span className="font-sans text-sm text-on-surface font-semibold">{userName || '...'}</span>
              <span className="text-[10px] text-secondary uppercase tracking-widest">{ROLE_LABELS[userRole]}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile: Bottom nav bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-white/[0.06]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around px-1 h-16">
          {(mobileNavByRole[userRole] || mobileNavByRole.aluno).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={`mob-${item.href}-${item.label}`}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] px-2 py-2 rounded-2xl transition-all active:scale-90 ${
                  active ? 'text-secondary' : 'text-on-surface-variant/50'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`material-symbols-outlined transition-all ${active ? 'text-[22px]' : 'text-[20px]'}`}
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className={`text-[10px] leading-tight tracking-wide font-medium ${active ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-secondary mt-0.5" />
                )}
              </Link>
            );
          })}
          {/* Profile icon always visible */}
          <Link
            href="/dashboard/profile"
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] px-2 py-2 rounded-2xl transition-all active:scale-90 ${
              pathname === '/dashboard/profile' ? 'text-secondary' : 'text-on-surface-variant/50'
            }`}
            aria-label="Perfil"
            aria-current={pathname === '/dashboard/profile' ? 'page' : undefined}
          >
            <span
              className={`material-symbols-outlined transition-all ${pathname === '/dashboard/profile' ? 'text-[22px]' : 'text-[20px]'}`}
              style={{ fontVariationSettings: pathname === '/dashboard/profile' ? "'FILL' 1" : "'FILL' 0" }}
            >
              person
            </span>
            <span className={`text-[10px] leading-tight tracking-wide font-medium ${pathname === '/dashboard/profile' ? 'opacity-100' : 'opacity-60'}`}>
              Perfil
            </span>
            {pathname === '/dashboard/profile' && (
              <span className="w-1 h-1 rounded-full bg-secondary mt-0.5" />
            )}
          </Link>
        </div>
      </nav>
    </>
  );
}
