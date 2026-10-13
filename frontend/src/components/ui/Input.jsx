import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full text-left">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={twMerge(
          clsx(
            'w-full bg-arena-bg-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-arena-parchment placeholder-arena-muted/50 focus:outline-none focus:border-arena-amber focus:ring-1 focus:ring-arena-amber transition-all duration-200',
            error && 'border-arena-opp focus:border-arena-opp focus:ring-arena-opp',
            className
          )
        )}
        {...props}
      />
      {error && <p className="text-xs text-arena-opp mt-1.5">{error}</p>}
      {helperText && !error && <p className="text-xs text-arena-muted mt-1.5">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';