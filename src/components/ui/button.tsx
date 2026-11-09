import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'teal' | 'emergency96';
  size?: 'default' | 'sm' | 'lg' | 'touch56' | 'emergency96';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#0075de] hover:bg-[#0060b8] text-white shadow-md border border-[#0060b8] focus-visible:ring-[#0075de]',
      secondary:
        'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 focus-visible:ring-neutral-500',
      outline:
        'bg-transparent hover:bg-neutral-800 text-neutral-200 border-2 border-neutral-700 focus-visible:ring-neutral-400',
      ghost:
        'bg-transparent hover:bg-neutral-800/60 text-neutral-300 border-transparent',
      destructive:
        'bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-md border border-red-700 focus-visible:ring-red-500',
      teal:
        'bg-[#10b981] hover:bg-[#059669] text-neutral-950 font-black shadow-md border border-emerald-600 focus-visible:ring-emerald-500',
      emergency96:
        'w-24 h-24 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-xl shadow-2xl border-4 border-red-300 focus-visible:ring-red-500',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      default: 'h-11 px-5 py-2.5 rounded-xl text-base',
      sm: 'h-9 px-3.5 rounded-lg text-sm',
      lg: 'h-14 px-8 rounded-2xl text-lg',
      touch56: 'min-h-[56px] min-w-[56px] px-6 py-3.5 rounded-2xl text-lg tracking-wide',
      emergency96: 'w-24 h-24 min-w-[96px] min-h-[96px] p-0 rounded-full',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
