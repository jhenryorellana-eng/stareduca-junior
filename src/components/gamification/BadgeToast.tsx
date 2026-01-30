'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/stores/user-store';
import { cn } from '@/lib/utils';

export function BadgeToast() {
  const { showBadgeToast, badgeToastData, hideBadgeToast } = useUserStore();

  useEffect(() => {
    if (showBadgeToast) {
      // Play sound
      const audio = new Audio('/sounds/exam-success.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        hideBadgeToast();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [showBadgeToast, hideBadgeToast]);

  if (!showBadgeToast || !badgeToastData) return null;

  // Parse hex colors from format "#hex1|#hex2"
  const [colorFrom, colorTo] = (badgeToastData.color || '#fcd34d|#f59e0b').split('|');

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 badge-backdrop-animation" />

      {/* Badge Card */}
      <div className="badge-toast-animation bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5 border-4 border-primary relative z-10 mx-4">
        {/* Sparkles */}
        <div className="absolute -top-2 -left-2 w-4 h-4 badge-sparkle" style={{ animationDelay: '0.2s' }}>
          <span style={{ color: colorFrom }} className="text-xl">✦</span>
        </div>
        <div className="absolute -top-2 -right-2 w-4 h-4 badge-sparkle" style={{ animationDelay: '0.4s' }}>
          <span style={{ color: colorFrom }} className="text-xl">✦</span>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 badge-sparkle" style={{ animationDelay: '0.6s' }}>
          <span style={{ color: colorFrom }} className="text-xl">✦</span>
        </div>

        {/* Badge Icon */}
        <div
          className="w-28 h-28 rounded-full p-1 badge-glow badge-icon-animation"
          style={{ background: `linear-gradient(to bottom right, ${colorFrom}, ${colorTo})` }}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl" style={{ color: colorTo }}>
              {badgeToastData.icon}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-primary font-bold text-sm uppercase tracking-widest mb-1">
            ¡Nueva Insignia!
          </p>
          <h3 className="text-slate-900 font-bold text-2xl">
            {badgeToastData.name}
          </h3>
        </div>
      </div>

      <style jsx>{`
        @keyframes badge-toast {
          0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
          50% { opacity: 1; transform: scale(1.1) rotate(3deg); }
          70% { transform: scale(0.95) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes badge-backdrop {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes badge-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes badge-sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .badge-toast-animation {
          animation: badge-toast 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .badge-backdrop-animation {
          animation: badge-backdrop 0.3s ease-out forwards;
        }

        .badge-icon-animation {
          animation: badge-icon-pulse 1.5s ease-in-out infinite;
          animation-delay: 0.8s;
        }

        .badge-sparkle {
          animation: badge-sparkle 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
