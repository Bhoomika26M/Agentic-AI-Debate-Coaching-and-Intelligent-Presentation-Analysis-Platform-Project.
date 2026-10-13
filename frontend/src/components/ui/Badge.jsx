import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-white/10 text-arena-parchment',
    amber: 'bg-arena-amber/15 text-arena-amber border border-arena-amber/30',
    prop: 'bg-arena-prop/15 text-arena-prop-glow border border-arena-prop/30',
    opp: 'bg-arena-opp/15 text-arena-opp-glow border border-arena-opp/30',
    beginner: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    intermediate: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    advanced: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};