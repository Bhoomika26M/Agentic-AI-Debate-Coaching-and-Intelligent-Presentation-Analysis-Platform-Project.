import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-arena-amber hover:bg-arena-amber-glow text-black font-semibold shadow-spotlight focus:ring-arena-amber',
    prop: 'bg-arena-prop hover:bg-arena-prop-glow text-white shadow-prop-glow focus:ring-arena-prop',
    opp: 'bg-arena-opp hover:bg-arena-opp-glow text-white shadow-opp-glow focus:ring-arena-opp',
    secondary: 'bg-arena-bg-elevated hover:bg-white/10 text-arena-parchment border border-white/10 focus:ring-white/20',
    ghost: 'bg-transparent hover:bg-white/5 text-arena-muted hover:text-white',
    outline: 'border border-arena-amber/50 text-arena-amber hover:bg-arena-amber/10 focus:ring-arena-amber',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};