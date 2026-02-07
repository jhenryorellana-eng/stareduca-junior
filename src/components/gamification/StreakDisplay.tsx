'use client';

import { useUserStore } from '@/stores/user-store';
import { getStreakEmoji } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  variant?: 'compact' | 'card';
  className?: string;
}

export function StreakDisplay({ variant = 'compact', className }: StreakDisplayProps) {
  const { currentStreak, maxStreak } = useUserStore();
  const emoji = getStreakEmoji(currentStreak);

  const multiplier = currentStreak >= 30 ? 2.0 : currentStreak >= 7 ? 1.5 : 1.0;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
          currentStreak > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500',
          className
        )}
      >
        <span className="text-base">{emoji}</span>
        <span className="font-semibold">{currentStreak}</span>
        <span className="text-sm">días</span>
      </div>
    );
  }

  return (
    <div className={cn('bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl p-5 tablet:p-6 text-white', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/70 text-sm">Racha actual</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{emoji}</span>
            <span className="text-4xl font-bold">{currentStreak}</span>
            <span className="text-lg">días</span>
          </div>
        </div>
        {multiplier > 1 && (
          <div className="bg-white/20 rounded-2xl px-3 py-2 text-center">
            <p className="text-xs text-white/70">Multiplicador</p>
            <p className="text-xl font-bold">x{multiplier}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 rounded-full',
              i < currentStreak % 7 || (currentStreak >= 7 && i < 7)
                ? 'bg-white'
                : 'bg-white/30'
            )}
          />
        ))}
      </div>

      <div className="flex justify-between mt-3 text-sm">
        <span className="text-white/70">Mejor racha: {maxStreak} días</span>
        {currentStreak < 7 && (
          <span className="text-white/90">
            {7 - (currentStreak % 7)} días para x1.5
          </span>
        )}
        {currentStreak >= 7 && currentStreak < 30 && (
          <span className="text-white/90">
            {30 - currentStreak} días para x2.0
          </span>
        )}
      </div>
    </div>
  );
}
