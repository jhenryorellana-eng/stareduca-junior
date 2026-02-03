'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useUserStore, getLevelName, LEVEL_THRESHOLDS } from '@/stores/user-store';
import { formatXp } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

// Interfaces
interface CourseInProgress {
  id: string;
  title: string;
  thumbnailUrl: string;
  progressPercent: number;
  xpReward: number;
}

interface RecommendedCourse {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  xpReward: number;
  durationMinutes: number;
}

// Helper para formatear duración
const formatDuration = (minutes: number) => {
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function HomePage() {
  const { student } = useAuth();
  const { token } = useAuthStore();
  const { xpTotal, currentLevel, currentStreak, badges, xpToNextLevel, levelProgress } = useUserStore();
  const [courseInProgress, setCourseInProgress] = useState<CourseInProgress | null>(null);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Fetch home data - OPTIMIZADO: Una sola llamada API
  useEffect(() => {
    async function fetchHomeData() {
      if (!student?.id || !token) return;

      try {
        // Una sola llamada - incluye duración, lessonsCount, isCompleted
        const response = await fetch(`/api/courses?_t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }

        const { courses: allCourses } = await response.json();

        // Filtrar curso activo usando isCompleted del backend
        const activeCourses = allCourses
          .filter((c: any) => c.isEnrolled && !c.isCompleted)
          .sort((a: any, b: any) => b.progressPercent - a.progressPercent);

        if (activeCourses.length > 0) {
          const course = activeCourses[0];
          setCourseInProgress({
            id: course.id,
            title: course.title,
            thumbnailUrl: course.thumbnailUrl || '',
            progressPercent: course.progressPercent,
            xpReward: course.xpReward,
          });
        } else {
          setCourseInProgress(null);
        }

        // Cursos recomendados - duración ya viene del backend
        const recommended = allCourses
          .filter((c: any) => !c.isEnrolled)
          .slice(0, 5)
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            category: c.category || 'General',
            thumbnailUrl: c.thumbnailUrl || '',
            xpReward: c.xpReward,
            durationMinutes: c.totalDuration,
          }));

        setRecommendedCourses(recommended);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setIsLoadingHome(false);
      }
    }

    fetchHomeData();
  }, [student?.id, token]);

  // Calculate XP progress using real level thresholds
  const currentLevelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);
  const nextLevelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel + 1);
  const xpForCurrentLevel = currentLevelData?.minXp || 0;
  const xpForNextLevel = nextLevelData?.minXp || xpForCurrentLevel;
  const xpProgress = xpTotal - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.round(levelProgress);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24">
      {/* Header Section with Gradient */}
      <header className="relative w-full bg-gradient-to-br from-[#090653] to-[#8B5CF6] px-5 pt-12 pb-8 rounded-b-[2rem] shadow-lg overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        {/* Top Bar: Avatar & Settings */}
        <div className="relative flex items-center justify-between mb-6 z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-white/30 bg-white/10 p-0.5">
              {student?.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="h-full w-full rounded-full bg-primary/50 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {student?.firstName?.charAt(0) || 'E'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-white/80 text-sm font-medium">Bienvenido</span>
              <h2 className="text-white text-xl font-bold leading-none">
                ¡Hola, {student?.firstName || 'Estudiante'}!
              </h2>
            </div>
          </div>
          <Link
            href="/avisos"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <Icon name="notifications" size={24} />
          </Link>
        </div>

        {/* Stats Row */}
        <div className="relative grid grid-cols-3 gap-3 z-10">
          {/* XP Card */}
          <div className="stats-card">
            <span className="text-xl">⭐</span>
            <span className="text-lg font-bold leading-tight">{formatXp(xpTotal)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              XP Total
            </span>
          </div>
          {/* Streak Card */}
          <div className="stats-card">
            <span className="text-xl">🔥</span>
            <span className="text-lg font-bold leading-tight">{currentStreak} días</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Racha
            </span>
          </div>
          {/* Badges Card */}
          <div className="stats-card">
            <span className="text-xl">🏆</span>
            <span className="text-lg font-bold leading-tight">{badges?.length || 0}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Logros
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col gap-6 px-5 pt-6">
        {/* Level Progress Widget */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card animate-fade-in-up">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Progreso actual
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                NIVEL {currentLevel}: {getLevelName(currentLevel)}
              </h3>
            </div>
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              {xpProgress}/{xpNeeded} XP
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            ¡Te faltan {xpNeeded - xpProgress} XP para el siguiente nivel!
          </p>
        </div>

        {/* Resume Learning Section */}
        {courseInProgress && (
          <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Continúa aprendiendo</h3>
              <Link href="/aprender" className="text-sm font-medium text-primary hover:text-primary-dark">
                Ver todo
              </Link>
            </div>
            <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all hover:shadow-card-hover">
              <div className="relative h-36 w-full overflow-hidden">
                {courseInProgress.thumbnailUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${courseInProgress.thumbnailUrl}')` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark" />
                )}
                <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                  +{courseInProgress.xpReward} XP
                </div>
              </div>
              <div className="flex flex-col p-5">
                <h4 className="text-xl font-bold text-slate-900">{courseInProgress.title}</h4>
                <p className="mb-4 text-sm text-gray-500">{courseInProgress.progressPercent}% completado</p>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex justify-between text-xs font-medium text-gray-500">
                      <span>Progreso</span>
                      <span>{courseInProgress.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${courseInProgress.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/aprender/${courseInProgress.id}`}
                    className="flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary-dark active:scale-95"
                  >
                    Reanudar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Carousel */}
        {recommendedCourses.length > 0 && (
          <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-bold text-slate-900">Recomendado para ti</h3>
            <div className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
              {recommendedCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/aprender/${course.id}`}
                  className="min-w-[220px] max-w-[220px] snap-center rounded-2xl bg-white p-3 shadow-sm border border-gray-100 transition-all hover:shadow-card-hover hover:-translate-y-1"
                >
                  <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl bg-gray-100">
                    {course.thumbnailUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${course.thumbnailUrl}')` }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary to-primary-dark" />
                    )}
                    <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {course.category}
                    </div>
                  </div>
                  <h5 className="mb-1 text-base font-bold text-slate-900 truncate">{course.title}</h5>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-xs text-gray-500">
                      <Icon name="schedule" size={16} className="mr-1" />
                      {formatDuration(course.durationMinutes)}
                    </span>
                    <span className="text-xs font-bold text-primary">+{course.xpReward} XP</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
