'use client';

import { useUserStore } from '@/stores/user-store';
import { ProgressBar } from '@/components/ui';
import { formatXp, getLevelTitle } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface LevelProgressProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LevelProgress({ variant = 'compact', className }: LevelProgressProps) {
  const { xpTotal, currentLevel, xpToNextLevel, levelProgress } = useUserStore();

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{currentLevel}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-secondary">
              {getLevelTitle(currentLevel)}
            </span>
            <span className="text-xs text-gray-500">{formatXp(xpTotal)} XP</span>
          </div>
          <ProgressBar value={levelProgress} variant="xp" size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-5 tablet:p-6 text-white', className)}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
          <span className="text-3xl font-bold">{currentLevel}</span>
        </div>
        <div>
          <p className="text-white/70 text-sm">Nivel actual</p>
          <p className="text-xl font-bold">{getLevelTitle(currentLevel)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Progreso al siguiente nivel</span>
          <span className="font-semibold">{Math.round(levelProgress)}%</span>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/70">
          <span>{formatXp(xpTotal)} XP</span>
          <span>{formatXp(xpToNextLevel)} XP para nivel {currentLevel + 1}</span>
        </div>
      </div>
    </div>
  );
}
