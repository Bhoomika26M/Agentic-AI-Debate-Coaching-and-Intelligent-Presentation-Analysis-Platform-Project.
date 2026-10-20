import React from 'react';

export const Badge = ({
  children,
  variant = 'gray', // 'navy', 'blue', 'purple', 'teal', 'green', 'amber', 'red', 'gray'
  size = 'md', // 'sm', 'md'
  icon: Icon,
  className = '',
}) => {
  const variants = {
    navy: 'bg-blue-50 text-[#172554] border-blue-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    teal: 'bg-teal-50 text-teal-700 border-teal-200/80',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variants[variant] || variants.gray} ${
        sizes[size] || sizes.md
      } ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};
