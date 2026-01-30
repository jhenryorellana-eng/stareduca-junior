'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useSuperAppBridge } from '@/hooks/use-super-app-bridge';
import { useUserStore, getLevelName, LEVEL_THRESHOLDS } from '@/stores/user-store';
import { formatXp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';

// Helper para formatear minutos a horas/minutos
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function PerfilPage() {
  const { student, logout } = useAuth();
  const { token } = useAuthStore();
  const { requestClose, isInWebView } = useSuperAppBridge();
  const { xpTotal, currentLevel, currentStreak, maxStreak, xpToNextLevel, levelProgress, badges } = useUserStore();
  const [totalCourses, setTotalCourses] = useState(0);
  const [completedCourses, setCompletedCourses] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Fetch total published courses to calculate locked badges count
  useEffect(() => {
    async function fetchCourseCount() {
      const { count } = await supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true);
      setTotalCourses(count || 0);
    }
    fetchCourseCount();
  }, []);

  // Fetch completed courses and total time using API route (bypass RLS)
  useEffect(() => {
    async function fetchProfileStats() {
      if (!student?.id || !token) return;

      try {
        // Usar API route que bypasa RLS
        const response = await fetch('/api/courses', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          console.error('Error fetching courses');
          return;
        }

        const { courses } = await response.json();

        // Filtrar cursos completados
        const completedList = courses.filter((c: any) => c.enrollmentStatus === 'completed');
        setCompletedCourses(completedList.length);

        // Calcular tiempo total de cursos completados
        if (completedList.length > 0) {
          let totalMins = 0;
          for (const course of completedList) {
            const { data: lessons } = await supabase
              .from('lessons')
              .select('duration_minutes')
              .eq('course_id', course.id);
            totalMins += lessons?.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0) || 0;
          }
          setTotalMinutes(totalMins);
        }
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    }

    fetchProfileStats();
  }, [student?.id, token]);

  const lockedBadgesCount = Math.max(0, totalCourses - badges.length);

  // Calculate XP progress using real level thresholds
  const currentLevelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);
  const nextLevelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel + 1);
  const xpForCurrentLevel = currentLevelData?.minXp || 0;
  const xpForNextLevel = nextLevelData?.minXp || xpForCurrentLevel;
  const xpProgress = xpTotal - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.round(levelProgress);

  const handleLogout = () => {
    logout();
    if (isInWebView) {
      requestClose();
    }
  };

  return (
    <div className="bg-background-light min-h-screen pb-24 relative overflow-x-hidden">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-background-light/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Logros</h2>
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
        >
          <Icon name="logout" size={24} />
        </button>
      </div>

      {/* Hero Card: Level & XP */}
      <div className="px-4 mt-2">
        <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/20 p-6 text-white animate-fade-in-up">
          {/* Decorative circle */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-6">
            {/* Top Row: Avatar & Level Info */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full border-2 border-white/30 p-1">
                  {student?.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {student?.firstName?.charAt(0) || 'E'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-accent-cyan text-primary-dark text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white">
                  Lvl {currentLevel}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-accent-cyan font-semibold text-sm tracking-wider uppercase mb-0.5">
                  Rango Actual
                </p>
                <h1 className="text-2xl font-bold leading-none">{getLevelName(currentLevel)}</h1>
                <p className="text-white/80 text-sm mt-1">
                  XP Total: <span className="text-white font-bold">{formatXp(xpTotal)}</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-medium text-white/90">
                <span>Nivel {currentLevel}</span>
                <span>{xpNeeded - xpProgress} XP para Nivel {currentLevel + 1}</span>
              </div>
              <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-accent-cyan rounded-full relative transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-4 mt-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="grid grid-cols-3 gap-3">
          {/* Streak */}
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 text-center">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-1">
              <Icon name="local_fire_department" size={18} />
            </div>
            <p className="text-lg font-bold text-slate-900 leading-none">{currentStreak}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Racha</p>
          </div>
          {/* Courses */}
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 text-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-1">
              <Icon name="menu_book" size={18} />
            </div>
            <p className="text-lg font-bold text-slate-900 leading-none">{completedCourses}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Cursos</p>
          </div>
          {/* Time */}
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mb-1">
              <Icon name="schedule" size={18} />
            </div>
            <p className="text-lg font-bold text-slate-900 leading-none">{formatTime(totalMinutes)}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Tiempo</p>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="px-4 flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Mis Insignias</h3>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
            {badges.length} / {totalCourses || badges.length}
          </span>
        </div>
        <div className="px-4 pb-4">
          {/* 5 Column Grid */}
          <div className="grid grid-cols-5 gap-3">
            {/* Earned Badges from store */}
            {badges.map((badge) => {
              const [colorFrom, colorTo] = (badge.color || '#fcd34d|#f59e0b').split('|');
              return (
                <div key={badge.id} className="flex flex-col items-center gap-1 group cursor-pointer">
                  <div
                    className="aspect-square w-full rounded-full p-0.5 badge-glow transition-transform transform group-hover:scale-105"
                    style={{ background: `linear-gradient(to bottom right, ${colorFrom}, ${colorTo})` }}
                  >
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-transparent">
                      <Icon name={badge.icon} size={24} style={{ color: colorTo }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Locked Badges */}
            {Array.from({ length: lockedBadgesCount }).map((_, index) => (
              <div key={`locked-${index}`} className="flex flex-col items-center gap-1 opacity-50">
                <div className="aspect-square w-full rounded-full bg-slate-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="lock" size={20} className="text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="px-4 mt-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <Icon name="person" size={24} className="text-primary" />
            <h3 className="font-bold text-slate-900">Información</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nombre</span>
              <span className="font-medium text-slate-900">
                {student?.firstName} {student?.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Código</span>
              <span className="font-medium text-slate-900">{student?.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mejor racha</span>
              <span className="font-medium text-orange-500">{maxStreak} días 🔥</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
