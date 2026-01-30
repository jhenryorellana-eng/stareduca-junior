'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'primary' | 'xp' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = 'primary',
      size = 'md',
      showLabel = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const variants = {
      primary: 'bg-primary',
      xp: 'bg-gradient-to-r from-amber-400 to-amber-500',
      success: 'bg-green-500',
      warning: 'bg-orange-500',
    };

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', variants[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{value}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };
