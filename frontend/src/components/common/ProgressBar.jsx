import React from 'react';

export const ProgressBar = ({
  value = 0,
  max = 100,
  variant = 'navy', // 'navy', 'blue', 'purple', 'teal', 'green', 'amber', 'red'
  size = 'md', // 'sm', 'md', 'lg'
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const variants = {
    navy: 'bg-[#172554]',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    teal: 'bg-teal-600',
    green: 'bg-emerald-600',
    amber: 'bg-amber-500',
    red: 'bg-rose-600',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-600">
          <span>Progress</span>
          <span className="font-semibold text-slate-800">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizes[size] || sizes.md}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            variants[variant] || variants.navy
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
