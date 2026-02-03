'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useUserStore } from '@/stores/user-store';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const MOTIVATIONAL_MESSAGES = [
  '¡Sigue así!',
  '¡Muy bien!',
  '¡Excelente!',
  '¡Vas bien!',
  '¡Genial!',
  '¡Increíble!',
  '¡Tú puedes!',
  '¡Adelante!',
];

function getMotivationalMessage(courseId: string): string {
  const index = courseId.charCodeAt(0) % MOTIVATIONAL_MESSAGES.length;
  return MOTIVATIONAL_MESSAGES[index];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  xp_reward: number;
  chapters_count: number;
  total_duration: number;
  progressPercent: number;
  isEnrolled: boolean;
  isCompleted: boolean;
}

type TabId = 'progress' | 'completed' | 'explore';

export default function AprenderPage() {
  const { student } = useAuth();
  const { token } = useAuthStore();
  const { currentStreak } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabId>('progress');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // OPTIMIZADO: Una sola llamada API con todos los datos + polling cada 30s
  useEffect(() => {
    async function fetchCourses() {
      if (!token) return;

      try {
        const response = await fetch('/api/courses', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }

        const { courses: data } = await response.json();

        // Mapear datos del backend
        const mapped = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          thumbnail_url: c.thumbnailUrl,
          category: c.category,
          xp_reward: c.xpReward,
          chapters_count: c.lessonsCount,
          total_duration: c.totalDuration,
          progressPercent: c.progressPercent,
          isEnrolled: c.isEnrolled,
          isCompleted: c.isCompleted,
        }));

        setCourses(mapped);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();

    // Polling cada 30 segundos para sincronizar cambios del admin
    const interval = setInterval(fetchCourses, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      finance: 'bg-primary/10 text-primary',
      soft_skills: 'bg-blue-100 text-blue-600',
      languages: 'bg-teal-100 text-teal-600',
      business: 'bg-purple-100 text-purple-600',
      communication: 'bg-orange-100 text-orange-600',
    };
    return colors[category] || 'bg-slate-100 text-slate-600';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      finance: 'FINANZAS',
      soft_skills: 'SOFT SKILLS',
      languages: 'IDIOMAS',
      business: 'NEGOCIOS',
      communication: 'COMUNICACION',
    };
    return labels[category] || category?.toUpperCase() || 'GENERAL';
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  // Filtros usando isCompleted del backend
  const inProgressCourses = courses.filter(c => c.isEnrolled && !c.isCompleted);
  const completedCourses = courses.filter(c => c.isCompleted);
  const exploreCourses = courses.filter(c => !c.isEnrolled);

  const getCoursesForTab = () => {
    switch (activeTab) {
      case 'progress': return inProgressCourses;
      case 'completed': return completedCourses;
      case 'explore': return exploreCourses;
      default: return [];
    }
  };

  const filteredCourses = getCoursesForTab();

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden pb-24">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-2 pb-2">
        <div className="flex items-center justify-between h-14 w-full max-w-md mx-auto">
          {/* Left: Avatar */}
          <div className="flex shrink-0 items-center">
            <div className="relative">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 border-2 border-primary"
                style={{
                  backgroundImage: student?.avatarUrl
                    ? `url('${student.avatarUrl}')`
                    : 'none',
                  backgroundColor: !student?.avatarUrl ? '#895af6' : undefined,
                }}
              >
                {!student?.avatarUrl && (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {student?.firstName?.charAt(0) || 'E'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                Lvl 5
              </div>
            </div>
          </div>

          {/* Center: Title */}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Mis Cursos</h1>

          {/* Right: Streak Badge */}
          <div className="flex items-center justify-end">
            <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-600">
              <Icon name="local_fire_department" size={20} filled={true} />
              <span className="text-sm font-bold">{currentStreak}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col">
        {/* Tabs */}
        <div className="px-4 py-4 bg-white">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('progress')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm transition-all text-center',
                activeTab === 'progress'
                  ? 'bg-white shadow-sm text-primary font-bold'
                  : 'text-slate-500 font-medium hover:bg-slate-50'
              )}
            >
              En progreso
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm transition-all text-center',
                activeTab === 'completed'
                  ? 'bg-white shadow-sm text-primary font-bold'
                  : 'text-slate-500 font-medium hover:bg-slate-50'
              )}
            >
              Completados
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm transition-all text-center',
                activeTab === 'explore'
                  ? 'bg-white shadow-sm text-primary font-bold'
                  : 'text-slate-500 font-medium hover:bg-slate-50'
              )}
            >
              Explorar
            </button>
          </div>
        </div>

        {/* Course List */}
        <div className="flex flex-col px-4 gap-4 mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm mt-3">Cargando cursos...</p>
            </div>
          ) : (
            filteredCourses.map((course, index) => (
              <Link
                key={course.id}
                href={`/aprender/${course.id}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <article className="group relative flex flex-col bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform duration-150">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="shrink-0 relative">
                      <div
                        className="bg-center bg-no-repeat bg-cover rounded-xl w-[100px] h-[100px] bg-slate-200"
                        style={{ backgroundImage: course.thumbnail_url ? `url('${course.thumbnail_url}')` : undefined }}
                      >
                        {!course.thumbnail_url && (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-purple-600 rounded-xl">
                            <Icon name="school" size={30} className="text-white opacity-50" />
                          </div>
                        )}
                      </div>
                      {course.isEnrolled && !course.isCompleted && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full p-1 flex items-center justify-center">
                          <Icon name="play_arrow" size={16} className="text-white" />
                        </div>
                      )}
                      {course.isCompleted && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 flex items-center justify-center">
                          <Icon name="check" size={14} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block',
                          getCategoryColor(course.category)
                        )}>
                          {getCategoryLabel(course.category)}
                        </span>
                        <h3 className="text-slate-900 text-base font-bold leading-tight mb-1">
                          {course.title}
                        </h3>
                        <p className="text-slate-500 text-xs font-medium flex items-center gap-1">
                          <Icon name="school" size={14} />
                          {course.chapters_count} Capitulos • {formatDuration(course.total_duration)}
                        </p>
                      </div>

                      {/* Progress Section */}
                      {course.isEnrolled && (
                        <div className="mt-2">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-xs font-bold text-slate-700">{course.progressPercent}%</span>
                            {!course.isCompleted && course.progressPercent > 0 && (
                              <span className="text-[10px] font-semibold text-primary">
                                {getMotivationalMessage(course.id)}
                              </span>
                            )}
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                course.isCompleted
                                  ? 'bg-green-500'
                                  : course.progressPercent > 50
                                    ? 'bg-gradient-to-r from-primary to-purple-400'
                                    : 'bg-primary'
                              )}
                              style={{
                                width: `${course.progressPercent}%`,
                                opacity: course.progressPercent < 50 ? 0.8 : 1,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            ))
          )}

          {!isLoading && filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name={activeTab === 'completed' ? 'emoji_events' : 'search'} size={30} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">
                {activeTab === 'completed'
                  ? 'Aun no has completado ningun curso'
                  : activeTab === 'explore'
                    ? 'No hay cursos nuevos disponibles'
                    : 'No tienes cursos en progreso'}
              </p>
            </div>
          )}

          {/* Suggestion Card */}
          {activeTab === 'progress' && filteredCourses.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  <Icon name="emoji_events" size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">¡Casi subes de nivel!</h4>
                  <p className="text-xs opacity-90">Completa 2 lecciones más hoy.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
