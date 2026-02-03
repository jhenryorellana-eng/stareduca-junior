'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUserStore } from '@/stores/user-store';
import { Icon } from '@/components/ui/Icon';

interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'image' | 'video' | 'audio' | 'url';
  file_path: string | null;
  external_url: string | null;
}

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  xp_reward: number;
  order_index: number;
  module_id: string;
  course_id: string;
}

interface Course {
  id: string;
  title: string;
  xp_reward: number;
}

export default function ChapterPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const chapterId = params.capituloId as string;

  const { student, token } = useAuthStore();
  const { showXpGain } = useUserStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentChapterIndex = allChapters.findIndex(ch => ch.id === chapterId);
  const prevChapter = currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < allChapters.length - 1 ? allChapters[currentChapterIndex + 1] : null;

  // Número de módulo y capítulo dentro de su módulo (no global)
  const moduleNumber = chapter
    ? Array.from(new Set(allChapters.map(ch => ch.module_id))).indexOf(chapter.module_id) + 1
    : 1;
  const chapterNumberInModule = chapter
    ? allChapters
        .filter(ch => ch.module_id === chapter.module_id)
        .findIndex(ch => ch.id === chapterId) + 1
    : currentChapterIndex + 1;

  // Get user's timezone for streak calculation
  const userTimezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'America/Lima';

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch chapter
        const { data: chapterData, error: chapterError } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', chapterId)
          .single();

        if (chapterError) throw chapterError;
        setChapter(chapterData);

        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, xp_reward')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch all chapters for navigation (lessons are linked through modules)
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId)
          .order('order_index');

        const moduleIds = (modulesData as { id: string }[] | null)?.map((m) => m.id) || [];

        let chaptersData: any[] = [];
        let chaptersError: any = null;

        if (moduleIds.length > 0) {
          const result = await supabase
            .from('lessons')
            .select('*')
            .in('module_id', moduleIds)
            .order('order_index');
          chaptersData = result.data || [];
          chaptersError = result.error;
        }

        if (chaptersError) throw chaptersError;

        // Ordenar lecciones: primero por orden del módulo, luego por order_index
        const moduleOrderMap = new Map(
          (modulesData || []).map((m: any, i: number) => [m.id, i])
        );
        chaptersData.sort((a: any, b: any) => {
          const moduleOrderA = moduleOrderMap.get(a.module_id) ?? 0;
          const moduleOrderB = moduleOrderMap.get(b.module_id) ?? 0;
          if (moduleOrderA !== moduleOrderB) return moduleOrderA - moduleOrderB;
          return a.order_index - b.order_index;
        });

        setAllChapters(chaptersData || []);

        // Fetch materials
        const { data: materialsData } = await supabase
          .from('lesson_materials')
          .select('*')
          .eq('lesson_id', chapterId)
          .order('order_index');

        setMaterials(materialsData || []);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'No se pudo cargar el capitulo');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [courseId, chapterId]);

  // Cargar estado de completitud usando el API (no usa Supabase directo por RLS)
  useEffect(() => {
    async function loadCompletionStatus() {
      if (!student?.id || !token) return;

      try {
        const response = await fetch(`/api/progress?courseId=${courseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const lessonProgress = data.lessonProgress?.find(
            (p: { lesson_id: string; is_completed: boolean; watch_time_seconds: number }) => p.lesson_id === chapterId
          );

          if (lessonProgress?.is_completed) {
            setIsCompleted(true);
            setProgress(100);
          } else if (lessonProgress?.watch_time_seconds > 0 && duration > 0) {
            const savedProgress = (lessonProgress.watch_time_seconds / duration) * 100;
            setProgress(Math.min(savedProgress, 100));
            if (videoRef.current) {
              videoRef.current.currentTime = lessonProgress.watch_time_seconds;
            }
          }
        }
      } catch (err) {
        console.error('Error loading progress:', err);
      }
    }

    loadCompletionStatus();
  }, [student?.id, token, courseId, chapterId, duration]);

  // Save progress function
  const saveProgress = useCallback(async (watchTime: number, completed: boolean = false) => {
    if (!student?.id || !token || (!completed && isSaving)) return;

    // Debounce - only save if 5+ seconds since last save (unless completing)
    const now = Date.now();
    if (!completed && now - lastSaveTimeRef.current < 5000) return;
    lastSaveTimeRef.current = now;

    setIsSaving(true);
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          lessonId: chapterId,
          courseId,
          watchTimeSeconds: Math.floor(watchTime),
          isCompleted: completed,
        }),
      });

      const data = await response.json();

      // Award XP for starting a new course (first time enrollment)
      if (data.isNewEnrollment) {
        try {
          const startXpResponse = await fetch('/api/gamification', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'x-timezone': userTimezone,
            },
            body: JSON.stringify({
              amount: 10,
              reason: 'course_start',
              referenceId: courseId,
            }),
          });

          if (startXpResponse.ok) {
            showXpGain(10, 'course_start');
          }
        } catch (xpError) {
          console.error('Error awarding course start XP:', xpError);
        }
      }

      if (completed && data.isNewCompletion && chapter) {
        // Award XP via API for lesson completion
        const lessonXpDelay = data.isNewEnrollment ? 3500 : 0;
        if (chapter.xp_reward > 0) {
          try {
            const xpResponse = await fetch('/api/gamification', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-timezone': userTimezone,
              },
              body: JSON.stringify({
                amount: chapter.xp_reward,
                reason: 'lesson_complete',
                referenceId: chapter.id,
              }),
            });

            if (xpResponse.ok) {
              // Delay slightly so course_start toast shows first if applicable
              setTimeout(() => {
                showXpGain(chapter.xp_reward, 'lesson_complete');
              }, lessonXpDelay);
            }
          } catch (xpError) {
            console.error('Error awarding XP:', xpError);
          }
        }

        // Check if this is the last chapter - award course completion XP
        const isLastChapter = currentChapterIndex === allChapters.length - 1;
        if (isLastChapter && course?.xp_reward && course.xp_reward > 0) {
          // Delay course XP to show after lesson XP toast
          const courseXpDelay = lessonXpDelay + (chapter.xp_reward > 0 ? 3500 : 0);
          setTimeout(async () => {
            try {
              const courseXpResponse = await fetch('/api/gamification', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'x-timezone': userTimezone,
                },
                body: JSON.stringify({
                  amount: course.xp_reward,
                  reason: 'course_complete',
                  referenceId: courseId,
                }),
              });

              if (courseXpResponse.ok) {
                showXpGain(course.xp_reward, 'course_complete');
              }
            } catch (err) {
              console.error('Error awarding course XP:', err);
            }
          }, courseXpDelay);
        }

        setIsCompleted(true);
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    } finally {
      setIsSaving(false);
    }
  }, [student?.id, token, chapterId, courseId, chapter, course, allChapters, currentChapterIndex, showXpGain, isSaving, userTimezone]);

  // Auto-save progress periodically while playing
  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    const interval = setInterval(() => {
      if (videoRef.current && !isCompleted) {
        saveProgress(videoRef.current.currentTime, false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, saveProgress]);

  // Handle video ended - mark as completed
  const handleVideoEnded = async () => {
    if (!isCompleted && duration > 0) {
      await saveProgress(duration, true);
    }
  };

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Solo actualizar progreso si NO está completado
      if (!isCompleted) {
        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        try {
          await videoRef.current.play();
        } catch (error) {
          console.error('Error al reproducir video:', error);
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            setVideoError('Toca el video para reproducir');
          }
        }
      }
    }
  };

  // Cerrar slider de volumen al tocar fuera
  useEffect(() => {
    if (!showVolumeSlider) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [showVolumeSlider]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf': return 'picture_as_pdf';
      case 'video': return 'smart_display';
      case 'audio': return 'headphones';
      case 'image': return 'image';
      case 'url': return 'link';
      default: return 'description';
    }
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-50 text-red-500';
      case 'video': return 'bg-blue-50 text-blue-500';
      case 'audio': return 'bg-purple-50 text-purple-500';
      case 'image': return 'bg-emerald-50 text-emerald-500';
      case 'url': return 'bg-orange-50 text-orange-500';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getMaterialLabel = (type: string) => {
    switch (type) {
      case 'pdf': return 'Documento PDF';
      case 'video': return 'Video Extra';
      case 'audio': return 'Audio';
      case 'image': return 'Imagen';
      case 'url': return 'Enlace Web';
      default: return 'Material';
    }
  };

  // Track viewed materials to avoid duplicate XP
  const [viewedMaterials, setViewedMaterials] = useState<Set<string>>(new Set());

  const handleMaterialClick = async (material: Material) => {
    // Open material in new tab
    const url = material.file_path || material.external_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Award XP only once per material per session
    if (!viewedMaterials.has(material.id) && token) {
      setViewedMaterials(prev => new Set(prev).add(material.id));

      try {
        const xpResponse = await fetch('/api/gamification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-timezone': userTimezone,
          },
          body: JSON.stringify({
            amount: 5,
            reason: 'material_view',
            referenceId: material.id,
          }),
        });

        if (xpResponse.ok) {
          showXpGain(5, 'material_view');
        }
      } catch (err) {
        console.error('Error awarding material XP:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Cargando capitulo...</p>
        </div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Icon name="error" size={30} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
        <p className="text-slate-500 text-center mb-6">{error || 'Capitulo no encontrado'}</p>
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
      {/* Dark Header Area with Video */}
      <div className="bg-slate-900 pb-2 relative z-10 rounded-b-xl">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <button
            onClick={() => router.push(`/aprender/${courseId}`)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <Icon name="arrow_back" size={24} />
          </button>
          <div className="text-white text-sm font-bold tracking-wide uppercase opacity-80">
            Módulo {moduleNumber} - Capítulo {chapterNumberInModule}
          </div>
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center">
            <Icon name="more_vert" size={24} />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black group mt-2 shadow-lg">
          {chapter.video_url ? (
            <>
              <video
                ref={videoRef}
                src={chapter.video_url}
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
                preload="metadata"
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={() => {
                  setIsVideoLoading(false);
                  setVideoError(null);
                }}
                onPlay={() => {
                  console.log('[VIDEO] Play event fired');
                  setIsPlaying(true);
                  setVideoError(null);
                }}
                onPause={() => {
                  console.log('[VIDEO] Pause event fired');
                  setIsPlaying(false);
                }}
                onEnded={handleVideoEnded}
                onError={(e) => {
                  const error = e.currentTarget.error;
                  console.log('[VIDEO] Error event:', error);
                  setIsVideoLoading(false);
                  if (error?.code === MediaError.MEDIA_ERR_NETWORK) {
                    setVideoError('Error de red. Verifica tu conexión.');
                  } else if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                    setVideoError('Formato de video no soportado.');
                  } else {
                    setVideoError('Error al cargar el video.');
                  }
                }}
              />
              {/* Video Loading Indicator */}
              {isVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* Video Error Message */}
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <Icon name="error" size={40} className="text-red-400" />
                    <p className="text-white font-medium">{videoError}</p>
                    <button
                      onClick={() => {
                        setVideoError(null);
                        setIsVideoLoading(true);
                        videoRef.current?.load();
                      }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}
              {/* Completed Badge */}
              {isCompleted && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                  <Icon name="check_circle" size={18} />
                  Completado
                </div>
              )}
              {/* Dark Overlay when paused */}
              {!isPlaying && !isVideoLoading && !videoError && (
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              )}
              {/* Center Play/Pause Button - clickable area covers video */}
              <button
                onClick={togglePlay}
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-opacity',
                  isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                )}
              >
                <div className="w-16 h-16 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
                  <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={32} filled={true} />
                </div>
              </button>
              {/* Floating Play/Pause Button - always accessible on hover */}
              {!isVideoLoading && !videoError && (
                <button
                  onClick={togglePlay}
                  className="absolute bottom-16 left-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={24} />
                </button>
              )}
              {/* Video Controls */}
              <div className="absolute inset-x-0 bottom-0 px-4 py-3">
                {/* Progress Bar */}
                <div
                  className="h-6 flex items-center cursor-pointer"
                  onClick={handleSeek}
                >
                  <div className="h-1 w-full rounded-full bg-white/30 backdrop-blur-sm overflow-hidden">
                    <div
                      className="h-full bg-primary relative"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Scrubber Handle */}
                  <div
                    className="absolute w-3 h-3 rounded-full bg-white shadow-md -translate-x-1/2"
                    style={{ left: `${progress}%` }}
                  />
                </div>
                {/* Time */}
                <div className="flex items-center justify-between -mt-1">
                  <p className="text-white text-xs font-medium tracking-wide font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Volume Control */}
                    <div ref={volumeRef} className="relative flex items-center">
                      <button
                        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                        className="text-white/80 hover:text-white"
                      >
                        <Icon
                          name={isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                          size={20}
                        />
                      </button>
                      {showVolumeSlider && (
                        <div className="absolute bottom-8 right-0 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                          <button onClick={toggleMute} className="text-white/80 hover:text-white shrink-0">
                            <Icon
                              name={isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                              size={18}
                            />
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-24 h-1.5 accent-primary appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                          />
                        </div>
                      )}
                    </div>
                    <button className="text-white/80 hover:text-white">
                      <Icon name="fullscreen" size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
              <Icon name="play_circle" size={60} className="text-white/30 mb-2" />
              <p className="text-white/50 text-sm">Video no disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Lesson Header */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-slate-900 text-2xl font-bold leading-tight">{chapter.title}</h1>
            <button className="text-primary shrink-0 mt-1">
              <Icon name="bookmark" size={24} />
            </button>
          </div>
          {chapter.description && (
            <p className="text-slate-500 text-sm font-medium leading-relaxed mt-2">
              {chapter.description}
            </p>
          )}
        </div>

        {/* Progress Card */}
        <div className="px-5 py-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-800 text-sm font-bold">Progreso del capitulo</span>
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                <Icon name="bolt" size={14} />
                +{chapter.xp_reward} XP
              </div>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs font-medium mt-2 text-right">
              {Math.round(progress)}% Completado
            </p>
          </div>
        </div>

        {/* Materials Section */}
        {materials.length > 0 && (
          <div className="px-5 mt-2">
            <h3 className="text-slate-900 text-lg font-bold mb-3">Materiales de este capitulo</h3>
            <div className="flex flex-col gap-3">
              {materials.map((material) => (
                <button
                  key={material.id}
                  onClick={() => handleMaterialClick(material)}
                  className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 hover:border-primary/30 transition-all group active:scale-[0.98] w-full text-left"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    getMaterialColor(material.type)
                  )}>
                    <Icon name={getMaterialIcon(material.type)} size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-slate-900 font-semibold text-sm">{material.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-400 text-xs">{getMaterialLabel(material.type)}</p>
                      {!viewedMaterials.has(material.id) && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">+5 XP</span>
                      )}
                    </div>
                  </div>
                  <Icon name="chevron_right" size={24} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-5 py-4 z-20 max-w-md mx-auto">
        <div className="flex items-center gap-4">
          {prevChapter ? (
            <Link
              href={`/aprender/${courseId}/capitulo/${prevChapter.id}`}
              className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <Icon name="arrow_back" size={20} />
              Anterior
            </Link>
          ) : (
            <Link
              href={`/aprender/${courseId}`}
              className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <Icon name="arrow_back" size={20} />
              Volver
            </Link>
          )}
          {nextChapter ? (
            isCompleted ? (
              <Link
                href={`/aprender/${courseId}/capitulo/${nextChapter.id}`}
                className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
              >
                Siguiente
                <Icon name="chevron_right" size={20} />
              </Link>
            ) : (
              <button
                disabled
                className="flex-[2] h-12 rounded-xl bg-primary/40 text-white/60 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              >
                Siguiente
                <Icon name="lock" size={18} />
              </button>
            )
          ) : (
            isCompleted ? (
              <Link
                href={`/aprender/${courseId}`}
                className="flex-[2] h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 transition-all active:scale-95"
              >
                Completar Curso
                <Icon name="check" size={20} />
              </Link>
            ) : (
              <button
                disabled
                className="flex-[2] h-12 rounded-xl bg-green-500/40 text-white/60 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              >
                Completar Curso
                <Icon name="lock" size={18} />
              </button>
            )
          )}
        </div>
        {/* iOS Home Indicator Space */}
        <div className="h-1 w-1/3 bg-slate-200 mx-auto rounded-full mt-3" />
      </div>
    </div>
  );
}
