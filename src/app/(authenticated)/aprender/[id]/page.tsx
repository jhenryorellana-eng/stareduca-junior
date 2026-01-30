'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  xp_reward: number;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  xp_reward: number;
  chapters: Chapter[];
}

interface Exam {
  id: string;
  title: string;
  passing_score: number;
  is_active: boolean;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const { student, token } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real progress data from database
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [examResult, setExamResult] = useState<{
    id: string;
    score: number;
    passed: boolean;
    completed_at: string;
  } | null>(null);

  useEffect(() => {
    async function fetchCourse() {
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        // Fetch chapters (lessons with course_id)
        const { data: chaptersData, error: chaptersError } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index');

        if (chaptersError) throw chaptersError;

        setCourse({
          ...courseData,
          chapters: chaptersData || [],
        });

        // Fetch exam
        const { data: examData } = await supabase
          .from('exams')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .single();

        if (examData) {
          setExam(examData);
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

  // Fetch real progress data using API (no direct Supabase due to RLS)
  useEffect(() => {
    async function fetchProgress() {
      if (!student?.id || !token || !course?.chapters.length) return;

      try {
        const response = await fetch(`/api/progress?courseId=${courseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.lessonProgress) {
            const completed = new Set(
              data.lessonProgress
                .filter((p: { is_completed: boolean }) => p.is_completed)
                .map((p: { lesson_id: string }) => p.lesson_id)
            );
            setCompletedChapters(completed);
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
  }, [student?.id, token, course?.chapters, courseId]);

  // Enrollment is created automatically by /api/progress when saving progress

  // Calculate current chapter index dynamically
  const currentChapterIndex = useMemo(() => {
    if (!course?.chapters.length) return 0;

    // Find first incomplete chapter
    const firstIncompleteIndex = course.chapters.findIndex(
      ch => !completedChapters.has(ch.id)
    );

    // If all completed, return last chapter
    return firstIncompleteIndex === -1 ? course.chapters.length - 1 : firstIncompleteIndex;
  }, [course?.chapters, completedChapters]);

  // Derived states for exam locking
  const allChaptersCompleted = course && course.chapters.length > 0
    ? completedChapters.size >= course.chapters.length
    : false;
  const examTaken = !!examResult;
  const examPassed = examResult?.passed ?? false;

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, string> = {
      finance: 'bg-primary/10 text-primary',
      soft_skills: 'bg-blue-100 text-blue-600',
      languages: 'bg-teal-100 text-teal-600',
      business: 'bg-purple-100 text-purple-600',
      communication: 'bg-orange-100 text-orange-600',
    };
    return styles[category] || 'bg-slate-100 text-slate-600';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      finance: 'FINANZAS',
      soft_skills: 'SOFT SKILLS',
      languages: 'IDIOMAS',
      business: 'NEGOCIOS',
      communication: 'COMUNICACION',
    };
    return labels[category] || category.toUpperCase();
  };

  const totalDuration = course?.chapters.reduce((sum, ch) => sum + (ch.duration_minutes || 0), 0) || 0;
  const progressPercent = course ? Math.round((completedChapters.size / Math.max(course.chapters.length, 1)) * 100) : 0;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
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
          <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
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
              <span className="material-symbols-outlined text-white text-6xl opacity-50">school</span>
            </div>
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Back Button */}
          <button
            onClick={() => router.push('/aprender')}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          {/* Category Badge */}
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-semibold text-white">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
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
            <span className="text-lg font-bold text-slate-900">{course.chapters.length}</span>
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
        {course.chapters.length > 0 && (
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

      {/* Chapters List */}
      <div className="px-5 pb-32">
        {/*<h2 className="text-slate-900 text-lg font-bold mb-4">Capitulos</h2>*/}

        {course.chapters.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">video_library</span>
            </div>
            <p className="text-slate-500">Este curso aun no tiene capitulos</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {course.chapters.map((chapter, index) => {
              const isCompleted = completedChapters.has(chapter.id);
              const isCurrent = index === currentChapterIndex;
              const isLocked = index > currentChapterIndex && !isCompleted;

              // Active chapter with glow effect
              if (isCurrent && !isCompleted) {
                return (
                  <Link
                    key={chapter.id}
                    href={`/aprender/${courseId}/capitulo/${chapter.id}`}
                    className="relative group"
                  >
                    {/* Glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-400 rounded-3xl opacity-30 blur group-hover:opacity-50 transition duration-200" />
                    <div className="relative flex items-center p-4 rounded-3xl border border-primary/20 bg-white shadow-sm">
                      {/* Circle with play */}
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-base font-bold text-slate-900">{chapter.title}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">En Progreso</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Capítulo {index + 1} • {chapter.duration_minutes || 0} min
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              }

              // Completed or locked chapters
              return (
                <Link
                  key={chapter.id}
                  href={isLocked ? '#' : `/aprender/${courseId}/capitulo/${chapter.id}`}
                  className={cn(
                    'flex items-center p-4 rounded-3xl border transition-all',
                    isCompleted && 'bg-white border-slate-100 opacity-60 hover:opacity-100',
                    isLocked && 'bg-slate-50 border-slate-100 opacity-70'
                  )}
                  onClick={(e) => isLocked && e.preventDefault()}
                >
                  {/* Chapter Number */}
                  <div className={cn(
                    'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm',
                    isCompleted && 'bg-green-100 text-green-600',
                    isLocked && 'bg-slate-200 text-slate-400'
                  )}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[24px]">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    )}
                  </div>

                  {/* Chapter Info */}
                  <div className="ml-4 flex-1">
                    <h4 className={cn(
                      'text-sm font-bold',
                      isCompleted && 'text-slate-900 line-through decoration-slate-400',
                      isLocked && 'text-slate-500'
                    )}>
                      {chapter.title}
                    </h4>
                    <p className={cn(
                      'text-xs mt-0.5',
                      isCompleted && 'text-slate-500',
                      isLocked && 'text-slate-400'
                    )}>
                      {isCompleted ? 'Completado' : 'Completa el anterior para desbloquear'}
                    </p>
                  </div>
                </Link>
              );
            })}

            {/* Exam Card - Locked State */}
            {exam && !allChaptersCompleted && (
              <div className="mt-4">
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center opacity-60">
                  <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3">
                    <span className="material-symbols-outlined text-[24px]">lock</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-400">Examen Final</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Completa todos los capítulos para desbloquear el examen.
                  </p>
                </div>
              </div>
            )}

            {/* Exam Card - Unlocked State */}
            {exam && allChaptersCompleted && (
              <div className="mt-4">
                <Link
                  href={`/aprender/${courseId}/examen`}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-center hover:bg-primary/10 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                    <span className="material-symbols-outlined text-[24px]">school</span>
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
      {course.chapters.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-5 py-4 z-20 max-w-md mx-auto">
          {!allChaptersCompleted ? (
            // Chapters incomplete: go to next chapter
            <Link
              href={`/aprender/${courseId}/capitulo/${course.chapters[currentChapterIndex]?.id || course.chapters[0]?.id}`}
              className="w-full h-14 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
              {completedChapters.size === 0 ? 'Comenzar Curso' : 'Continuar'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          ) : exam ? (
            // All chapters complete + has exam
            <Link
              href={`/aprender/${courseId}/examen`}
              className="w-full h-14 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
              {examTaken ? 'Reiniciar examen' : 'Ir al examen'}
              <span className="material-symbols-outlined">
                {examTaken ? 'refresh' : 'school'}
              </span>
            </Link>
          ) : (
            // All chapters complete but no exam
            <div className="w-full h-14 rounded-xl bg-green-500 text-white font-bold text-base flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
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
