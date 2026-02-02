'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Icon } from '@/components/ui/Icon';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  xp_reward: number;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  xp_reward: number;
}

interface Exam {
  id: string;
  title: string;
  passing_score: number;
  is_active: boolean;
}

// Raw module data from Supabase (before sorting lessons)
interface RawModule {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[] | null;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const { student, token } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for expanded modules
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Real progress data from database
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [examResult, setExamResult] = useState<{
    id: string;
    score: number;
    passed: boolean;
    completed_at: string;
  } | null>(null);

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  useEffect(() => {
    async function fetchCourse() {
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, description, thumbnail_url, category, xp_reward')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;
        if (!courseData) throw new Error('Course not found');

        setCourse(courseData as Course);

        // Fetch modules with lessons
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select(`
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              description,
              video_url,
              duration_minutes,
              xp_reward,
              order_index
            )
          `)
          .eq('course_id', courseId)
          .order('order_index');

        if (modulesError) throw modulesError;

        // Sort lessons within each module by order_index
        const rawModules = (modulesData || []) as RawModule[];
        const sortedModules: Module[] = rawModules.map(mod => ({
          id: mod.id,
          title: mod.title,
          order_index: mod.order_index,
          lessons: (mod.lessons || []).sort((a, b) => a.order_index - b.order_index)
        }));

        setModules(sortedModules);

        // Expand first module by default
        if (sortedModules.length > 0) {
          setExpandedModules(new Set([sortedModules[0].id]));
        }

        // Fetch exam
        const { data: examData } = await supabase
          .from('exams')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .single();

        if (examData) {
          setExam(examData as Exam);
        }
      } catch (err: any) {
        console.error('Error fetching course:', err);
        setError(err.message || 'No se pudo cargar el curso');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourse();
  }, [courseId]);

  // Get all lessons flat for progress calculation
  const allLessons = useMemo(() => {
    return modules.flatMap(m => m.lessons);
  }, [modules]);

  // Fetch real progress data using API (no direct Supabase due to RLS)
  useEffect(() => {
    async function fetchProgress() {
      if (!student?.id || !token || allLessons.length === 0) return;

      try {
        const response = await fetch(`/api/progress?courseId=${courseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.lessonProgress) {
            const completedIds: string[] = data.lessonProgress
              .filter((p: { is_completed: boolean }) => p.is_completed)
              .map((p: { lesson_id: string }) => p.lesson_id);
            setCompletedLessons(new Set(completedIds));
          }
          if (data.examResult) {
            setExamResult(data.examResult);
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setProgressLoaded(true);
      }
    }

    fetchProgress();
  }, [student?.id, token, allLessons, courseId]);

  // Calculate which modules are unlocked (sequential strict)
  const unlockedModuleCount = useMemo(() => {
    let count = 1; // First module always unlocked

    for (let i = 0; i < modules.length - 1; i++) {
      const mod = modules[i];
      const allLessonsCompleted = mod.lessons.every(l => completedLessons.has(l.id));
      if (allLessonsCompleted) {
        count = i + 2; // Unlock next module
      } else {
        break;
      }
    }

    return count;
  }, [modules, completedLessons]);

  // Find current lesson (first incomplete)
  const currentLessonInfo = useMemo(() => {
    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
      const mod = modules[moduleIndex];
      for (let lessonIndex = 0; lessonIndex < mod.lessons.length; lessonIndex++) {
        const lesson = mod.lessons[lessonIndex];
        if (!completedLessons.has(lesson.id)) {
          return { moduleIndex, lessonIndex, lesson };
        }
      }
    }
    // All completed - return last lesson
    if (modules.length > 0) {
      const lastModule = modules[modules.length - 1];
      if (lastModule.lessons.length > 0) {
        return {
          moduleIndex: modules.length - 1,
          lessonIndex: lastModule.lessons.length - 1,
          lesson: lastModule.lessons[lastModule.lessons.length - 1]
        };
      }
    }
    return null;
  }, [modules, completedLessons]);

  // Derived states
  const allLessonsCompleted = allLessons.length > 0 && completedLessons.size >= allLessons.length;
  const examTaken = !!examResult;
  const examPassed = examResult?.passed ?? false;

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      finanzas: 'FINANZAS',
      emprendimiento: 'EMPRENDIMIENTO',
      liderazgo: 'LIDERAZGO',
      tecnologia: 'TECNOLOGÍA',
      creatividad: 'CREATIVIDAD',
      comunicacion: 'COMUNICACIÓN',
    };
    return labels[category] || category.toUpperCase();
  };

  const totalDuration = allLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  const totalLessons = allLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  };

  // Check if a lesson is unlocked within its module
  const isLessonUnlocked = (moduleIndex: number, lessonIndex: number) => {
    // Module must be unlocked first
    if (moduleIndex >= unlockedModuleCount) return false;

    const mod = modules[moduleIndex];
    // First lesson always unlocked if module is unlocked
    if (lessonIndex === 0) return true;

    // Previous lesson must be completed
    const prevLesson = mod.lessons[lessonIndex - 1];
    return completedLessons.has(prevLesson.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Icon name="error" size={30} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
        <p className="text-slate-500 text-center mb-6">{error || 'Curso no encontrado'}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col max-w-md mx-auto">
      {/* Hero Section with Course Image */}
      <div className="px-4 pt-2 pb-4">
        <div
          className="w-full h-56 rounded-2xl bg-cover bg-center shadow-lg relative overflow-hidden"
          style={{
            backgroundImage: course.thumbnail_url ? `url('${course.thumbnail_url}')` : undefined,
          }}
        >
          {!course.thumbnail_url && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-purple-600">
              <Icon name="school" size={60} className="text-white opacity-50" />
            </div>
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Back Button */}
          <button
            onClick={() => router.push('/aprender')}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/40 transition-colors"
          >
            <Icon name="arrow_back" size={24} />
          </button>

          {/* Category Badge */}
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-semibold text-white">
              <Icon name="trending_up" size={14} />
              {getCategoryLabel(course.category)}
            </span>
          </div>
        </div>
      </div>

      {/* Title & Stats */}
      <div className="px-5">
        <h1 className="text-3xl font-bold leading-tight mb-2 text-slate-900">{course.title}</h1>
        {course.description && (
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{course.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100">
            <span className="text-lg font-bold text-slate-900">{totalLessons}</span>
            <span className="text-xs text-slate-500">Capítulos</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100">
            <span className="text-lg font-bold text-slate-900">{formatDuration(totalDuration)}</span>
            <span className="text-xs text-slate-500">Duración</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-lg font-bold text-primary">+{course.xp_reward}</span>
            <span className="text-xs text-primary/80 font-medium">XP Reward</span>
          </div>
        </div>

        {/* Progress Section */}
        {totalLessons > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-lg font-bold text-slate-900">Tu Progreso</h3>
              <span className="text-sm font-bold text-primary">{progressPercent}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  boxShadow: progressPercent > 0 ? '0 0 10px rgba(137, 90, 246, 0.5)' : 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modules List */}
      <div className="px-5 pb-32">
        {modules.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="play_circle" size={30} className="text-slate-400" />
            </div>
            <p className="text-slate-500">Este curso aún no tiene contenido</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {modules.map((module, moduleIndex) => {
              const isModuleUnlocked = moduleIndex < unlockedModuleCount;
              const isExpanded = expandedModules.has(module.id);
              const completedInModule = module.lessons.filter(l => completedLessons.has(l.id)).length;
              const isModuleCompleted = completedInModule === module.lessons.length;

              return (
                <div key={module.id} className="overflow-hidden">
                  {/* Module Header */}
                  <button
                    onClick={() => isModuleUnlocked && toggleModule(module.id)}
                    disabled={!isModuleUnlocked}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-2xl transition-all',
                      isModuleUnlocked
                        ? 'bg-slate-100 hover:bg-slate-200 cursor-pointer'
                        : 'bg-slate-50 cursor-not-allowed opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-11 h-11 rounded-full flex items-center justify-center font-bold text-base',
                        isModuleCompleted && 'bg-green-100 text-green-600',
                        isModuleUnlocked && !isModuleCompleted && 'bg-primary/20 text-primary',
                        !isModuleUnlocked && 'bg-slate-200 text-slate-400'
                      )}>
                        {isModuleCompleted ? (
                          <Icon name="check" size={22} />
                        ) : isModuleUnlocked ? (
                          moduleIndex + 1
                        ) : (
                          <Icon name="lock" size={18} />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className={cn(
                          'font-bold',
                          isModuleUnlocked ? 'text-slate-900' : 'text-slate-400'
                        )}>
                          Módulo {moduleIndex + 1}
                        </h3>
                        <p className={cn(
                          'text-xs',
                          isModuleUnlocked ? 'text-slate-500' : 'text-slate-400'
                        )}>
                          {completedInModule}/{module.lessons.length} capítulos
                        </p>
                      </div>
                    </div>
                    {isModuleUnlocked && (
                      <Icon
                        name={isExpanded ? 'expand_less' : 'expand_more'}
                        size={24}
                        className="text-slate-400"
                      />
                    )}
                  </button>

                  {/* Lessons - Collapsible */}
                  {isExpanded && isModuleUnlocked && (
                    <div className="mt-2 ml-3 pl-4 border-l-2 border-slate-200 flex flex-col gap-2">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isCompleted = completedLessons.has(lesson.id);
                        const isUnlocked = isLessonUnlocked(moduleIndex, lessonIndex);
                        const isCurrent = currentLessonInfo?.lesson.id === lesson.id;

                        // Current lesson with highlight
                        if (isCurrent && !isCompleted) {
                          return (
                            <Link
                              key={lesson.id}
                              href={`/aprender/${courseId}/capitulo/${lesson.id}`}
                              className="relative group"
                            >
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-400 rounded-2xl opacity-30 blur group-hover:opacity-50 transition duration-200" />
                              <div className="relative flex items-center p-3 rounded-2xl border border-primary/20 bg-white">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30">
                                  <Icon name="play_arrow" size={20} filled={true} />
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{lesson.title}</h4>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                                      Continuar
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {lesson.duration_minutes || 0} min
                                  </p>
                                </div>
                              </div>
                            </Link>
                          );
                        }

                        // Completed or locked lessons
                        return (
                          <Link
                            key={lesson.id}
                            href={isUnlocked ? `/aprender/${courseId}/capitulo/${lesson.id}` : '#'}
                            onClick={(e) => !isUnlocked && e.preventDefault()}
                            className={cn(
                              'flex items-center p-3 rounded-2xl border transition-all',
                              isCompleted && 'bg-white border-slate-100 hover:border-slate-200',
                              !isUnlocked && 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                            )}
                          >
                            <div className={cn(
                              'flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center',
                              isCompleted && 'bg-green-100 text-green-600',
                              !isUnlocked && 'bg-slate-200 text-slate-400'
                            )}>
                              {isCompleted ? (
                                <Icon name="check" size={20} />
                              ) : (
                                <Icon name="lock" size={16} />
                              )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <h4 className={cn(
                                'text-sm font-semibold truncate',
                                isCompleted && 'text-slate-700',
                                !isUnlocked && 'text-slate-400'
                              )}>
                                {lesson.title}
                              </h4>
                              <p className={cn(
                                'text-xs mt-0.5',
                                isCompleted && 'text-slate-400',
                                !isUnlocked && 'text-slate-300'
                              )}>
                                {isCompleted ? 'Completado' : `${lesson.duration_minutes || 0} min`}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Exam Card - Locked State */}
            {exam && !allLessonsCompleted && (
              <div className="mt-4">
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center opacity-60">
                  <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3">
                    <Icon name="lock" size={24} />
                  </div>
                  <h4 className="text-base font-bold text-slate-400">Examen Final</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Completa todos los capítulos para desbloquear el examen.
                  </p>
                </div>
              </div>
            )}

            {/* Exam Card - Unlocked State */}
            {exam && allLessonsCompleted && (
              <div className="mt-4">
                <Link
                  href={`/aprender/${courseId}/examen`}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-center hover:bg-primary/10 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                    <Icon name="school" size={24} />
                  </div>
                  <h4 className="text-base font-bold text-primary">Examen Final</h4>
                  <p className="text-xs text-primary/70 mt-1 max-w-[200px]">
                    {examTaken
                      ? `Puntaje anterior: ${examResult?.score || 0} - ${examPassed ? 'Aprobado' : 'Reprobado'}`
                      : 'Demuestra lo que aprendiste para ganar tu certificado.'
                    }
                  </p>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom CTA */}
      {totalLessons > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-5 py-4 z-20 max-w-md mx-auto">
          {!allLessonsCompleted && currentLessonInfo ? (
            <Link
              href={`/aprender/${courseId}/capitulo/${currentLessonInfo.lesson.id}`}
              className="w-full h-14 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
              {completedLessons.size === 0 ? 'Comenzar Curso' : 'Continuar'}
              <Icon name="chevron_right" size={24} />
            </Link>
          ) : exam ? (
            <Link
              href={`/aprender/${courseId}/examen`}
              className="w-full h-14 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
              {examTaken ? 'Reiniciar examen' : 'Ir al examen'}
              <Icon name={examTaken ? 'refresh' : 'school'} size={24} />
            </Link>
          ) : (
            <div className="w-full h-14 rounded-xl bg-green-500 text-white font-bold text-base flex items-center justify-center gap-2">
              <Icon name="check_circle" size={24} />
              Curso Completado
            </div>
          )}
          {/* iOS Home Indicator Space */}
          <div className="h-1 w-1/3 bg-slate-200 mx-auto rounded-full mt-3" />
        </div>
      )}
    </div>
  );
}
