'use client';

import { useEffect, useRef } from 'react';
import { useUserStore } from '@/stores/user-store';

const XP_REASON_LABELS: Record<string, string> = {
  lesson_complete: 'Capítulo completado',
  course_complete: 'Curso completado',
  course_start: '¡Nuevo curso!',
  material_view: 'Material revisado',
  exam_passed: 'Examen aprobado',
  exam_good: '¡Buen examen!',
  exam_great: '¡Excelente examen!',
  exam_perfect: '¡Examen perfecto!',
  daily_login: 'Login diario',
  post_created: 'Post creado',
  streak_bonus: 'Bonus de racha',
};

function playXpSound(reason: string) {
  try {
    // Use special sound for perfect exam score
    const soundFile = reason === 'exam_perfect'
      ? '/sounds/exam-success.mp3'
      : '/sounds/xp-gain.mp3';

    const audio = new Audio(soundFile);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore autoplay errors (browser policy)
    });
  } catch {
    // Audio not supported or file not found
  }
}

export function XpToast() {
  const { showXpToast, xpToastAmount, xpToastReason, hideXpToast } = useUserStore();
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (showXpToast) {
      // Play sound only once per toast
      if (!hasPlayedSound.current) {
        playXpSound(xpToastReason);
        hasPlayedSound.current = true;
      }

      const timer = setTimeout(() => {
        hideXpToast();
        hasPlayedSound.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      hasPlayedSound.current = false;
    }
  }, [showXpToast, xpToastReason, hideXpToast]);

  if (!showXpToast) return null;

  const reasonLabel = XP_REASON_LABELS[xpToastReason] || xpToastReason;

  return (
    <>
      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes xp-float-up {
          0% {
            opacity: 0;
            transform: translate(-50%, 20px) scale(0.8);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.05);
          }
          30% {
            transform: translate(-50%, -5px) scale(1);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -10px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -40px) scale(0.9);
          }
        }

        @keyframes xp-particles {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.5);
          }
        }

        .animate-xp-float {
          animation: xp-float-up 3s ease-out forwards;
        }

        .animate-xp-particle {
          animation: xp-particles 1s ease-out forwards;
        }
      `}</style>

      {/* Main XP Toast */}
      <div className="fixed top-20 left-1/2 z-50 animate-xp-float">
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <div>
            <p className="font-bold text-xl">+{xpToastAmount} XP</p>
            <p className="text-sm text-white/90">{reasonLabel}</p>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-amber-400 rounded-full animate-xp-particle"
            style={{
              left: `${(i - 3) * 15}px`,
              animationDelay: `${i * 0.1}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </>
  );
}
