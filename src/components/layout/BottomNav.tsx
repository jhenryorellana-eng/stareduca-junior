'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user-store';

const tabs = [
  { name: 'Inicio', icon: 'home', href: '/' },
  { name: 'Aprender', icon: 'auto_stories', href: '/aprender' },
  { name: 'Comunidad', icon: 'hub', href: '/comunidad' },
  { name: 'Avisos', icon: 'notifications', href: '/avisos' },
  { name: 'Perfil', icon: 'person', href: '/perfil' },
];

export function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useUserStore((state) => state.unreadCount);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 rounded-t-4xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100">
      <div className="flex h-20 w-full items-center justify-around px-2 pb-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const showBadge = tab.href === '/avisos' && unreadCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'group flex flex-col items-center justify-center gap-1 p-2 transition-colors',
                active ? 'text-primary' : 'text-gray-400 hover:text-primary'
              )}
            >
              <div
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90',
                  active ? 'bg-primary/10' : 'bg-transparent group-hover:bg-gray-50'
                )}
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{
                    fontVariationSettings: active
                      ? "'FILL' 1, 'wght' 500"
                      : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {tab.icon}
                </span>
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </div>
              <span className={cn('text-[10px]', active ? 'font-bold' : 'font-medium')}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
