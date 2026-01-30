'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-primary text-white hover:bg-primary-dark active:scale-95 disabled:opacity-50',
      secondary:
        'bg-white text-primary border-2 border-primary hover:bg-primary/5 active:scale-95 disabled:opacity-50',
      ghost:
        'bg-transparent text-primary hover:bg-primary/10 active:scale-95 disabled:opacity-50',
      danger:
        'bg-red-500 text-white hover:bg-red-600 active:scale-95 disabled:opacity-50',
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5 rounded-xl',
      md: 'text-base px-4 py-2.5 rounded-2xl',
      lg: 'text-lg px-6 py-3 rounded-2xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'font-semibold transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
