import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'teal' | 'navy';
  size?: 'default' | 'sm' | 'lg';
}

export function Badge({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-neutral-800 text-neutral-200 border-neutral-700',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    destructive: 'bg-red-950/80 text-red-300 border-red-700/60',
    outline: 'bg-transparent text-neutral-300 border-neutral-700',
    teal: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40',
    navy: 'bg-[#0f172a] text-[#0075de] border-[#0075de]/40',
  };

  const sizes: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    default: 'text-sm px-2.5 py-1 rounded-lg font-semibold',
    lg: 'text-base px-3.5 py-1.5 rounded-xl font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border font-sans select-none tracking-wide',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
