'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useUserStore } from '@/stores/user-store';
import { BottomNav } from '@/components/layout';
import { XpToast, BadgeToast } from '@/components/gamification';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, loadFromStorage, student, token } = useAuthStore();
  const { setGamificationData, setBadges } = useUserStore();

  // Ocultar la barra de navegación en páginas de detalle de curso y capítulos
  // /aprender → mostrar, /aprender/[id] → ocultar, /aprender/[id]/capitulo/[x] → ocultar
  const shouldHideNav = pathname.startsWith('/aprender/') && pathname !== '/aprender';

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/callback?error=session_expired');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (student) {
      setGamificationData({
        xpTotal: student.xpTotal,
        currentLevel: student.currentLevel,
        currentStreak: student.currentStreak,
      });
    }
  }, [student, setGamificationData]);

  // Fetch real gamification data from API - refresh on navigation
  useEffect(() => {
    async function fetchGamificationData() {
      if (!token) return;

      try {
        const response = await fetch('/api/gamification', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setGamificationData({
            xpTotal: data.xpTotal,
            currentLevel: data.currentLevel,
            currentStreak: data.currentStreak,
            maxStreak: data.maxStreak,
          });
          if (data.badges) {
            setBadges(data.badges);
          }
        }
      } catch (error) {
        console.error('Error fetching gamification:', error);
      }
    }

    fetchGamificationData();
  }, [token, pathname, setGamificationData, setBadges]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-background-light ${!shouldHideNav ? 'pb-20' : ''}`}>
      {/* XP Toast for gamification feedback */}
      <XpToast />
      {/* Badge Toast for badge earned feedback */}
      <BadgeToast />

      {/* Main content */}
      <main>{children}</main>

      {/* Bottom navigation - ocultar en páginas de detalle de curso y capítulos */}
      {!shouldHideNav && <BottomNav />}
    </div>
  );
}
