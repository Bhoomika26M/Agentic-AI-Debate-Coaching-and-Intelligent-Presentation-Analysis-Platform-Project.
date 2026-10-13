import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className = '', glow = false, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-arena-bg-card border border-white/5 rounded-2xl p-6 transition-all duration-200',
          glow && 'hover:border-arena-amber/30 hover:shadow-spotlight',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};